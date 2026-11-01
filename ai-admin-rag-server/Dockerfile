FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt .
RUN pip install 'torch==2.8.0' --index-url https://download.pytorch.org/whl/cpu
RUN pip install -r requirements.txt
COPY main.py config.py utils.py security.py ./
RUN mkdir -p /var/cache/huggingface && chown -R 10001:10001 /var/cache/huggingface
ENV HF_HOME=/var/cache/huggingface
RUN useradd --create-home --uid 10001 appuser
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
