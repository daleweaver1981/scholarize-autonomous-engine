#!/bin/bash

# ScholarNet Autonomous Engine - Production Deployment Script
# This script will deploy your system to production

set -e  # Exit on any error

echo "╔══════════════════════════════════════════════════════════╗"
echo "║   ScholarNet Autonomous Engine - Production Deployment   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}⚠️  Please don't run as root. Run as a regular user.${NC}"
   exit 1
fi

echo "📋 Pre-Deployment Checklist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Not installed${NC}"
    echo "Please install Node.js 18+ first"
    exit 1
fi

# 2. Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ Not installed${NC}"
    exit 1
fi

# 3. Check PM2
echo -n "Checking PM2... "
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo -e "${GREEN}✅ $PM2_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not installed${NC}"
    echo -n "Would you like to install PM2 globally? (y/n): "
    read -r INSTALL_PM2
    if [ "$INSTALL_PM2" = "y" ]; then
        sudo npm install -g pm2
        echo -e "${GREEN}✅ PM2 installed${NC}"
    else
        echo "Please install PM2: sudo npm install -g pm2"
        exit 1
    fi
fi

# 4. Check PostgreSQL
echo -n "Checking PostgreSQL... "
if command -v psql &> /dev/null; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    echo -e "${GREEN}✅ $PG_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not installed (optional)${NC}"
fi

# 5. Check Redis
echo -n "Checking Redis... "
if command -v redis-cli &> /dev/null; then
    REDIS_VERSION=$(redis-cli --version | awk '{print $2}')
    echo -e "${GREEN}✅ $REDIS_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Not installed (optional)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask for deployment confirmation
echo "🎯 Deployment Mode Selection"
echo ""
echo "1) Full Production (with database + Redis)"
echo "2) Standalone Mode (no database, memory only)"
echo "3) Development Mode (testing)"
echo ""
echo -n "Select mode (1-3): "
read -r DEPLOY_MODE

case $DEPLOY_MODE in
    1)
        echo ""
        echo "📦 Full Production Deployment Selected"
        FULL_PRODUCTION=true
        ;;
    2)
        echo ""
        echo "📦 Standalone Mode Selected"
        FULL_PRODUCTION=false
        ;;
    3)
        echo ""
        echo "📦 Development Mode Selected"
        FULL_PRODUCTION=false
        ;;
    *)
        echo "Invalid selection"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install dependencies
echo "📦 Installing Dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cat > .env << 'ENVFILE'
# Environment
NODE_ENV=production

# Database (Optional - set if using PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scholarnet
DB_USER=scholarnet_user
DB_PASSWORD=change_this_password

# Redis (Optional - set if using Redis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys (REQUIRED)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Feature Flags
DRY_RUN_MODE=false
AUTO_PUBLISH=false
AUTO_SOCIAL_POST=false

# Limits
MAX_DAILY_ARTICLES=150
MAX_DAILY_SOCIAL_POSTS=450

# Logging
LOG_LEVEL=info
ENVFILE
    echo -e "${YELLOW}⚠️  .env file created - PLEASE EDIT IT WITH YOUR API KEYS!${NC}"
    echo ""
    echo "Required: ANTHROPIC_API_KEY"
    echo ""
    echo -n "Press Enter to edit .env file now, or Ctrl+C to exit and edit manually: "
    read -r
    ${EDITOR:-nano} .env
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

echo ""

# Initialize database if full production
if [ "$FULL_PRODUCTION" = true ]; then
    echo "🗄️  Database Setup"
    echo ""
    echo "Would you like to initialize the PostgreSQL database? (y/n): "
    read -r INIT_DB
    
    if [ "$INIT_DB" = "y" ]; then
        echo "Enter database name [scholarnet]: "
        read -r DB_NAME
        DB_NAME=${DB_NAME:-scholarnet}
        
        echo "Enter database user [scholarnet_user]: "
        read -r DB_USER
        DB_USER=${DB_USER:-scholarnet_user}
        
        echo "Enter database password: "
        read -s DB_PASSWORD
        echo ""
        
        echo "Creating database..."
        sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"
        sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "User may already exist"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null
        
        echo "Initializing schema..."
        sudo -u postgres psql $DB_NAME < database/schema.sql 2>/dev/null || echo "Schema may already be initialized"
        
        echo -e "${GREEN}✅ Database initialized${NC}"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start application
echo "🚀 Starting Application..."
echo ""

# Stop if already running
pm2 delete scholarnet-orchestrator 2>/dev/null || true

# Start with PM2
pm2 start ecosystem.config.cjs

echo ""
echo -e "${GREEN}✅ Application started!${NC}"
echo ""

# Save PM2 configuration
pm2 save

# Setup PM2 startup
echo "Setting up PM2 to start on boot..."
pm2 startup | grep "sudo" | bash || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Show status
echo "📊 Application Status:"
echo ""
pm2 status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 Quick Reference:"
echo ""
echo "  View logs:        pm2 logs scholarnet-orchestrator"
echo "  Monitor:          pm2 monit"
echo "  Restart:          pm2 restart scholarnet-orchestrator"
echo "  Stop:             pm2 stop scholarnet-orchestrator"
echo "  Status:           pm2 status"
echo ""
echo "  All logs:         pm2 logs"
echo "  Flush logs:       pm2 flush"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Check logs:     pm2 logs scholarnet-orchestrator --lines 50"
echo "2. Monitor system: pm2 monit"
echo "3. Wait 2-3 minutes and check if articles are being generated"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Your autonomous engine is now running!"
echo ""
echo "It will:"
echo "  - Generate 150 articles/day (6 cycles)"
echo "  - Optimize every article for SEO"
echo "  - Track all performance metrics"
echo "  - Run 24/7 without supervision"
echo ""
echo "Welcome to autonomous content marketing! 🚀"
echo ""

