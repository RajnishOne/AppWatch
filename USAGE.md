# How to Use App Store Watcher

## Step-by-Step Guide

### Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed (for building frontend)
- A Discord server where you want to receive notifications

---

## Step 1: Build the Frontend

The frontend needs to be built before creating the Docker image.

**On Windows:**
```powershell
.\build.bat
```

**On Linux/Mac:**
```bash
chmod +x build.sh
./build.sh
```

**Or manually:**
```bash
cd frontend
npm install
npm run build
cd ..
```

This creates the `frontend/dist` folder with the compiled React app.

---

## Step 2: Build and Start the Docker Container

```bash
# Build the Docker image
docker compose build

# Start the container
docker compose up -d

# Check if it's running
docker compose ps

# View logs (optional)
docker compose logs -f
```

The container will start and be available at **http://localhost:8192**

---

## Step 3: Access the Web UI

Open your browser and go to:
```
http://localhost:8192
```

You should see the App Store Watcher interface.

---

## Step 4: Get Your Discord Webhook URL

1. Open Discord and go to your server
2. Click on **Server Settings** (gear icon)
3. Go to **Integrations** → **Webhooks**
4. Click **New Webhook** or **Create Webhook**
5. Give it a name (e.g., "App Store Notifications")
6. Choose the channel where notifications should appear
7. Click **Copy Webhook URL**
8. Save this URL - you'll need it in the next step

---

## Step 5: Find App Store ID

1. Go to the App Store (on your Mac or in a browser)
2. Search for the app you want to monitor
3. Open the app's page
4. Look at the URL - it will look like:
   ```
   https://apps.apple.com/app/id123456789
   ```
5. The number after `/id` is the **App Store ID** (e.g., `123456789`)

**Example:**
- For "Notion" app: `https://apps.apple.com/app/id1232780281`
- App Store ID: `1232780281`

---

## Step 6: Add Your First App

1. In the web UI, click the **"+ Add App"** button
2. Fill in the form:
   - **App Name**: Any name you want (e.g., "Notion")
   - **App Store ID**: The ID you found in Step 5 (e.g., `1232780281`)
   - **Discord Webhook URL**: The webhook URL from Step 4
   - **Check Interval** (optional): Leave empty for default (12 hours), or set custom like:
     - `6h` - Check every 6 hours
     - `30m` - Check every 30 minutes
     - `1d` - Check once per day
   - **Enable monitoring**: Check this box (checked by default)
3. Click **"Add App"**

---

## Step 7: Test It

1. Click **"Check Now"** on your newly added app
   - This manually checks the App Store for the current version
   - You'll see the current version and a preview of the formatted release notes

2. Click **"Preview"** to see how the release notes will look in Discord

3. Click **"Post Now"** to manually send the current release notes to Discord
   - This will post to your Discord channel immediately
   - Useful for testing your webhook

---

## Step 8: Automatic Monitoring

Once configured, the system will:
- Automatically check each app at the specified interval
- Compare the current version with the last posted version
- If a new version is detected, automatically post to Discord
- Skip posting if the version hasn't changed (duplicate prevention)

You can see:
- **Current Version**: Latest version from App Store
- **Last Posted**: Version that was last posted to Discord
- **Last Check**: When the app was last checked

---

## Managing Apps

### Edit an App
- Click **"Edit"** on any app card
- Modify the settings
- Click **"Update App"**

### Disable/Enable Monitoring
- Edit the app and uncheck/check **"Enable monitoring"**
- Disabled apps won't be checked automatically

### Delete an App
- Click **"Delete"** on an app card
- Confirm the deletion
- All data for that app will be removed

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs

# Rebuild if needed
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Frontend not loading
- Make sure you built the frontend first (Step 1)
- Check that `frontend/dist/index.html` exists

### Discord webhook not working
- Verify the webhook URL is correct
- Test the webhook manually using curl:
  ```bash
  curl -X POST "YOUR_WEBHOOK_URL" -H "Content-Type: application/json" -d '{"content":"Test message"}'
  ```
- Check Discord server permissions

### App not found
- Verify the App Store ID is correct
- Some apps might not be available in all regions
- Try checking manually first with "Check Now"

### Not posting automatically
- Check if the app is enabled
- Verify the check interval is set correctly
- Check container logs: `docker compose logs -f`
- The system only posts when version changes

---

## Changing Default Check Interval

Edit `docker-compose.yml`:
```yaml
environment:
  - CHECK_INTERVAL=6h  # Change from 12h to 6h
```

Then restart:
```bash
docker compose down
docker compose up -d
```

---

## Stopping the Service

```bash
# Stop the container
docker compose down

# Stop and remove volumes (deletes all data!)
docker compose down -v
```

---

## Viewing Logs

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100
```

---

## Data Persistence

All your app configurations and version tracking are stored in a Docker volume called `notifier-data`. This means:
- ✅ Data persists when you restart the container
- ✅ Data persists when you update the container
- ❌ Data is lost if you run `docker compose down -v`

To backup your data:
```bash
# Find the volume
docker volume inspect watcher_notifier-data

# Backup (example)
docker run --rm -v watcher_notifier-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```

---

## Example: Monitoring Multiple Apps

You can add as many apps as you want:

1. **Notion** → Webhook #1 → Check every 6h
2. **Spotify** → Webhook #1 → Check every 12h (default)
3. **Twitter** → Webhook #2 → Check every 1d

Each app can have:
- Its own Discord webhook (or share webhooks)
- Its own check interval
- Independent version tracking

---

That's it! Your App Store Watcher is now running and monitoring your apps. 🎉

