FROM python:3.11-slim

# ── System dependencies ───────────────────────────────────────────────────────
# tesseract-ocr   → pytesseract (OCR for scanned PDFs)
# tesseract-ocr-eng → English language pack
# libgl1 + libglib2.0 → OpenCV / PyMuPDF runtime libs
# poppler-utils   → pdfplumber / PDF rendering
# gcc / build-essential → compiling some Python packages (e.g. bcrypt)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1-mesa-glx \
    libglib2.0-0 \
    poppler-utils \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── Working directory ─────────────────────────────────────────────────────────
WORKDIR /app

# ── Install Python dependencies ───────────────────────────────────────────────
# Copy requirements first so Docker can cache this layer
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Copy application code ─────────────────────────────────────────────────────
COPY . .

# ── Create uploads directory (gitignored but needed at runtime) ───────────────
RUN mkdir -p uploads

# ── Expose port ───────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Start command ─────────────────────────────────────────────────────────────
# Render injects $PORT automatically — we read it here
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
