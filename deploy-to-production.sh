#!/bin/bash
# Deploy NeoEngine Dashboard to production using PM2
# Run: scp deploy-to-production.sh ubuntu@92.222.128.92:~/ && ssh ubuntu@92.222.128.92 'sed -i "s/\r$//" ~/deploy-to-production.sh && bash ~/deploy-to-production.sh'

set -e

PROJECT_DIR="$HOME/dashboard-ne.neuoptic.in"
NGINX_CONF="/etc/nginx/sites-available/dashboard-ne.neuoptic.in"

echo "=== Deploying NeoEngine Dashboard (PM2) ==="

# 1. Clone or pull
if [ ! -d "$PROJECT_DIR" ]; then
  mkdir -p "$PROJECT_DIR"
  git clone https://github.com/ronitrks6666/NeoEngine-dashboard.git "$PROJECT_DIR"
  cd "$PROJECT_DIR"
else
  cd "$PROJECT_DIR"
  git pull origin main || git pull origin master
fi

# 2. Create .env with production backend URL
echo "VITE_API_BASE_URL=https://neoengine-be.neuoptic.in/api" > .env
echo "Created .env with production backend URL"

# 3. Install & build
npm install
npx vite build

# 4. PM2 - start or restart
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

pm2 delete neoengine-dashboard 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

# 5. Nginx — APKs from disk (correct MIME); everything else → PM2. Preserves Certbot SSL blocks if you merge manually after first HTTPS setup.
sudo tee "$NGINX_CONF" << NGINX
server {
    server_name dashboard-ne.neuoptic.in;

    location ^~ /app-packages/ {
        alias $PROJECT_DIR/dist/app-packages/;
        default_type application/vnd.android.package-archive;
        add_header Content-Disposition "attachment";
        add_header Cache-Control "public, max-age=3600";
        gzip off;
        sendfile on;
        tcp_nopush on;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/dashboard-ne.neuoptic.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard-ne.neuoptic.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if (\$host = dashboard-ne.neuoptic.in) {
        return 301 https://\$host\$request_uri;
    }
    listen 80;
    server_name dashboard-ne.neuoptic.in;
    return 404;
}
NGINX

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "=== Done ==="
echo "Dashboard: https://dashboard-ne.neuoptic.in"
echo "PM2: pm2 status neoengine-dashboard"
echo "Logs: pm2 logs neoengine-dashboard"
echo ""
echo "For HTTPS: sudo certbot --nginx -d dashboard-ne.neuoptic.in"
