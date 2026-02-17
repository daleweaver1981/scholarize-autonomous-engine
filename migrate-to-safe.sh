#!/bin/bash
# Migration script: Upgrade to Safe Autonomous Engine
# This script safely migrates from the unsafe implementer to the safe one

set -e  # Exit on error

echo "🛡️  Migrating to Safe Autonomous Engine"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running as correct user
if [ "$USER" != "aiadmin" ]; then
    echo "❌ Must run as aiadmin user"
    echo "   Run: sudo -u aiadmin $0"
    exit 1
fi

# Step 1: Stop any running autonomous processes
echo "1. Stopping autonomous processes..."
pm2 stop autonomous-engine 2>/dev/null || echo "   No autonomous-engine process found"
pkill -f "autonomous-implementer" 2>/dev/null || echo "   No implementer processes found"
echo "   ✓ Stopped"
echo ""

# Step 2: Backup current configuration
echo "2. Creating backup..."
BACKUP_DIR="$HOME/scholarnet-backups/autonomous-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /opt/scholarnet-autonomous-engine/* "$BACKUP_DIR/"
echo "   ✓ Backed up to: $BACKUP_DIR"
echo ""

# Step 3: Initialize git in production
echo "3. Initializing git in production..."
cd /opt/scholarnet-ai
if [ ! -d ".git" ]; then
    git init
    git config user.email "autonomous@scholarnet.ai"
    git config user.name "Autonomous Engine"
    git add .
    git commit -m "Initial commit before autonomous deployments" || echo "   (no changes to commit)"
    echo "   ✓ Git initialized"
else
    echo "   ✓ Git already initialized"
fi
echo ""

# Step 4: Create staging environment
echo "4. Setting up staging environment..."
if [ ! -d "/opt/scholarnet-ai-staging" ]; then
    if mkdir -p /opt/scholarnet-ai-staging 2>/dev/null; then
        rsync -a /opt/scholarnet-ai/ /opt/scholarnet-ai-staging/ --exclude=node_modules --exclude=.git
        echo "   ✓ Staging environment created"
    else
        echo "   ⚠️  Cannot create /opt/scholarnet-ai-staging (permission denied)"
        echo "      Staging will be skipped - please create manually with sudo"
    fi
else
    echo "   ✓ Staging environment exists"
fi
echo ""

# Step 5: Create database table
echo "5. Creating database table..."
if command -v psql >/dev/null 2>&1; then
    if PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-scholarnet}" 2>/dev/null << 'SQL'
CREATE TABLE IF NOT EXISTS autonomous_deployments (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(100) UNIQUE NOT NULL,
  opportunity JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  git_commit VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_status ON autonomous_deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created ON autonomous_deployments(created_at DESC);

\echo '   ✓ Table created'
SQL
    then
        echo "   ✓ Database table created"
    else
        echo "   ⚠️  Could not create database table (please run manually)"
    fi
else
    echo "   ⚠️  psql not found - skipping database setup"
fi
echo ""

# Step 6: Update environment variables
echo "6. Updating environment variables..."
ENV_FILE="/opt/scholarnet-autonomous-engine/.env.production"

# Add safety variables if missing
grep -q "REQUIRE_APPROVAL" "$ENV_FILE" || echo "REQUIRE_APPROVAL=true" >> "$ENV_FILE"
grep -q "STAGING_ENABLED" "$ENV_FILE" || echo "STAGING_ENABLED=true" >> "$ENV_FILE"
grep -q "INCREMENTAL_ROLLOUT" "$ENV_FILE" || echo "INCREMENTAL_ROLLOUT=true" >> "$ENV_FILE"
grep -q "MAX_DAILY_DEPLOYMENTS" "$ENV_FILE" || echo "MAX_DAILY_DEPLOYMENTS=1" >> "$ENV_FILE"

echo "   ✓ Environment variables updated"
echo ""

# Step 7: Update engine to use safe implementer
echo "7. Switching to safe implementer..."
cd /opt/scholarnet-autonomous-engine

# Check if autonomous-engine-safe.js exists
if [ -f "autonomous-engine-safe.js" ]; then
    # Update the import
    sed -i 's/autonomous-implementer-v2\.js/autonomous-implementer-safe.js/g' autonomous-engine-safe.js
    echo "   ✓ Updated import in autonomous-engine-safe.js"
else
    echo "   ⚠️  autonomous-engine-safe.js not found"
fi
echo ""

# Step 8: Verify files exist
echo "8. Verifying installation..."
MISSING=0

if [ ! -f "autonomous-implementer-safe.js" ]; then
    echo "   ❌ Missing: autonomous-implementer-safe.js"
    MISSING=1
else
    echo "   ✓ autonomous-implementer-safe.js exists"
fi

if [ ! -f "/opt/scholarnet-ai/backend/routes/autonomousApprovals.js" ]; then
    echo "   ⚠️  Missing: backend/routes/autonomousApprovals.js"
    echo "      Create this file manually (see SETUP_GUIDE.md)"
    MISSING=1
else
    echo "   ✓ autonomousApprovals.js exists"
fi

if [ ! -f "/opt/scholarnet-ai/frontend/src/pages/admin/AutonomousApprovals.jsx" ]; then
    echo "   ⚠️  Missing: frontend/src/pages/admin/AutonomousApprovals.jsx"
    echo "      Create this file manually (see SETUP_GUIDE.md)"
    MISSING=1
else
    echo "   ✓ AutonomousApprovals.jsx exists"
fi

echo ""

# Step 9: Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $MISSING -eq 0 ]; then
    echo "✅ Migration complete!"
    echo ""
    echo "Next steps:"
    echo "1. Review SETUP_GUIDE.md for remaining setup"
    echo "2. Add admin routes to backend/server.js"
    echo "3. Add admin UI route to frontend router"
    echo "4. Test the approval system"
    echo "5. Re-enable autonomous engine when ready"
else
    echo "⚠️  Migration partially complete"
    echo ""
    echo "Some files are missing. Please:"
    echo "1. Review SETUP_GUIDE.md"
    echo "2. Create missing files manually"
    echo "3. Run this script again to verify"
fi

echo ""
echo "📋 Backup location: $BACKUP_DIR"
echo "📖 Full guide: /opt/scholarnet-autonomous-engine/SETUP_GUIDE.md"
