### # 🚀 Scholarize Autonomous Engine - Production Deployment Guide

**Complete Step-by-Step Guide to Deploy to Production**

---

## 📋 Pre-Deployment Checklist

### 1. **System Requirements**

**Server Specifications (Minimum):**
- ✅ Ubuntu 20.04+ or similar Linux distribution
- ✅ 4 CPU cores
- ✅ 8 GB RAM
- ✅ 100 GB SSD storage
- ✅ Static IP address
- ✅ Domain name configured

**Recommended Production Setup:**
- 8 CPU cores
- 16 GB RAM
- 250 GB SSD storage
- CDN configured
- Load balancer (for scaling)

### 2. **Required Services**

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ installed
- ✅ Redis 6+ installed
- ✅ PM2 installed globally
- ✅ Nginx installed (web server)
- ✅ SSL certificate (Let's Encrypt)

### 3. **API Keys & Credentials**

- ✅ Anthropic API key (Claude)
- ✅ Twitter API credentials (optional)
- ✅ LinkedIn API credentials (optional)
- ✅ Reddit API credentials (optional)
- ✅ WordPress API credentials (if using WordPress)
- ✅ Google Analytics tracking ID
- ✅ SEO tools API keys (Ahrefs, SEMrush - optional)

---

## 🔧 Step 1: Server Setup

### Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot (for SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## 🗄️ Step 2: Database Setup

### Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE scholarnet;
CREATE USER scholarnet_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE scholarnet TO scholarnet_user;
\q
```

### Initialize Schema

```bash
# Navigate to project
cd /opt/scholarnet-autonomous-engine

# Run schema creation
sudo -u postgres psql scholarnet < database/schema.sql

# Verify tables created
sudo -u postgres psql scholarnet -c "\dt"
```

---

## ⚙️ Step 3: Configuration

### Create Production Environment File

```bash
cd /opt/scholarnet-autonomous-engine

# Create .env file
cat > .env << 'EOF'
# Environment
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scholarnet
DB_USER=scholarnet_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Social Media (Optional)
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=

# WordPress Integration (Optional)
WORDPRESS_URL=https://yoursite.com
WORDPRESS_USERNAME=admin
WORDPRESS_APP_PASSWORD=your_app_password

# Domain
DOMAIN=scholarnet.com
API_URL=https://api.scholarnet.com

# Security
JWT_SECRET=your_random_jwt_secret_here
SESSION_SECRET=your_random_session_secret_here

# Feature Flags
DRY_RUN_MODE=false
AUTO_PUBLISH=false
AUTO_SOCIAL_POST=false

# Limits
MAX_DAILY_ARTICLES=150
MAX_DAILY_SOCIAL_POSTS=450

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=

# Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
EOF

# Secure the file
chmod 600 .env
```

---

## 📦 Step 4: Install Dependencies

```bash
cd /opt/scholarnet-autonomous-engine

# Install npm packages
npm install

# Install pg (PostgreSQL client) if not in package.json
npm install pg

# Verify installation
npm list
```

---

## 🔄 Step 5: Redis Configuration

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Find and update these settings:
# maxmemory 2gb
# maxmemory-policy allkeys-lru
# bind 127.0.0.1 ::1

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test Redis
redis-cli ping
# Should return: PONG
```

---

## 🌐 Step 6: Nginx Configuration

### Create Nginx Site Configuration

```bash
sudo nano /etc/nginx/sites-available/scholarnet
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name scholarnet.com www.scholarnet.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name scholarnet.com www.scholarnet.com;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/scholarnet.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/scholarnet.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/scholarnet-access.log;
    error_log /var/log/nginx/scholarnet-error.log;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3100/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3100/health;
        access_log off;
    }

    # Static files (if needed)
    location /static/ {
        alias /opt/scholarnet-autonomous-engine/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WordPress (if integrated)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Enable Site and Get SSL Certificate

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/scholarnet /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Get SSL certificate
sudo certbot --nginx -d scholarnet.com -d www.scholarnet.com

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 🚀 Step 7: Start the Application

### Start with PM2

```bash
cd /opt/scholarnet-autonomous-engine

# Start the orchestrator
npm run orchestrator:start

# Check status
pm2 status

# View logs
pm2 logs scholarnet-orchestrator

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command
```

### Verify Everything is Running

```bash
# Check orchestrator
pm2 status

# Check database connection
sudo -u postgres psql scholarnet -c "SELECT COUNT(*) FROM articles;"

# Check Redis
redis-cli ping

# Check Nginx
sudo systemctl status nginx

# Test health endpoint
curl http://localhost:3100/health
```

---

## 📊 Step 8: Monitoring Setup

### Setup PM2 Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Setup System Monitoring

```bash
# Create monitoring script
cat > /opt/scholarnet-autonomous-engine/monitor.sh << 'EOF'
#!/bin/bash

# Check orchestrator
if ! pm2 status | grep -q "scholarnet-orchestrator.*online"; then
    echo "ALERT: Orchestrator is down!"
    pm2 restart scholarnet-orchestrator
fi

# Check database
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw scholarnet; then
    echo "ALERT: Database is down!"
fi

# Check Redis
if ! redis-cli ping > /dev/null 2>&1; then
    echo "ALERT: Redis is down!"
    sudo systemctl restart redis-server
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "ALERT: Disk usage is at ${DISK_USAGE}%"
fi
EOF

chmod +x /opt/scholarnet-autonomous-engine/monitor.sh

# Add to crontab (run every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/scholarnet-autonomous-engine/monitor.sh >> /var/log/scholarnet-monitor.log 2>&1") | crontab -
```

---

## 🔐 Step 9: Security Hardening

### Firewall Configuration

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### Secure PostgreSQL

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Ensure only local connections are allowed:
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Setup Fail2Ban (Optional)

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 💾 Step 10: Backup Configuration

### Setup Automated Backups

```bash
# Create backup script
cat > /opt/scholarnet-autonomous-engine/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/scholarnet"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump scholarnet | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis data
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/scholarnet-autonomous-engine \
    --exclude=node_modules \
    --exclude=logs

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/scholarnet-autonomous-engine/backup.sh

# Schedule daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scholarnet-autonomous-engine/backup.sh >> /var/log/scholarnet-backup.log 2>&1") | crontab -
```

---

## ✅ Step 11: Verification & Testing

### Run All Tests

```bash
cd /opt/scholarnet-autonomous-engine

# Test all systems
npm run test:all

# Expected output: All tests should pass
```

### Test Database Connection

```bash
# Test database operations
node -e "
import Database from './lib/database.js';
const db = new Database();
await db.connect();
const stats = await db.getStats();
console.log('Database Stats:', stats);
await db.close();
"
```

### Test Orchestrator

```bash
# Check orchestrator logs
pm2 logs scholarnet-orchestrator --lines 50

# Check health endpoint
curl https://scholarnet.com/health
```

### Test Article Generation

```bash
# Generate a test article (dry run)
cd /opt/scholarnet-autonomous-engine
DRY_RUN_MODE=true node test-content-engine.js
```

---

## 📈 Step 12: Performance Optimization

### Node.js Optimization

```bash
# Set Node.js memory limit (adjust based on your RAM)
pm2 delete scholarnet-orchestrator
pm2 start ecosystem.config.js --node-args="--max-old-space-size=4096"
pm2 save
```

### PostgreSQL Optimization

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf

# Adjust these values based on your server:
# shared_buffers = 2GB
# effective_cache_size = 6GB
# maintenance_work_mem = 512MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
# random_page_cost = 1.1
# effective_io_concurrency = 200
# work_mem = 10MB
# min_wal_size = 1GB
# max_wal_size = 4GB

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Redis Optimization

```bash
sudo nano /etc/redis/redis.conf

# Set appropriate values:
# maxmemory 2gb
# maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

---

## 🎯 Step 13: Go Live!

### Enable Auto-Publishing (when ready)

```bash
# Edit .env file
nano /opt/scholarnet-autonomous-engine/.env

# Change:
AUTO_PUBLISH=true
AUTO_SOCIAL_POST=true
DRY_RUN_MODE=false

# Restart orchestrator
pm2 restart scholarnet-orchestrator
```

### Monitor First 24 Hours

```bash
# Watch logs in real-time
pm2 logs scholarnet-orchestrator

# Check article generation
watch -n 60 'sudo -u postgres psql scholarnet -c "SELECT COUNT(*) FROM articles WHERE DATE(created_at) = CURRENT_DATE;"'

# Check social posts
watch -n 60 'sudo -u postgres psql scholarnet -c "SELECT COUNT(*) FROM social_posts WHERE DATE(created_at) = CURRENT_DATE;"'

# Monitor system resources
htop
```

---

## 🔍 Troubleshooting

### Common Issues

**Issue: Orchestrator won't start**
```bash
# Check logs
pm2 logs scholarnet-orchestrator --err

# Check environment
cat /opt/scholarnet-autonomous-engine/.env

# Restart
pm2 restart scholarnet-orchestrator
```

**Issue: Database connection fails**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
sudo -u postgres psql scholarnet

# Check pg_hba.conf permissions
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**Issue: Redis connection fails**
```bash
# Check Redis is running
sudo systemctl status redis-server

# Test connection
redis-cli ping

# Restart Redis
sudo systemctl restart redis-server
```

**Issue: High memory usage**
```bash
# Check memory
free -h

# Check process memory
ps aux --sort=-%mem | head -10

# Adjust Node.js memory limit
pm2 restart scholarnet-orchestrator --node-args="--max-old-space-size=4096"
```

---

## 📞 Support & Maintenance

### Daily Checks
- ✅ Check PM2 status: `pm2 status`
- ✅ Check logs for errors: `pm2 logs --lines 100`
- ✅ Check disk space: `df -h`
- ✅ Check database size: `sudo -u postgres psql scholarnet -c "\l+"`

### Weekly Checks
- ✅ Review system analytics
- ✅ Check backup integrity
- ✅ Update dependencies: `npm update`
- ✅ Review and clean old logs

### Monthly Checks
- ✅ Security updates: `sudo apt update && sudo apt upgrade`
- ✅ SSL certificate renewal (automatic with Certbot)
- ✅ Performance review
- ✅ Database optimization: `VACUUM ANALYZE;`

---

## 🎉 Deployment Complete!

Your Scholarize Autonomous Engine is now running in production!

**What's Happening Now:**
- ✅ Generating 150 articles/day
- ✅ Optimizing every article for SEO
- ✅ Posting to social media 3x daily
- ✅ Tracking performance automatically
- ✅ Self-improving with AI Evolution Engine

**Monitor Your Success:**
- Dashboard: https://scholarnet.com/admin
- Health: https://scholarnet.com/health
- Logs: `pm2 logs scholarnet-orchestrator`

**Expected Results (First Month):**
- 4,500 articles published
- 13,500 social media posts
- 50,000-100,000 website visitors
- 10,000-20,000 social media impressions/day

**Welcome to autonomous content marketing!** 🚀

---

*For issues or questions, check logs: `pm2 logs scholarnet-orchestrator`*
