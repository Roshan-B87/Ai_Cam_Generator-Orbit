# Use slim Python image
FROM python:3.11-slim

WORKDIR /app

# System deps for PDF parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (200MB vs 800MB)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install requirements (cached layer if requirements.txt unchanged)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
