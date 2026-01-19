# App Store Release Watcher

A self-hosted multi-app App Store release notifier with a Web UI and Docker Compose deployment. Monitor multiple iOS App Store apps for new releases and automatically post formatted release notes to Discord via webhook.

## Features

- 🍎 Monitor multiple iOS App Store apps
- 📝 Smart Discord formatting for release notes
- 🔄 Automatic scheduling with per-app intervals
- 🚫 Duplicate prevention (tracks last posted version)
- 🖥️ Web UI for easy configuration
- 🐳 Docker Compose deployment
- ⚡ Manual check and post buttons

## Quick Start

1. **Build frontend first:**

```bash
# On Linux/Mac
./build.sh

# On Windows
build.bat

# Or manually:
cd frontend
npm install
npm run build
cd ..
```

2. **Build and run with Docker Compose:**

```bash
docker compose build
docker compose up -d
```

3. **Access the UI:**

Open http://localhost:8192 in your browser

4. **Add an app:**

- Click "Add App"
- Enter app name
- Enter App Store ID (from the App Store URL: `apps.apple.com/app/id123456789`)
- Enter Discord webhook URL
- Optionally set a custom check interval (e.g., `6h`, `30m`, `1d`)
- Click "Add App"

## Configuration

### Environment Variables

- `CHECK_INTERVAL`: Default check interval (default: `12h`)
- `TZ`: Timezone (default: `Asia/Kolkata`)
- `PORT`: Server port inside container (default: `8080`, external access via `8192`)

### Finding App Store ID

1. Go to the app's page on the App Store
2. Look at the URL: `https://apps.apple.com/app/id123456789`
3. The number after `/id` is the App Store ID

### Discord Webhook Setup

1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Paste it in the app configuration

## Release Notes Formatting

The system automatically formats release notes for Discord:

### Case A: Generic Text
```
# v2.3.1

**This release includes:**
- Bug fixes
- Improvements
```

### Case B: Structured Sections
```
# v2.3.1

**New**
- Feature A
- Feature B

**Improvements**
- Optimization X

**Fixed**
- Crash issue
```

Supported section headers: New, Added, Improvements, Fixed, Changes

## API Endpoints

- `GET /api/apps` - List all apps
- `POST /api/apps` - Create new app
- `PUT /api/apps/:id` - Update app
- `DELETE /api/apps/:id` - Delete app
- `POST /api/apps/:id/check` - Manually check app
- `POST /api/apps/:id/post` - Manually post to Discord
- `GET /api/status` - Health check

## Data Storage

App data and version tracking is stored in `/docker-data/app-store-watcher/data/`:
- `data/apps.json` - App configurations
- `data/apps/<APP_ID>/version.txt` - Last posted version
- `data/apps/<APP_ID>/check.txt` - Last check timestamp

## Development

### Backend

```bash
cd backend
pip install -r ../requirements.txt
python -m backend.app
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Deployment Options

### Local Machine
Follow the Quick Start guide above.

### OMV (OpenMediaVault) Server
**Quick Start:** See [OMV_QUICK_START.md](OMV_QUICK_START.md) for exact step-by-step instructions.

**Detailed Guide:** See [DEPLOY_OMV.md](DEPLOY_OMV.md) for comprehensive deployment options.

## Detailed Usage Guide

For step-by-step instructions, see [USAGE.md](USAGE.md)

## License

MIT

