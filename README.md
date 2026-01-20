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
- 🔔 Automatic Discord notifications via webhooks

## Integration Guide

### Step 1: Get the Application

**Option A: Using Pre-built Docker Image (Easiest)**

Create a `docker-compose.yml` file:

```yaml
services:
  watcher:
    image: rajnishdock/app-release-watcher:latest
    container_name: app-release-watcher
    restart: unless-stopped
    ports:
      - "8192:8192"
    volumes:
      - /docker-data/app-release-watcher/data:/data
```

**Option B: Clone from GitHub (For Development/Contributing)**

```bash
git clone https://github.com/YOUR_USERNAME/app-release-watcher.git
cd app-release-watcher
```

*Replace `YOUR_USERNAME` with the actual GitHub username or organization name*

### Step 2: Set Up Discord Webhook

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook** or **Create Webhook**
4. Configure the webhook:
   - Choose a channel where you want release notifications
   - Name your webhook (e.g., "App Store Releases")
   - Optionally customize the avatar
5. Click **Copy Webhook URL** - you'll need this later
   - Webhook URL format: `https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN`

### Step 3: Find App Store ID

1. Open the App Store (web or app)
2. Search for the app you want to monitor
3. Navigate to the app's page
4. Look at the URL: `https://apps.apple.com/app/id123456789`
5. The number after `/id` is your App Store ID (e.g., `123456789`)

### Step 4: Deploy the Application

**Option A: Using Docker Compose (Recommended)**

```bash
docker compose up -d
```

**Option B: Using Docker Run**

```bash
docker run -d \
  --name app-release-watcher \
  --restart unless-stopped \
  -p 8192:8192 \
  -v /docker-data/app-release-watcher/data:/data \
  rajnishdock/app-release-watcher:latest
```

**Option C: Build from Source**

1. Build frontend:
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

2. Build and run:
```bash
docker compose build
docker compose up -d
```

### Step 5: Access the Web UI

Open your browser and navigate to: **http://localhost:8192**

### Step 6: Add Your First App

1. Click the **"Add App"** button
2. Fill in the form:
   - **App Name**: A friendly name (e.g., "My Awesome App")
   - **App Store ID**: The ID you found in Step 3 (e.g., `123456789`)
   - **Discord Webhook URL**: The webhook URL you copied in Step 2
   - **Check Interval** (optional): How often to check for updates (e.g., `6h`, `30m`, `1d`)
     - Default: `12h` (checks every 12 hours)
     - Format: Use `h` for hours, `m` for minutes, `d` for days
3. Click **"Add App"**

### Step 7: Verify Integration

1. **Test Check**: Click the **"Check"** button next to your app to manually check for updates
2. **Test Post**: Click the **"Post"** button to manually send the current version to Discord
3. **Monitor**: The app will automatically check for updates at the configured interval
4. **Notifications**: When a new version is detected, it will automatically post formatted release notes to your Discord channel

### Step 8: Add More Apps (Optional)

Repeat Step 6 to monitor multiple apps. Each app can have its own:
- Discord webhook URL (different channels)
- Check interval (different update frequencies)

## Quick Start (TL;DR)

For experienced users who just need the commands:

```bash
# Clone and start
git clone https://github.com/YOUR_USERNAME/app-release-watcher.git
cd app-release-watcher
docker compose up -d

# Access UI at http://localhost:8192
# Add apps via the web interface
```

## Configuration

### Environment Variables

You can customize the application behavior using environment variables:

```bash
# In docker-compose.yml or docker run command
environment:
  - CHECK_INTERVAL=12h    # Default check interval for all apps
  - TZ=Asia/Kolkata       # Timezone for logging
  - PORT=8192             # Server port
```

**Available Variables:**
- `CHECK_INTERVAL`: Default check interval for apps without custom intervals (default: `12h`)
- `TZ`: Timezone for timestamps and logging (default: `Asia/Kolkata`)
- `PORT`: Server port number (default: `8192`)

### Per-App Settings

Each app can be configured individually through the web UI:

- **App Name**: Display name for identification
- **App Store ID**: Unique identifier from the App Store URL
- **Discord Webhook URL**: Where notifications will be posted
- **Check Interval**: Override the default interval (e.g., `6h`, `30m`, `1d`)
- **Enabled**: Toggle to enable/disable monitoring for specific apps

### Webhook URL Format

Discord webhook URLs must follow this format:
```
https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN
```

If you're using a different Discord domain (e.g., `discordapp.com`), make sure to update it to `discord.com`.

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

App data and version tracking is stored in `/docker-data/app-release-watcher/data/` (mapped from container `/data`):
- `data/apps.json` - App configurations
- `data/apps/<APP_ID>/version.txt` - Last posted version
- `data/apps/<APP_ID>/check.txt` - Last check timestamp

Make sure the host directory exists and has proper permissions before starting the container.

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

## Docker Image

Pre-built Docker images are available on Docker Hub:
- **Image:** `rajnishdock/app-release-watcher:latest`
- **Tags:** `latest` and version tags (e.g., `v1.0.0`)

Images are automatically built and published via GitHub Actions when version tags are pushed to the repository.

## Deployment Options

### Local Machine
Follow the Quick Start guide above using Docker Compose.

### Docker Run (Alternative)

```bash
docker run -d \
  --name app-release-watcher \
  --restart unless-stopped \
  -p 8192:8192 \
  -v /docker-data/app-release-watcher/data:/data \
  rajnishdock/app-release-watcher:latest
```

### OMV (OpenMediaVault) Server

**Option 1: OMV Compose Plugin (Easiest - Just Paste YAML)**
See [OMV_COMPOSE_PLUGIN.md](OMV_COMPOSE_PLUGIN.md) - No cloning needed, just paste the YAML in the web UI!

**Option 2: SSH Deployment**
**Quick Start:** See [OMV_QUICK_START.md](OMV_QUICK_START.md) for exact step-by-step instructions.

**Detailed Guide:** See [DEPLOY_OMV.md](DEPLOY_OMV.md) for comprehensive deployment options.

## Detailed Usage Guide

For step-by-step instructions, see [USAGE.md](USAGE.md)

## Troubleshooting

### Container Won't Start

- **Check port availability**: Ensure port `8192` is not already in use
  ```bash
  # Linux/Mac
  lsof -i :8192
  
  # Windows
  netstat -ano | findstr :8192
  ```

- **Check data directory permissions**: Ensure the data directory exists and is writable
  ```bash
  mkdir -p /docker-data/app-release-watcher/data
  chmod 755 /docker-data/app-release-watcher/data
  ```

### Discord Webhook Not Working

- **Verify webhook URL**: Ensure it starts with `https://discord.com/api/webhooks/`
- **Test webhook manually**: Use curl to test:
  ```bash
  curl -X POST -H "Content-Type: application/json" \
    -d '{"content":"Test message"}' \
    YOUR_WEBHOOK_URL
  ```
- **Check Discord channel permissions**: Ensure the webhook has permission to post in the channel
- **Webhook deleted**: If you deleted the webhook, create a new one and update the app configuration

### App Not Detecting Updates

- **Manual check**: Use the "Check" button to test immediately
- **Verify App Store ID**: Double-check the ID is correct
- **Check logs**: View container logs for errors
  ```bash
  docker logs app-release-watcher
  ```
- **Interval too long**: Reduce the check interval to test more frequently

### Common Errors

**"Invalid Discord webhook URL"**
- Make sure the URL starts with `https://discord.com/api/webhooks/`
- Copy the entire URL from Discord without any spaces

**"App Store ID must be a number"**
- The App Store ID should only contain digits (e.g., `123456789`)
- Remove any non-numeric characters from the URL

**"Invalid interval format"**
- Use format: `30m` (minutes), `6h` (hours), `1d` (days)
- Examples: `30m`, `2h`, `12h`, `1d`, `7d`

## Technology Stack

- **Backend:** Python 3.11, Flask, Flask-CORS
- **Frontend:** React 18, React Scripts
- **Scheduling:** schedule library for automatic checks
- **Container:** Docker with multi-stage builds
- **Deployment:** Docker Compose, GitHub Actions for CI/CD

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
