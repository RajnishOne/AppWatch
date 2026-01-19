@echo off
REM Build script for App Store Watcher (Windows)

echo Building frontend...
cd frontend
call npm install
call npm run build
cd ..

echo Frontend build complete!
echo You can now run: docker compose build

