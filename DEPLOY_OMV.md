# Deploying App Store Watcher on OMV (OpenMediaVault)

This guide shows how to deploy the App Store Watcher on your OMV server and access it from other machines on your local network.

## Prerequisites

- OMV server with Docker and Docker Compose installed
- SSH access to your OMV server (or use OMV web interface)
- The project files ready to transfer

---

## Step 1: Install Docker on OMV (if not already installed)

### Option A: Via OMV Web Interface

1. Open OMV web interface (usually `http://your-omv-ip`)
2. Go to **System** → **Plugins**
3. Search for and install:
   - `openmediavault-docker-gui` (Docker GUI plugin)
   - Or use `openmediavault-compose` (Docker Compose plugin)

### Option B: Via SSH

```bash
# SSH into your OMV server
ssh root@your-omv-ip

# Install Docker (if not installed)
apt-get update
apt-get install -y docker.io docker-compose

# Start Docker service
systemctl enable docker
systemctl start docker
```

---

## Step 2: Transfer Project Files to OMV Server

### Option A: Using SCP (from your local machine)

```bash
# From your Windows machine (using PowerShell or Git Bash)
# Navigate to the Watcher project directory
cd C:\Users\rajni\WebProjects\Watcher

# Transfer entire project to OMV
scp -r . root@your-omv-ip:/sharedfolders/docker/app-store-watcher/

# Or to a specific location like:
scp -r . root@your-omv-ip:/opt/app-store-watcher/
```

### Option B: Using SMB/Network Share

1. **Enable SMB/CIFS share on OMV:**
   - OMV Web UI → **Services** → **SMB/CIFS** → Enable
   - Create a shared folder (e.g., `docker` or `apps`)
   - Set permissions

2. **Map network drive on Windows:**
   - Open File Explorer
   - Map network drive: `\\your-omv-ip\shared-folder-name`
   - Copy the entire `Watcher` folder to the mapped drive

3. **SSH into OMV and move to proper location:**
   ```bash
   ssh root@your-omv-ip
   mv /sharedfolders/your-share/Watcher /opt/app-store-watcher
   ```

### Option C: Using Git (if you have Git on OMV)

```bash
# SSH into OMV
ssh root@your-omv-ip

# Clone or create directory
mkdir -p /opt/app-store-watcher
cd /opt/app-store-watcher

# If you have the project in Git, clone it
# Otherwise, use SCP or SMB to transfer files
```

---

## Step 3: Build Frontend on OMV Server

**Important:** You need Node.js on OMV to build the frontend.

### Install Node.js on OMV

```bash
# SSH into OMV
ssh root@your-omv-ip

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Build Frontend

```bash
# Navigate to project directory
cd /opt/app-store-watcher  # or wherever you placed it

# Make build script executable
chmod +x build.sh

# Build frontend
./build.sh

# Or manually:
cd frontend
npm install
npm run build
cd ..
```

**Alternative:** Build on your local machine and transfer the `frontend/dist` folder.

---

## Step 4: Configure Docker Compose for Network Access

Edit `docker-compose.yml` to ensure it's accessible from your network:

```yaml
version: '3.8'

services:
  watcher:
    build: .
    container_name: app-store-watcher
    restart: unless-stopped
    ports:
      - "8192:8080"  # External:Internal - access via port 8192
    environment:
      - CHECK_INTERVAL=12h
      - TZ=Asia/Kolkata  # Adjust to your timezone
    volumes:
      - notifier-data:/data
    networks:
      - default
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  notifier-data:

networks:
  default:
    driver: bridge
```

**Note:** The default external port is 8192. If you need a different port, change the first number:
```yaml
ports:
  - "9000:8080"  # Access via port 9000 instead
```

---

## Step 5: Build and Start the Container

```bash
# SSH into OMV
ssh root@your-omv-ip

# Navigate to project directory
cd /opt/app-store-watcher

# Build the Docker image
docker compose build

# Start the container
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

---

## Step 6: Access from Your Local Network

Once running, access the web UI from any machine on your network:

```
http://your-omv-ip:8192
```

**Example:**
- If your OMV IP is `192.168.1.100`
- Access at: `http://192.168.1.100:8192`

### Find Your OMV IP Address

```bash
# On OMV server
ip addr show
# or
hostname -I
```

Or check in OMV Web UI: **System** → **Network** → **Interfaces**

---

## Step 7: Configure Firewall (if needed)

If you can't access the web UI, check firewall settings:

### On OMV (if using UFW)

```bash
# Allow port 8192
ufw allow 8192/tcp
ufw reload
```

### Via OMV Web Interface

1. Go to **System** → **Firewall** (if plugin installed)
2. Add rule: Allow TCP port 8192

---

## Using OMV Docker GUI Plugin

If you installed `openmediavault-docker-gui`:

1. **Open OMV Web UI** → **Services** → **Docker**
2. **Create Stack:**
   - Name: `app-store-watcher`
   - Compose file: Browse to `/opt/app-store-watcher/docker-compose.yml`
   - Click **Deploy**

3. **Manage:**
   - View logs
   - Start/Stop/Restart
   - View containers

---

## Persistent Data Location

Data is stored in Docker volume `notifier-data`. To backup:

```bash
# Backup data directory
tar czf /docker-data/backup/watcher-backup-$(date +%Y%m%d).tar.gz -C /docker-data/app-store-watcher data/

# Or backup entire directory
tar czf /docker-data/backup/app-store-watcher-full-$(date +%Y%m%d).tar.gz -C /docker-data app-store-watcher/
```

---

## Updating the Application

```bash
# SSH into OMV
ssh root@your-omv-ip

# Navigate to project
cd /opt/app-store-watcher

# Pull latest code (if using Git)
git pull

# Rebuild frontend (if needed)
./build.sh

# Rebuild and restart container
docker compose down
docker compose build
docker compose up -d
```

---

## Troubleshooting

### Can't access web UI from network

1. **Check container is running:**
   ```bash
   docker compose ps
   ```

2. **Check OMV firewall:**
   ```bash
   ufw status
   ```

3. **Check if port is listening:**
   ```bash
   netstat -tlnp | grep 8192
   ```

4. **Test from OMV server itself:**
   ```bash
   curl http://localhost:8192/api/status
   ```

### Container won't start

```bash
# Check logs
docker compose logs

# Check if port is already in use
netstat -tlnp | grep 8080

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### Frontend not loading

```bash
# Verify frontend was built
ls -la frontend/dist/

# Rebuild frontend
cd frontend
npm run build
cd ..
docker compose restart
```

### Permission issues

```bash
# Fix permissions
chown -R root:root /opt/app-store-watcher
chmod -R 755 /opt/app-store-watcher
```

---

## Recommended Directory Structure on OMV

Following your existing Docker setup pattern (matching Jellyfin structure):

```
/docker-data/app-store-watcher/    # Matches your /docker-data/jellyfin/ pattern
├── backend/
├── frontend/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── data/                          # Created automatically, stores app configs and versions
    ├── apps.json
    └── apps/
        └── <app-id>/
            ├── version.txt
            ├── current_version.txt
            └── check.txt
```

**Benefits:**
- Consistent with your existing Docker setup
- Easy to backup (just backup `/docker-data/app-store-watcher/`)
- All Docker app data in one place

---

## Accessing from Internet (Optional)

If you want to access from outside your network:

1. **Set up reverse proxy** (Nginx, Traefik, etc.)
2. **Use OMV's Nginx plugin** or install Nginx
3. **Configure port forwarding** on your router (security risk - use VPN instead)

**Recommended:** Use a VPN to access your OMV server securely.

---

## Quick Reference Commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart

# Rebuild
docker compose down
docker compose build
docker compose up -d

# Check status
docker compose ps

# Access container shell
docker exec -it app-store-watcher bash
```

---

## Next Steps

Once deployed, follow the [USAGE.md](USAGE.md) guide to:
- Add your first app
- Configure Discord webhooks
- Set up monitoring intervals

Your App Store Watcher is now running on OMV and accessible from your entire local network! 🎉

