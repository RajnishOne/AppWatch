# Quick Start: Deploy on OMV Server

## Prerequisites
- OMV server with SSH access
- Docker and Docker Compose already installed (you mentioned you have Jellyfin running, so this is done!)
- Your OMV server's IP address

---

## Step 1: SSH into OMV Server

```bash
ssh root@your-omv-ip
```

Replace `your-omv-ip` with your actual OMV server IP (e.g., `192.168.1.100`)

---

## Step 2: Get the Repository Files

Following your existing Docker setup pattern (like Jellyfin):

**Option A: Install Git and Clone (Recommended)**
```bash
# Install git
apt-get update
apt-get install -y git

# Create directory structure matching your other containers
mkdir -p /docker-data/app-store-watcher
cd /docker-data/app-store-watcher

# Clone the repository
git clone https://github.com/RajnishOne/AppStoreWatcher.git .
```

**Option B: Download as ZIP (No Git needed)**
```bash
# Create directory
mkdir -p /docker-data/app-store-watcher
cd /docker-data/app-store-watcher

# Download and extract ZIP
wget https://github.com/RajnishOne/AppStoreWatcher/archive/refs/heads/main.zip
unzip main.zip
mv AppStoreWatcher-main/* .
mv AppStoreWatcher-main/.* . 2>/dev/null || true
rmdir AppStoreWatcher-main
rm main.zip
```

**Option C: Transfer from Your Windows Machine**
```bash
# On your Windows machine, use SCP or WinSCP to transfer the entire Watcher folder to:
# /docker-data/app-store-watcher/
```

**Note:** This matches your existing pattern where Jellyfin uses `/docker-data/jellyfin/`. The data will be stored in `/docker-data/app-store-watcher/data/` (configured in docker-compose.yml).

---

## Step 3: Build and Start Docker Container

**Note:** The Dockerfile will automatically build the frontend inside Docker, so you don't need Node.js installed on OMV!

**Option A: Via SSH (Recommended)**

```bash
# Make sure you're in the project directory
cd /docker-data/app-store-watcher

# Build the Docker image
docker compose build

# Start the container
docker compose up -d

# Check if it's running
docker compose ps
```

**Expected output:** You should see the container running.

---

## Step 4: Verify It's Working

```bash
# Check container logs
docker compose logs

# Test the API endpoint
curl http://localhost:8192/api/status
```

**Expected response:** `{"status":"ok","timestamp":"...","scheduler_running":true}`

---

## Step 5: Access the Web UI

Open your web browser on any machine on your network and go to:

```
http://your-omv-ip:8192
```

Replace `your-omv-ip` with your actual OMV server IP address.

**Example:** If your OMV IP is `192.168.1.100`, go to:
```
http://192.168.1.100:8192
```

---

## Step 6: Configure Firewall (if needed)

If you can't access the web UI, allow port 8192 through the firewall:

```bash
# If using UFW
ufw allow 8192/tcp
ufw reload

# Or check current firewall status
ufw status
```

---

## Troubleshooting

### Container won't start
```bash
# View detailed logs
docker compose logs -f

# Stop and remove everything
docker compose down

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

### Frontend not loading
```bash
# Rebuild the container (frontend is built automatically)
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Can't access from network
```bash
# Check if container is running
docker compose ps

# Check if port is listening
netstat -tlnp | grep 8192

# Test from OMV server itself
curl http://localhost:8192/api/status
```

### Permission errors
```bash
# Fix permissions
chown -R root:root /docker-data/app-store-watcher
chmod -R 755 /docker-data/app-store-watcher
```

---

## Useful Commands

```bash
# View logs
docker compose logs -f

# Stop the service
docker compose down

# Start the service
docker compose up -d

# Restart the service
docker compose restart

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d

# Check container status
docker compose ps

# Access container shell
docker exec -it app-store-watcher bash
```

---

## Next Steps

Once the web UI is accessible:

1. **Add your first app:**
   - Click "+ Add App"
   - Enter app name
   - Enter App Store ID (from App Store URL)
   - Enter Discord webhook URL
   - Click "Add App"

2. **Test it:**
   - Click "Check Now" to verify it works
   - Click "Post Now" to test Discord webhook

3. **Monitor automatically:**
   - The system will check every 12 hours (or your custom interval)
   - New versions will be posted to Discord automatically

---

## Updating the Application

```bash
# SSH into OMV
ssh root@your-omv-ip

# Navigate to project
cd /docker-data/app-store-watcher

# Pull latest changes
git pull

# Rebuild frontend (if frontend changed)
./build.sh

# Rebuild and restart container
docker compose down
docker compose build
docker compose up -d
```

---

That's it! Your App Store Watcher is now running on OMV! 🎉

