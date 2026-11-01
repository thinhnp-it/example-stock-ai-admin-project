import pdfplumber
import pandas as pd
from docx import Document as DocxDocument
from bs4 import BeautifulSoup
# from config import logger  # Import logger từ config

import unicodedata
import re
import hashlib
from functools import lru_cache
from typing import Dict, List, Sequence
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone
from config import PINECONE_API_KEY, PINECONE_INDEX_NAME


def extract_text_from_file(file_name: str) -> str:
    file_path = file_name
    try:
        if file_path.endswith(".pdf"):
            with pdfplumber.open(file_path) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        elif file_path.endswith(".xlsx") or file_path.endswith(".csv"):
            df = (
                pd.read_excel(file_path)
                if file_path.endswith(".xlsx")
                else pd.read_csv(file_path)
            )
            return df.to_string()
        elif file_path.endswith(".docx"):
            doc = DocxDocument(file_path)
            return "\n".join(para.text for para in doc.paragraphs)
        elif file_path.endswith(".html"):
            with open(file_path, "r", encoding="utf-8") as f:
                soup = BeautifulSoup(f, "html.parser")
                return soup.get_text()
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
    except Exception as e:
        raise ValueError(f"Could not extract document: {file_path}") from e


def normalize_id(id_str: str) -> str:
    normalized = (
        unicodedata.normalize("NFKD", id_str).encode("ASCII", "ignore").decode("ASCII")
    )
    normalized = re.sub(r"[^a-zA-Z0-9._-]", "_", normalized)
    return normalized


def normalize_search_text(value: str) -> str:
    normalized = (
        unicodedata.normalize("NFKD", value or "")
        .encode("ASCII", "ignore")
        .decode("ASCII")
    )
    normalized = normalized.lower()
    return re.sub(r"[^a-z0-9]+", " ", normalized).strip()


def extract_document_references(text: str) -> List[Dict[str, str]]:
    normalized = normalize_search_text(text)
    patterns = [
        r"(?:thong\s+tu|tt)\s*(?:so\s*)?(\d{1,4})\s*(?:nam\s*)?(20\d{2})\s*(?:tt\s*btc|ttbtc|btc)?",
        r"\b(\d{1,4})\s*(20\d{2})\s*(?:tt\s*btc|ttbtc|btc)\b",
    ]

    references = []
    seen = set()
    for pattern in patterns:
        for match in re.finditer(pattern, normalized):
            number = str(int(match.group(1)))
            year = match.group(2)
            key = f"{number}/{year}"
            if key not in seen:
                seen.add(key)
                references.append({"number": number, "year": year})

    return references


def source_matches_document_reference(source: str, reference: Dict[str, str]) -> bool:
    source_references = extract_document_references(source)
    for source_reference in source_references:
        if (
            source_reference["number"] == reference["number"]
            and source_reference["year"] == reference["year"]
        ):
            return True

    normalized = normalize_search_text(source)
    tokens = normalized.split()
    has_document_kind = (
        "thong tu" in normalized or "tt btc" in normalized or "ttbtc" in normalized
    )
    return (
        reference["number"] in tokens
        and reference["year"] in tokens
        and has_document_kind
    )


def matching_sources_for_query(query: str, sources: Sequence[str]) -> List[str]:
    references = extract_document_references(query)
    if not references:
        return []

    matches = []
    for source in sources:
        if any(
            source_matches_document_reference(source, reference)
            for reference in references
        ):
            matches.append(source)

    return matches


def document_reference_score(query: str, metadata: dict) -> int:
    references = extract_document_references(query)
    if not references:
        return 0

    metadata_number = str(metadata.get("doc_number") or "").lstrip("0")
    metadata_year = str(metadata.get("doc_year") or "")
    source = str(metadata.get("source") or "")

    for reference in references:
        if (
            metadata_number == reference["number"]
            and metadata_year == reference["year"]
        ):
            return 100
        if source_matches_document_reference(source, reference):
            return 90

    return 0


def rerank_documents_for_query(query: str, documents: List) -> List:
    scored_documents = []
    seen = set()
    for index, document in enumerate(documents):
        source = str(document.metadata.get("source") or "")
        text_key = document.page_content[:200]
        key = (source, text_key)
        if key in seen:
            continue
        seen.add(key)
        scored_documents.append(
            (document_reference_score(query, document.metadata), index, document)
        )

    scored_documents.sort(key=lambda item: (-item[0], item[1]))
    return [document for _, _, document in scored_documents]


def ordered_unique_sources(documents: List) -> List[str]:
    sources = []
    seen = set()
    for document in documents:
        source = document.metadata.get("source", "Unknown")
        if source not in seen:
            seen.add(source)
            sources.append(source)

    return sources


@lru_cache(maxsize=1)
def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name="alikia2x/jina-embedding-v3-m2v-1024", model_kwargs={"device": "cpu"}
    )


def initialize_vector_store(files: List[dict]) -> PineconeVectorStore:
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    documents = []
    for file_path in files:
        local_path = file_path.get("local")
        print(local_path)
        text = extract_text_from_file(local_path)
        if text.strip():
            metadata = {
                "source": file_path["cloud"],
                "type": file_path["local"].split(".")[-1],
            }
            references = extract_document_references(
                file_path["cloud"]
            ) or extract_document_references(text[:3000])
            if references:
                metadata["doc_number"] = references[0]["number"]
                metadata["doc_year"] = references[0]["year"]
                metadata["doc_citation"] = (
                    f"{references[0]['number']}/{references[0]['year']}"
                )

            docs = splitter.create_documents([text], metadatas=[metadata])
            documents.extend(docs)
        else:
            raise ValueError(f"No text extracted from {file_path['cloud']}")

    # Khởi tạo Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)

    # Kiểm tra và tạo chỉ mục nếu chưa tồn tại
    index_name = PINECONE_INDEX_NAME
    if index_name not in pc.list_indexes().names():
        pc.create_index(
            name=index_name,
            dimension=1024,  # Phù hợp với mô hình nhúng jina-embedding-v3-m2v-1024
            metric="cosine",
            spec={"serverless": {"cloud": "aws", "region": "us-east-1"}},
        )

    embeddings = get_embeddings()
    vector_store = PineconeVectorStore(
        index_name=PINECONE_INDEX_NAME,
        embedding=embeddings,
        pinecone_api_key=PINECONE_API_KEY,
    )

    if documents:
        print("Indexing new documents...")
        counters = {}
        ids = []
        for doc in documents:
            source = doc.metadata["source"]
            position = counters.get(source, 0)
            counters[source] = position + 1
            source_hash = hashlib.sha256(source.encode("utf-8")).hexdigest()
            ids.append(f"{source_hash}-{position}")
        vector_store.add_documents(documents=documents, ids=ids)

    return vector_store
