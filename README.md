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
  watcher:
    image: rajnishdock/app-release-watcher:latest
    container_name: app-release-watcher
    restart: unless-stopped
    ports:
      - "8192:8192"
    volumes:
      - ./data:/data
```

**Note:** The `./data` folder will be created automatically to store your app settings.

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

The app checks the App Store for new versions of your apps. When it finds an update, it sends the release notes to your Discord channel.

- **Default check interval**: Every 12 hours
- **Custom intervals**: You can set different intervals per app (e.g., `6h` for 6 hours, `1d` for daily)
- **Manual checks**: Use the "Check Now" button anytime
- **No duplicates**: It remembers what version was last posted, so you won't get the same update twice

## Stopping the App

To stop the app:

```bash
docker compose down
```

To start it again:

```bash
docker compose up -d
```

## Your Data

All your app settings are saved in the `data` folder in the same directory as your `docker-compose.yml` file. If you delete this folder, you'll lose your settings.

## Troubleshooting

### Can't Access the Web Interface

- Make sure Docker is running
- Check that port 8192 isn't being used by another program
- Try restarting: `docker compose restart`

### Discord Notifications Not Working

- Make sure your webhook URL is correct (starts with `https://discord.com/api/webhooks/`)
- Check that the webhook wasn't deleted in Discord
- Try clicking "Post Now" to test manually
- Make sure the Discord channel allows webhooks

### App Not Finding Updates

- Double-check the App Store ID is correct (just the numbers)
- Click "Check Now" to test immediately
- Wait a bit - sometimes the App Store API is slow

### Common Errors

**"Invalid Discord webhook URL"**
- Make sure you copied the entire URL from Discord
- It should start with `https://discord.com/api/webhooks/`

**"App Store ID must be a number"**
- Only use the numbers from the App Store URL
- Example: If the URL is `apps.apple.com/app/id123456789`, use `123456789`

**"Invalid interval format"**
- Use: `30m` (30 minutes), `6h` (6 hours), `1d` (1 day)
- Leave it empty to use the default (12 hours)

## Need Help?

If you run into issues:
1. Check the troubleshooting section above
2. Make sure Docker is installed and running
3. Check that your Discord webhook is still valid

## License

MIT License - feel free to use this for personal or commercial projects.
