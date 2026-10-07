#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "  Scholarize Database Initialization"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo -n "Checking PostgreSQL service... "
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
    echo "Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

echo ""
echo "This script will create:"
echo "  - Database: scholarnet"
echo "  - User: scholarnet_user"
echo "  - Password: ***REMOVED***"
echo ""
echo -e "${YELLOW}⚠️  This requires sudo access to run PostgreSQL commands${NC}"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Creating database and user..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create database and user
sudo -u postgres psql << EOF
-- Drop existing if needed
DROP DATABASE IF EXISTS scholarnet;
DROP USER IF EXISTS scholarnet_user;

-- Create database
CREATE DATABASE scholarnet;

-- Create user
CREATE USER scholarnet_user WITH ENCRYPTED PASSWORD '***REMOVED***';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE scholarnet TO scholarnet_user;

-- Show result
\l scholarnet
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and user created successfully${NC}"
else
    echo -e "${RED}❌ Failed to create database and user${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Loading database schema..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load schema
sudo -u postgres psql -d scholarnet -f database/schema.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema loaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to load schema${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Granting permissions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Grant all permissions to user
sudo -u postgres psql -d scholarnet << EOF
GRANT ALL ON SCHEMA public TO scholarnet_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO scholarnet_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO scholarnet_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO scholarnet_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO scholarnet_user;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Permissions granted${NC}"
else
    echo -e "${RED}❌ Failed to grant permissions${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Verifying installation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test connection
sudo -u postgres psql -d scholarnet << EOF
-- List tables
\dt

-- Count tables
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ DATABASE INITIALIZATION COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Database Details:"
echo "  Host:     localhost"
echo "  Port:     5432"
echo "  Database: scholarnet"
echo "  User:     scholarnet_user"
echo "  Password: ***REMOVED***"
echo ""
echo "Connection String:"
echo "  ***REMOVED***"
echo ""
echo "Test connection:"
echo "  psql -U scholarnet_user -d scholarnet -h localhost"
echo ""
echo "Next Steps:"
echo "  1. Database is ready for use"
echo "  2. Environment variables are already set in .env"
echo "  3. Ready to enable full content automation"
echo ""
