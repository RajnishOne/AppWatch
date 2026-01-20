# App Store Release Watcher

Monitor iOS App Store apps for new releases and post release notes to Discord via webhook.

## Quick Start

### 1. Create `docker-compose.yml`:

```yaml
services:
  watcher:
    image: rajnishdock/app-release-watcher:latest
    container_name: app-release-watcher
    restart: unless-stopped
    ports:
      - "8192:8192"
    volumes:
      - ./data:/data
```

### 2. Start it:

```bash
docker compose up -d
```

### 3. Open http://localhost:8192

### 4. Add an app:

- **App Name**: Any name (e.g., "My App")
- **App Store ID**: Get it from the App Store URL: `https://apps.apple.com/app/id123456789` → `123456789`
- **Discord Webhook URL**: Create a webhook in Discord (Server Settings → Integrations → Webhooks)
- **Check Interval** (optional): How often to check (e.g., `12h`, `6h`, `1d`). Default is `12h`

That's it! The app will check for updates and post new releases to Discord.

## Features

- Monitor multiple iOS App Store apps
- Post release notes to Discord via webhook
- Automatic checks at configured intervals
- Web UI for easy configuration
- Prevents duplicate posts (tracks last posted version)

## Configuration

Each app can have its own Discord webhook URL and check interval. Configure everything through the web UI at http://localhost:8192.

## Release Notes Formatting

Release notes are cleaned up and formatted for Discord:
- Strips App Store markdown formatting
- Adds version header (e.g., `# v2.3.1`)
- Converts text to bullet points
- If sections are detected (New, Added, Improvements, Fixed, Changes), organizes them into sections

## Data Storage

App data is stored in the `./data` directory (or wherever you mount the volume). The app tracks the last posted version to prevent duplicates.

## Development

```bash
# Backend
cd backend
pip install -r ../requirements.txt
python -m backend.app

# Frontend
cd frontend
npm install
npm start
```

## Troubleshooting

**Port already in use?** Change the port in `docker-compose.yml` (e.g., `"8193:8192"`)

**Discord webhook not working?** Make sure the URL starts with `https://discord.com/api/webhooks/`

**App not detecting updates?** Use the "Check" button to test manually, or check container logs: `docker logs app-release-watcher`

## License

MIT
