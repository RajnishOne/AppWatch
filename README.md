# App Store Release Watcher

A self-hosted tool to monitor iOS App Store apps for new releases and automatically notify you in Discord. Features a web interface for easy management of multiple apps.

## Features

- 🍎 Monitor multiple iOS App Store apps simultaneously
- 🔔 Automatic Discord notifications when new versions are detected
- 📝 Formats release notes for better readability in Discord
- 🖥️ Web-based interface for configuration and management
- 🔄 Configurable check intervals per app
- ⚡ Manual check and post buttons for testing
- 🚫 Duplicate prevention - tracks last posted version

## Getting Started

### Step 1: Set Up Docker

If you don't have Docker installed, download it from [docker.com](https://www.docker.com/get-started).

### Step 2: Create the Configuration File

Create a file named `docker-compose.yml` in a folder on your computer. Copy and paste this content:

```yaml
services:
  app-watch:
    image: rajnishdock/app-watch:latest
    container_name: app-watch
    restart: unless-stopped
    ports:
      - "8192:8192"
    volumes:
      - ./data:/data
```

**Note:** The `./data` folder will be created automatically to store your app settings and version tracking data.

### Step 3: Start the Application

Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux) in the folder where you created `docker-compose.yml` and run:

```bash
docker compose up -d
```

Wait a few seconds for it to start, then open your web browser and go to:

**http://localhost:8192**

### Step 4: Set Up Discord Webhook

Before adding apps, you need a Discord webhook:

1. Open your Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook** or **Create Webhook**
4. Choose the channel where you want notifications
5. Name it (e.g., "App Releases")
6. Click **Copy Webhook URL** and save it somewhere

### Step 5: Find App Store ID

1. Go to [apps.apple.com](https://apps.apple.com) in your browser
2. Search for the app you want to monitor
3. Open the app's page
4. Look at the URL - it will look like: `https://apps.apple.com/app/id123456789`
5. Copy the number after `/id` (that's your App Store ID)

### Step 6: Add Your First App

1. In the web interface (http://localhost:8192), click **"Add App"**
2. Fill in:
   - **App Name**: Any name you want (e.g., "My App")
   - **App Store ID**: The number you found in Step 5
   - **Notification Destination**: Select "Discord"
   - **Discord Webhook URL**: Paste the webhook URL from Step 4
   - **Check Interval** (optional): Leave empty for default (12 hours), or use `6h`, `1d`, etc.
3. Click **"Save"**

### Step 7: Test It

1. Click **"Check Now"** to see if it finds the current version
2. Click **"Post Now"** to send a test message to Discord
3. If everything works, the app will check for updates automatically

You can add more apps by clicking **"Add App"** again. Each app can use a different Discord channel.

## How It Works

The application periodically checks the App Store API for new versions of your configured apps. When a new version is detected, it automatically formats the release notes and posts them to your Discord channel via webhook.

- **Default check interval**: Every 12 hours (configurable per app)
- **Custom intervals**: Set different check frequencies per app (e.g., `6h` for 6 hours, `1d` for daily)
- **Manual checks**: Use the "Check Now" button to trigger an immediate check
- **Duplicate prevention**: Tracks the last posted version to avoid sending the same update multiple times
- **Version tracking**: Stores version history locally in the data directory

## Release Notes Formatting

The application automatically formats release notes from the App Store for better readability in Discord. It detects structured sections and formats them accordingly.

### Example: Structured Release Notes

**Original App Store release notes:**
```
New:
- Dark mode support
- New dashboard design

Improvements:
- Faster app startup
- Better error handling

Fixed:
- Crash on login
- Memory leak issue
```

**Formatted output in Discord:**
```
# v2.3.1

## New
- Dark mode support
- New dashboard design

## Improvements
- Faster app startup
- Better error handling

## Fixed
- Crash on login
- Memory leak issue
```

### Section Headers That Become Bold

The formatter automatically detects and makes these section headers **bold** (as `##` headers in Discord):

- **New** (or "new:")
- **Added** (or "added:")
- **Improvements** (or "improvements:", "improved:")
- **Fixed** (or "fixed:", "fixes:", "bugs:", "bug:")
- **Changes** (or "changes:", "change:")

If your release notes don't have these section headers, they'll be formatted as a simple bullet list with the version number.

### Example: Generic Release Notes

**Original App Store release notes:**
```
This release includes bug fixes and performance improvements.
We've also added support for iOS 17.
```

**Formatted output in Discord:**
```
# v2.3.1

- This release includes bug fixes and performance improvements.
- We've also added support for iOS 17.
```

### Customizing Formatting

The formatting behavior can be customized by modifying the formatter configuration in the source code. The formatter recognizes common section headers and can be extended to support additional patterns if needed.

## Managing the Application

### Starting and Stopping

**Start the application:**
```bash
docker compose up -d
```

**Stop the application:**
```bash
docker compose down
```

**Restart the application:**
```bash
docker compose restart
```

**View logs:**
```bash
docker logs app-watch
```

**View logs in real-time:**
```bash
docker logs -f app-watch
```

### Alternative Deployment Methods

**Using Docker Run (without Docker Compose):**

```bash
docker run -d \
  --name app-watch \
  --restart unless-stopped \
  -p 8192:8192 \
  -v $(pwd)/data:/data \
  rajnishdock/app-watch:latest
```

**Building from Source:**

If you want to build from source or make modifications:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/app-watch.git
cd app-watch

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build and run with Docker Compose
docker compose build
docker compose up -d
```

## Configuration

### Data Storage

All your app configurations and version tracking data are stored in the `data` folder in the same directory as your `docker-compose.yml` file:

- `data/apps.json` - App configurations (names, IDs, webhooks, intervals)
- `data/apps/<APP_ID>/version.txt` - Last posted version for each app
- `data/apps/<APP_ID>/check.txt` - Last check timestamp for each app

**Important:** If you delete the `data` folder, you'll lose all your app configurations and version tracking.

### Docker Compose Configuration

The `docker-compose.yml` file supports many configuration options. Here's a comprehensive example with all possible values:

```yaml
services:
  app-watch:
    # Image configuration
    image: rajnishdock/app-watch:latest        # Docker image to use
    container_name: app-watch                  # Custom container name (optional)
    
    # Restart policy
    restart: unless-stopped                    # Options: no, always, on-failure, unless-stopped
    
    # Port mapping (host:container)
    ports:
      - "8192:8192"                            # Format: "HOST_PORT:CONTAINER_PORT"
      # Alternative formats:
      # - "8192:8192/tcp"                      # Specify protocol
      # - "127.0.0.1:8192:8192"               # Bind to specific host IP
    
    # Volume mounts
    volumes:
      - ./data:/data                           # Local path:container path
      # Alternative formats:
      # - /docker-data/app-watch/data:/data    # Absolute path
      # - app-watch-data:/data                 # Named volume (requires volumes: section)
    
    # Environment variables
    environment:
      - CHECK_INTERVAL=12h                     # Default check interval (12h, 6h, 1d, 30m, etc.)
      - PORT=8192                              # Server port (default: 8192)
      - TZ=America/New_York                    # Timezone (optional, e.g., UTC, Europe/London)
      - APP_VERSION=1.0.0                      # App version override (optional)
    # Alternative: use env_file
    # env_file:
    #   - .env                                  # Load from .env file
    #   - .env.local                            # Multiple files supported
    
    # Networks (optional)
    networks:
      - app-watch-network                      # Custom network name
    # Or use default network
    
    # Health check (optional)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8192/api/status"]
      interval: 30s                            # Check every 30 seconds
      timeout: 10s                             # Timeout after 10 seconds
      retries: 3                               # Retry 3 times before marking unhealthy
      start_period: 40s                        # Grace period on startup
    
    # Resource limits (optional)
    deploy:
      resources:
        limits:
          cpus: '1.0'                          # CPU limit (1.0 = 1 CPU core)
          memory: 512M                         # Memory limit
        reservations:
          cpus: '0.5'                          # CPU reservation
          memory: 256M                         # Memory reservation
    
    # Logging configuration (optional)
    logging:
      driver: "json-file"                      # Options: json-file, syslog, journald, gelf, fluentd, awslogs, splunk, etwlogs, none
      options:
        max-size: "10m"                        # Max log file size
        max-file: "3"                          # Number of log files to keep
    
    # Labels (optional)
    labels:
      - "com.example.description=App Store Release Watcher"
      - "com.example.version=1.0"
    
    # User and permissions (optional)
    # user: "1000:1000"                        # Run as specific user:group (UID:GID)
    
    # Working directory (optional)
    # working_dir: /app                        # Override working directory
    
    # Command override (optional)
    # command: ["python", "-m", "backend.app", "--custom-arg"]
    
    # Entrypoint override (optional)
    # entrypoint: ["/custom-entrypoint.sh"]
    
    # Security options (optional)
    # security_opt:
    #   - no-new-privileges:true
    
    # Capabilities (optional)
    # cap_add:
    #   - NET_ADMIN
    # cap_drop:
    #   - ALL
    
    # Shared memory size (optional)
    # shm_size: '64mb'
    
    # Dependencies (optional)
    # depends_on:
    #   - database
    #   - redis

# Named volumes (if using named volumes)
# volumes:
#   app-watch-data:
#     driver: local
#     # Optional volume options:
#     # driver_opts:
#     #   type: none
#     #   o: bind
#     #   device: /path/to/data

# Networks (if using custom networks)
# networks:
#   app-watch-network:
#     driver: bridge
#     # Optional network options:
#     # ipam:
#     #   config:
#     #     - subnet: 172.20.0.0/16
```

#### Environment Variables Reference

| Variable | Description | Default | Format/Examples |
|----------|-------------|---------|-----------------|
| `CHECK_INTERVAL` | Default check interval for apps without custom intervals | `12h` | `30m`, `6h`, `12h`, `1d`, `7d` |
| `PORT` | Server port number | `8192` | Any valid port number (e.g., `3000`, `8080`) |
| `TZ` | Timezone for timestamps and logging | System timezone | `UTC`, `America/New_York`, `Europe/London`, `Asia/Tokyo` |
| `APP_VERSION` or `VERSION` | Application version override | Auto-detected | Version string (e.g., `1.0.0`) |

#### Restart Policy Options

- `no`: Do not automatically restart the container (default)
- `always`: Always restart the container if it stops
- `on-failure`: Restart the container if it exits due to an error
- `unless-stopped`: Always restart the container unless it is explicitly stopped

#### Volume Mount Options

- **Bind mount**: `./data:/data` or `/absolute/path:/data` - Maps a host directory to container directory
- **Named volume**: `app-watch-data:/data` - Uses Docker-managed volume (requires `volumes:` section)
- **Read-only mount**: `./data:/data:ro` - Mount as read-only

#### Port Mapping Formats

- `"8192:8192"` - Map host port 8192 to container port 8192
- `"127.0.0.1:8192:8192"` - Bind to specific host IP only
- `"8192:8192/tcp"` - Specify protocol (tcp/udp)
- `"8192:8192/udp"` - UDP protocol

#### Health Check Options

The health check verifies the container is running correctly by checking the `/api/status` endpoint. You can customize:
- `interval`: Time between health checks
- `timeout`: Maximum time to wait for a response
- `retries`: Number of consecutive failures before marking unhealthy
- `start_period`: Grace period on startup before health checks count

#### Resource Limits

Use the `deploy.resources` section to limit container resources:
- `limits`: Maximum resources the container can use
- `reservations`: Guaranteed minimum resources

**Note:** The `deploy` section is primarily for Docker Swarm, but some options work with `docker compose`. For standalone Docker Compose, you can also use deprecated but still functional options:
```yaml
mem_limit: 512m
cpus: 1.0
```

#### Logging Drivers

Common logging driver options:
- `json-file`: Default, logs to JSON files (supports `max-size` and `max-file` options)
- `syslog`: Send logs to syslog
- `journald`: Send logs to systemd journal (Linux only)
- `none`: Disable logging

### Per-App Settings

Each app can be configured individually through the web interface:

- **App Name**: Display name for easy identification
- **App Store ID**: Unique identifier from the App Store URL
- **Discord Webhook URL**: Where notifications will be posted
- **Check Interval**: Override the default interval (e.g., `6h`, `30m`, `1d`)
- **Enabled**: Toggle to enable/disable monitoring for specific apps

## Troubleshooting

### Container Won't Start

**Port already in use:**
- Check if port 8192 is already in use by another application
- On Linux/Mac: `lsof -i :8192` or `netstat -an | grep 8192`
- On Windows: `netstat -ano | findstr :8192`
- Change the port in `docker-compose.yml` if needed

**Permission issues:**
- Ensure Docker has permission to access the data directory
- On Linux/Mac: `chmod 755 ./data` (if the folder exists)
- The `./data` folder will be created automatically with proper permissions

**Docker not running:**
- Verify Docker Desktop (or Docker daemon) is running
- Check Docker status: `docker ps`

### Discord Notifications Not Working

**Webhook URL issues:**
- Verify the webhook URL is correct and starts with `https://discord.com/api/webhooks/`
- Ensure you copied the entire URL without any extra spaces or characters
- Test the webhook manually using curl:
  ```bash
  curl -X POST -H "Content-Type: application/json" \
    -d '{"content":"Test message"}' \
    YOUR_WEBHOOK_URL
  ```

**Webhook deleted or invalid:**
- If you deleted the webhook in Discord, create a new one and update the app configuration
- Check that the webhook has permission to post in the selected channel
- Verify the webhook is still active in Discord server settings

**No notifications received:**
- Use the "Post Now" button to test manually
- Check the container logs for errors: `docker logs app-watch`
- Verify the app is enabled in the web interface

### App Not Detecting Updates

**App Store ID incorrect:**
- Double-check the App Store ID contains only numbers
- Verify the ID by visiting: `https://apps.apple.com/app/id<YOUR_ID>`
- The ID should be in the URL format: `apps.apple.com/app/id123456789`

**Check interval too long:**
- Reduce the check interval to test more frequently (e.g., `30m` for testing)
- Use the "Check Now" button to trigger an immediate check
- Check the "Last Check" timestamp in the web interface

**App Store API issues:**
- The App Store API may be slow or temporarily unavailable
- Wait a few minutes and try the "Check Now" button again
- Check container logs for API errors: `docker logs app-watch`

### Common Errors

**"Invalid Discord webhook URL"**
- The URL must start with `https://discord.com/api/webhooks/`
- Ensure there are no spaces or extra characters
- If using an old webhook URL with `discordapp.com`, update it to `discord.com`

**"App Store ID must be a number"**
- Only use the numeric ID from the App Store URL
- Example: For `https://apps.apple.com/app/id123456789`, use `123456789`
- Remove any non-numeric characters

**"Invalid interval format"**
- Use the format: `<number><unit>` where unit is `m` (minutes), `h` (hours), or `d` (days)
- Examples: `30m`, `6h`, `12h`, `1d`, `7d`
- Leave empty to use the default interval (12 hours)

## API Endpoints

The application provides a REST API for programmatic access:

- `GET /api/apps` - List all configured apps
- `POST /api/apps` - Create a new app configuration
- `PUT /api/apps/:id` - Update an existing app
- `DELETE /api/apps/:id` - Delete an app configuration
- `POST /api/apps/:id/check` - Manually trigger a check for updates
- `POST /api/apps/:id/post` - Manually post current version to Discord
- `GET /api/status` - Health check endpoint

## Technical Details

- **Backend**: Python 3.11 with Flask
- **Frontend**: React 18
- **Scheduling**: Automatic checks using the `schedule` library
- **Storage**: JSON-based file storage for app configurations
- **Container**: Docker with multi-stage builds

## Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this for personal or commercial projects.
