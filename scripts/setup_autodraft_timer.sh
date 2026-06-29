#!/usr/bin/env bash
# Run as root or with sudo
set -euo pipefail

SERVICE_NAME="erp-kb-discovery-autodraft"
SCRIPT="/docker/openspg/scripts/run_dashboard_discovery.mjs"
USER="mcpbot"

# Service unit
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << 'EOF'
[Unit]
Description=ERP KB Discovery Auto-Draft (every 6h)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/node /docker/openspg/scripts/run_dashboard_discovery.mjs --auto-draft
User=mcpbot
Group=mcpbot
Environment=ROOT=/docker/openspg
WorkingDirectory=/docker/openspg
StandardOutput=journal
StandardError=journal
EOF

# Timer unit
cat > "/etc/systemd/system/${SERVICE_NAME}.timer" << 'EOF'
[Unit]
Description=ERP KB Discovery Auto-Draft every 6 hours
Requires=erp-kb-discovery-autodraft.service

[Timer]
OnCalendar=*-*-* 00,06,12,18:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.timer"
systemctl start "${SERVICE_NAME}.timer"
echo "Auto-draft timer installed and started."
