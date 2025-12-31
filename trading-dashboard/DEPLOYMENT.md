# Deployment Guide for protrader.com

## Prerequisites
- Hostinger VPS with Ubuntu 22.04/24.04
- Domain: protrader.com pointed to VPS IP

---

## Step 1: Connect to VPS
```bash
ssh root@YOUR_VPS_IP
```

---

## Step 2: Update System & Install Dependencies
```bash
apt update && apt upgrade -y
apt install -y curl wget git build-essential
```

---

## Step 3: Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v
```

---

## Step 4: Install MongoDB 7.0
```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

apt update && apt install -y mongodb-org
systemctl start mongod && systemctl enable mongod
```

---

## Step 5: Install PM2 & Nginx
```bash
npm install -g pm2
apt install -y nginx
systemctl start nginx && systemctl enable nginx
```

---

## Step 6: Clone Project
```bash
mkdir -p /var/www && cd /var/www
git clone YOUR_REPO_URL trading-dashboard
cd trading-dashboard
```

---

## Step 7: Setup Backend
```bash
cd /var/www/trading-dashboard/backend
npm install
```

Create `.env`:
```bash
cat > .env << 'EOF'
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/bull4x_trading
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string
EOF
```

Seed admin:
```bash
node scripts/seedAdmin.js
```

---

## Step 8: Build Frontend
```bash
cd /var/www/trading-dashboard/frontend
npm install
npm run build
```

---

## Step 9: Start Backend with PM2
```bash
cd /var/www/trading-dashboard/backend
pm2 start server.js --name "trading-api"
pm2 save
pm2 startup
```

---

## Step 10: Configure Nginx
```bash
cat > /etc/nginx/sites-available/protrader << 'EOF'
server {
    listen 80;
    server_name protrader.com www.protrader.com;

    # Frontend
    location / {
        root /var/www/trading-dashboard/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/protrader /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## Step 11: Setup Firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

---

## Step 12: Setup SSL (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d protrader.com -d www.protrader.com
```

---

## DNS Setup (Hostinger DNS)
Add these records in your domain DNS settings:
| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_VPS_IP |
| A | www | YOUR_VPS_IP |

---

## Useful Commands
| Action | Command |
|--------|---------|
| View logs | `pm2 logs trading-api` |
| Restart backend | `pm2 restart trading-api` |
| Restart nginx | `systemctl restart nginx` |
| Check MongoDB | `systemctl status mongod` |
| Update code | `cd /var/www/trading-dashboard && git pull && pm2 restart trading-api` |

---

## Admin Login
- URL: https://protrader.com/admin/login
- Email: admin@admin.com
- Password: admin123

**⚠️ Change the admin password after first login!**
