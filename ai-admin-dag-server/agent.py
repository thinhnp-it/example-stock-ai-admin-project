from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy import text
from langgraph.graph import StateGraph, END
from dotenv import load_dotenv
import os
from database import engine, SessionLocal, get_database_schema
from sql_safety import validate_read_query

load_dotenv()
openai_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-5-mini"), api_key=openai_key)


class AgentState(TypedDict):
    question: str
    sql_query: str
    query_result: str
    query_rows: list
    attempts: int
    relevance: str
    sql_error: bool


class CheckRelevance(BaseModel):
    relevance: str = Field(
        description="Cho biết liệu câu hỏi có liên quan đến lược đồ cơ sở dữ liệu hay không. 'relevant' hoặc 'not_relevant'."
    )


def check_relevance(state: AgentState):
    question = state["question"]
    schema = get_database_schema()
    system = """Bạn là một trợ lý có nhiệm vụ xác định liệu một câu hỏi được đưa ra có liên quan đến lược đồ cơ sở dữ liệu sau đây hay không.

Lược đồ cơ sở dữ liệu:
{schema}

Trả lời là "relevant" hoặc "not_relevant".
""".format(schema=schema)
    human = "Question: {question}"
    check_prompt = ChatPromptTemplate.from_messages(
        [("system", system), ("human", human)]
    )
    structured_llm = llm.with_structured_output(CheckRelevance)
    relevance_checker = check_prompt | structured_llm
    relevance = relevance_checker.invoke({"question": question})
    state["relevance"] = relevance.relevance
    print(f"Relevance determined: {state['relevance']}")
    return state


class ConvertToSQL(BaseModel):
    sql_query: str = Field(
        description="The SQL query corresponding to the user's natural language question."
    )


def convert_nl_to_sql(state: AgentState):
    question = state["question"]
    schema = get_database_schema()
    system = """Bạn là một trợ lý chuyển đổi các câu hỏi ngôn ngữ tự nhiên thành truy vấn SQL dựa trên lược đồ sau:

{schema}

Câu hỏi hiện tại là '{question}'. Hãy đảm bảo rằng tất cả dữ liệu liên quan đến truy vấn đều được giới hạn trong câu hỏi này.

Chỉ cung cấp truy vấn SQL, không kèm bất kỳ giải thích nào. Hãy đặt bí danh (alias) cho các cột một cách phù hợp để khớp với các khóa mong đợi trong kết quả.

Ví dụ: đặt bí danh 'food.name' là 'food_name' và 'food.price' là 'price'.
""".format(schema=schema, question=question)
    convert_prompt = ChatPromptTemplate.from_messages(
        [("system", system), ("human", "Question: {question}")]
    )
    structured_llm = llm.with_structured_output(ConvertToSQL)
    sql_generator = convert_prompt | structured_llm
    result = sql_generator.invoke({"question": question})
    state["sql_query"] = result.sql_query
    return state


def execute_sql(state: AgentState):
    session = None
    try:
        if os.getenv("DAG_READ_ONLY_DB_CONFIRMED", "").lower() != "true":
            raise ValueError(
                "Configure a read-only database account and set DAG_READ_ONLY_DB_CONFIRMED=true"
            )
        dialect = (
            "postgres" if engine.dialect.name == "postgresql" else engine.dialect.name
        )
        sql_query = validate_read_query(state["sql_query"].strip(), dialect)
        session = SessionLocal()
        session.execute(text("SET TRANSACTION READ ONLY"))
        if engine.dialect.name == "postgresql":
            session.execute(text("SET LOCAL statement_timeout = '10000ms'"))
        result = session.execute(text(sql_query))
        rows = result.fetchmany(500)
        columns = result.keys()
        state["query_rows"] = [dict(zip(columns, row)) for row in rows]
        state["query_result"] = "Query executed successfully."
        state["sql_error"] = False
    except Exception as e:
        state["query_result"] = f"Error executing SQL query: {str(e)}"
        state["sql_error"] = True
    finally:
        if session is not None:
            session.rollback()
            session.close()
    return state


def generate_human_readable_answer(state: AgentState):
    sql = state["sql_query"]
    result = state.get("query_rows", [])
    sql_error = state.get("sql_error", False)
    print("Generating a human-readable answer.")
    system = """Bạn là một trợ lý chuyển đổi kết quả truy vấn SQL thành các câu trả lời bằng ngôn ngữ tự nhiên rõ ràng, mà không bao gồm bất kỳ định danh nào như IDs."""
    if sql_error:
        generate_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system),
                (
                    "human",
                    """SQL Query:\n{sql}\nResult:\n{result}\nHãy tạo một thông báo lỗi rõ ràng và dễ hiểu trong một câu duy nhất.""",
                ),
            ]
        )
    elif sql.lower().startswith("select"):
        if not result:
            generate_prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system),
                    (
                        "human",
                        """SQL Query:\n{sql}\nResult:\n{result}\nHãy đưa ra câu trả lời rõ ràng, dễ hiểu và chi tiết cho câu hỏi ban đầu.""",
                    ),
                ]
            )
        else:
            generate_prompt = ChatPromptTemplate.from_messages(
                [
                    ("system", system),
                    (
                        "human",
                        """SQL Query:\n{sql}\nResult:\n{result}\nHãy trình bày một câu trả lời rõ ràng, dễ hiểu và chi tiết cho câu hỏi ban đầu.""",
                    ),
                ]
            )
    else:
        generate_prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system),
                (
                    "human",
                    """SQL Query:\n{sql}\nResult:\n{result}\nHãy tạo một thông báo xác nhận rõ ràng, dễ hiểu và chi tiết.""",
                ),
            ]
        )
    formatted_result = str(result)
    input_prompt = {"sql": sql, "result": formatted_result}
    human_response = generate_prompt | llm | StrOutputParser()
    answer = human_response.invoke(input_prompt)
    state["query_result"] = answer
    print("Generated human-readable answer.")
    return state


class RewrittenQuestion(BaseModel):
    question: str = Field(description="The rewritten question.")


def regenerate_query(state: AgentState):
    question = state["question"]
    print("Regenerating the SQL query by rewriting the question.")
    system = """Bạn là một trợ lý có nhiệm vụ diễn đạt lại câu hỏi ban đầu nhằm giúp tạo ra các truy vấn SQL chính xác hơn. Hãy đảm bảo rằng tất cả các chi tiết cần thiết, chẳng hạn như việc kết nối các bảng (table joins), được giữ nguyên để truy xuất dữ liệu đầy đủ và chính xác."""
    rewrite_prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            (
                "human",
                "Câu hỏi ban đầu: {question}. Hãy diễn đạt lại câu hỏi để giúp tạo ra các truy vấn SQL chính xác hơn, đồng thời đảm bảo tất cả các chi tiết cần thiết được giữ nguyên.",
            ),
        ]
    )
    structured_llm = llm.with_structured_output(RewrittenQuestion)
    rewriter = rewrite_prompt | structured_llm
    rewritten = rewriter.invoke({"question": question})
    state["question"] = rewritten.question
    state["attempts"] += 1
    return state


def generate_funny_response(state: AgentState):
    print("Generating a funny response for an unrelated question.")
    system = """Bạn là một trợ lý duyên dáng và hài hước, trả lời theo phong cách vui nhộn và tinh nghịch."""
    human_message = "Tôi không thể giúp với việc đó, nhưng chẳng phải việc đặt câu hỏi sẽ giúp bạn tiến gần hơn đến vấn đề sao? Bạn luôn có thể chỉnh sửa lại dữ liệu."
    funny_prompt = ChatPromptTemplate.from_messages(
        [("system", system), ("human", human_message)]
    )
    funny_response = funny_prompt | llm | StrOutputParser()
    message = funny_response.invoke({})
    state["query_result"] = message
    print("Generated funny response.")
    return state


def end_max_iterations(state: AgentState):
    state["query_result"] = "Please try again."
    print("Maximum attempts reached. Ending the workflow.")
    return state


def relevance_router(state: AgentState):
    if state["relevance"].lower() == "relevant":
        return "convert_to_sql"
    else:
        return "generate_funny_response"


def check_attempts_router(state: AgentState):
    if state["attempts"] < 3:
        return "convert_to_sql"
    else:
        return "end_max_iterations"


def execute_sql_router(state: AgentState):
    if not state.get("sql_error", False):
        return "generate_human_readable_answer"
    else:
        return "regenerate_query"


def build_workflow():
    workflow = StateGraph(AgentState)
    workflow.add_node("check_relevance", check_relevance)
    workflow.add_node("convert_to_sql", convert_nl_to_sql)
    workflow.add_node("execute_sql", execute_sql)
    workflow.add_node("generate_human_readable_answer", generate_human_readable_answer)
    workflow.add_node("regenerate_query", regenerate_query)
    workflow.add_node("generate_funny_response", generate_funny_response)
    workflow.add_node("end_max_iterations", end_max_iterations)

    workflow.add_conditional_edges(
        "check_relevance",
        relevance_router,
        {
            "convert_to_sql": "convert_to_sql",
            "generate_funny_response": "generate_funny_response",
        },
    )
    workflow.add_edge("convert_to_sql", "execute_sql")
    workflow.add_conditional_edges(
        "execute_sql",
        execute_sql_router,
        {
            "generate_human_readable_answer": "generate_human_readable_answer",
            "regenerate_query": "regenerate_query",
        },
    )
    workflow.add_conditional_edges(
        "regenerate_query",
        check_attempts_router,
        {
            "convert_to_sql": "convert_to_sql",
            "end_max_iterations": "end_max_iterations",
        },
    )
    workflow.add_edge("generate_human_readable_answer", END)
    workflow.add_edge("generate_funny_response", END)
    workflow.add_edge("end_max_iterations", END)
    workflow.set_entry_point("check_relevance")
    return workflow.compile()
