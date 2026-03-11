# Dockerfile for Intelli-Credit (FastAPI + React)

# Use official Python image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libgl1-mesa-glx \
        libglib2.0-0 \
        tesseract-ocr \
        libtesseract-dev \
        libleptonica-dev \
        ca-certificates \
        wget \
        curl \
        libsm6 \
        libxext6 \
        libxrender1 \
        libfontconfig1 \
        libfreetype6 \
        libpng16-16 \
        libxrender-dev \
    || true && rm -rf /var/lib/apt/lists/* && apt-get clean

# Copy requirements and install Python dependencies
COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose port for FastAPI
EXPOSE 8000

# Start FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
