FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy frontend build (must be built before docker build)
COPY frontend/dist/ ./frontend/dist/

# Expose port
EXPOSE 8080

# Run the application
CMD ["python", "-m", "backend.app"]

