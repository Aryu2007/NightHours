# Night Hours - Game Server Infrastructure

Multiplayer game hosting stack using Docker. Runs on macOS, Linux, or cloud VMs.

## Quick Start

```bash
# 1. Edit passwords (IMPORTANT!)
cp .env.gameservers .env
# Edit .env with secure passwords

# 2. Start servers
./start-game-servers.sh
```

## Included Game Servers

| Game | Port | Image | Notes |
|------|------|-------|-------|
| Valheim | 2456/udp | mbround18/valheim-docker | Viking survival |
| Minecraft (Paper) | 25565 | itzg/minecraft-server | Optimized, plugins supported |
| Terraria | 7777 | vladimirbabichev/terraria | 2D sandbox |
| 7 Days to Die | 26900/udp | didstopia/7dtd-server | Zombie survival |
| Counter-Strike 2 | 27015/udp | cm2network/cs2 | Competitive FPS |
| Team Fortress 2 | 27016/udp | cm2network/tf2 | Classic FPS |
| Palworld | 8211/udp | thijsvanloef/palworld-server-docker | Pokemon-like survival |

## Management UIs

| Tool | URL | Purpose |
|------|-----|---------|
| Portainer | http://localhost:9000 | Container management |
| Grafana | http://localhost:3001 | Metrics dashboards |
| Prometheus | http://localhost:9090 | Metrics collection |

## Directory Structure

```
night-hours/
├── docker-compose.yml          # Main orchestration
├── start-game-servers.sh       # Interactive launcher
├── .env.gameservers            # Password template
├── game-servers/               # Persistent game data
│   ├── valheim/
│   ├── minecraft/
│   ├── terraria/
│   ├── 7dtd/
│   ├── cs2/
│   ├── tf2/
│   └── palworld/
├── monitoring/
│   ├── prometheus.yml          # Scrape config
│   ├── prometheus-data/
│   ├── grafana-data/
│   └── grafana-datasources.yml
└── portainer/                  # Portainer data
```

## Production Deployment (Linux VM)

For **high-end gaming** with GPU passthrough:

### 1. Provision Linux VM (Hetzner/AWS/Vultr)
```bash
# Ubuntu 22.04+ with GPU
# Enable IOMMU in BIOS
# Install: docker.io docker-compose-plugin
```

### 2. GPU Passthrough (for game streaming)
```bash
# Host: bind GPU to vfio-pci
# VM: <hostdev mode='subsystem' type='pci' managed='yes'>
#       <source><address domain='0x0000' bus='0x01' slot='0x00' function='0x0'/></source>
#     </hostdev>
```

### 3. Deploy
```bash
git clone <this-repo>
cd night-hours
cp .env.gameservers .env
# Edit .env with real passwords
docker compose up -d
```

## Security Checklist

- [ ] Change ALL passwords in `.env`
- [ ] Use firewall (UFW/AWS SG) - only open needed ports
- [ ] Enable fail2ban for SSH
- [ ] Regular backups of `game-servers/`
- [ ] Monitor via Grafana dashboards

## Ports to Open (Firewall)

```bash
# Game ports (UDP unless noted)
2456,2457,2458  # Valheim
25565,25575     # Minecraft (TCP)
7777            # Terraria
26900,26901,26902  # 7DTD
27015,27020     # CS2
27016           # TF2
8211,8212       # Palworld

# Management (restrict to your IP!)
9000  # Portainer
3001  # Grafana
9090  # Prometheus
8080  # Game Manager
```

## Backups

```bash
# Automated backup script
tar -czf "backup-$(date +%F).tar.gz" game-servers/
# Upload to S3/Backblaze/etc
```

## Troubleshooting

```bash
# View logs
docker compose logs -f valheim

# Restart single server
docker compose restart minecraft

# Update images
docker compose pull && docker compose up -d

# Check resource usage
docker stats
```

## Adding More Games

Add new service to `docker-compose.yml`:
```yaml
newgame:
  image: owner/image:tag
  container_name: newgame-server
  ports:
    - "PORT:PORT/udp"
  environment:
    - VAR=value
  volumes:
    - ./game-servers/newgame:/data
  restart: unless-stopped
```

Then run `docker compose up -d newgame`.