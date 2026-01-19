#!/bin/bash
# Build script for App Store Watcher

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Frontend build complete!"
echo "You can now run: docker compose build"

