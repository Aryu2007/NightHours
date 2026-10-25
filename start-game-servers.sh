#!/bin/bash
# Night Hours Game Server Launcher

set -e

echo "=========================================="
echo "  Night Hours - Game Server Launcher"
echo "=========================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Create directories
mkdir -p game-servers/{valheim,minecraft,terraria,7dtd,cs2,tf2,palworld}
mkdir -p monitoring/prometheus-data monitoring/grafana-data
mkdir -p portainer config

# Load environment variables if .env.gameservers exists
if [ -f .env.gameservers ]; then
    export $(cat .env.gameservers | grep -v '^#' | xargs)
    echo "Loaded environment from .env.gameservers"
fi

echo ""
echo "Available game servers:"
echo "  1) Valheim          (port 2456/udp)"
echo "  2) Minecraft        (port 25565)"
echo "  3) Terraria         (port 7777)"
echo "  4) 7 Days to Die    (port 26900/udp)"
echo "  5) Counter-Strike 2 (port 27015/udp)"
echo "  6) Team Fortress 2  (port 27016/udp)"
echo "  7) Palworld         (port 8211/udp)"
echo "  8) All servers"
echo "  9) Stop all servers"
echo "  10) View logs"
echo "  11) Monitor (Portainer/Grafana)"
echo ""

read -p "Select option [1-11]: " choice

case $choice in
    1)
        docker compose up -d valheim
        echo "Valheim server starting on port 2456 (UDP)"
        ;;
    2)
        docker compose up -d minecraft
        echo "Minecraft server starting on port 25565"
        ;;
    3)
        docker compose up -d terraria
        echo "Terraria server starting on port 7777"
        ;;
    4)
        docker compose up -d 7dtd
        echo "7 Days to Die server starting on port 26900 (UDP)"
        ;;
    5)
        docker compose up -d cs2
        echo "CS2 server starting on port 27015 (UDP/TCP)"
        ;;
    6)
        docker compose up -d tf2
        echo "TF2 server starting on port 27016 (UDP/TCP)"
        ;;
    7)
        docker compose up -d palworld
        echo "Palworld server starting on port 8211 (UDP)"
        ;;
    8)
        docker compose up -d
        echo "All game servers starting..."
        ;;
    9)
        docker compose down
        echo "All servers stopped."
        ;;
    10)
        docker compose logs -f --tail=100
        ;;
    11)
        docker compose up -d portainer prometheus grafana
        echo "Monitoring started:"
        echo "  Portainer: http://localhost:9000"
        echo "  Grafana:   http://localhost:3001 (admin/changeme)"
        echo "  Prometheus: http://localhost:9090"
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "Done! Useful commands:"
echo "  docker compose ps                 # List running servers"
echo "  docker compose logs -f <service>  # View logs for specific server"
echo "  docker compose down               # Stop all servers"
echo "  ./start-game-servers.sh           # Run this menu again"