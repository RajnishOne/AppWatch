# Multi-stage build: Build frontend first
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Final stage: Python backend
FROM python:3.11-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from builder stage (React Scripts creates 'build', not 'dist')
COPY --from=frontend-builder /app/frontend/build/ ./frontend/dist/

# Expose port
EXPOSE 8192

# Run the application
CMD ["python", "-m", "backend.app"]

