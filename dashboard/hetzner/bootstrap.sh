#!/usr/bin/env bash
# Hermes server bootstrap — run once on a fresh Hetzner Ubuntu 24.04 box.
# Usage (as root): bash bootstrap.sh
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[bootstrap]${NC} $1"; }
warn() { echo -e "${YELLOW}[bootstrap]${NC} $1"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash bootstrap.sh"
  exit 1
fi

log "1/8 Updating system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

log "2/8 Installing base tools (ufw, fail2ban, curl, git)..."
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ufw fail2ban curl git ca-certificates gnupg lsb-release jq

log "3/8 Configuring firewall (SSH + Tailscale only)..."
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
# Tailscale handles its own interface — no need to open ports for it
ufw --force enable

log "4/8 Enabling fail2ban + hardening SSH..."
systemctl enable --now fail2ban

# Disable password auth (key-only)
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#*KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
# Ubuntu 24.04 uses 'ssh', older Ubuntu uses 'sshd' — try both, restart as last resort
(systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || systemctl restart ssh 2>/dev/null || true)

# Enable automatic security updates
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades apt-listchanges
echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades

log "5/8 Installing Node.js 20..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs
fi
log "    Node $(node -v) installed"

log "6/8 Installing PM2 (process manager)..."
npm install -g pm2 >/dev/null 2>&1
pm2 startup systemd -u hermes --hp /home/hermes >/dev/null 2>&1 || true

log "7/8 Creating hermes user..."
if ! id hermes >/dev/null 2>&1; then
  useradd -m -s /bin/bash hermes
  mkdir -p /home/hermes/{scripts,logs,data}
  chown -R hermes:hermes /home/hermes
fi

log "8/8 Installing Tailscale..."
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh >/dev/null 2>&1
fi

echo
log "Starting Tailscale — follow the URL below to authorize this server in your browser:"
echo
tailscale up --ssh --hostname=woody-hermes

# Capture Tailscale IP
TAILSCALE_IP=$(tailscale ip -4 | head -n1)

echo
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ BOOTSTRAP COMPLETE${NC}"
echo "════════════════════════════════════════════════════════════"
echo "   Tailscale hostname: woody-hermes.tail-net.ts.net"
echo "   Tailscale IP:       ${TAILSCALE_IP}"
echo "   Hermes user:        /home/hermes/"
echo "   Node:               $(node -v)"
echo "   PM2:                $(pm2 -v)"
echo
echo "   Next step: from your PC, run:"
echo "     .\\hetzner\\deploy.ps1 -ServerIp <hetzner-public-ip>"
echo "════════════════════════════════════════════════════════════"
