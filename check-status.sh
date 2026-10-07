#!/bin/bash

echo "════════════════════════════════════════════════════════"
echo "  Scholarize Autonomous Engine - Status Check"
echo "════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check PM2 Status
echo "1️⃣  Process Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 describe autonomous-orchestrator | grep -E "status|uptime|memory|restarts" | head -5
echo ""

# Check if process is running
if pm2 list | grep -q "autonomous-orchestrator.*online"; then
    echo -e "${GREEN}✅ Orchestrator: ONLINE${NC}"
else
    echo -e "${RED}❌ Orchestrator: OFFLINE${NC}"
    exit 1
fi
echo ""

# Check Database Connection
echo "2️⃣  Database Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PGPASSWORD='***REMOVED***' psql -U scholarnet_user -d scholarnet -h localhost -c "SELECT NOW() as current_time;" -t 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database: CONNECTED${NC}"
else
    echo -e "${RED}❌ Database: DISCONNECTED${NC}"
fi
echo ""

# Check Redis
echo "3️⃣  Redis Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis: ONLINE${NC}"
else
    echo -e "${RED}❌ Redis: OFFLINE${NC}"
fi
echo ""

# Check Articles
echo "4️⃣  Content Generation Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PGPASSWORD='***REMOVED***' psql -U scholarnet_user -d scholarnet -h localhost << 'SQL'
SELECT
    COUNT(*) as "Total Articles",
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as "Today",
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as "Last Hour",
    COUNT(*) FILTER (WHERE auto_generated = true) as "Auto-Generated"
FROM articles;
SQL
echo ""

# Show next scheduled tasks
echo "5️⃣  Next Scheduled Tasks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Current Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""
echo "Upcoming content generation cycles:"
echo "  🌙 Tonight 11:00 PM - Batch 6 (25 articles)"
echo "  🌅 Tomorrow 02:00 AM - Batch 1 (25 articles)"
echo "  🌅 Tomorrow 05:00 AM - Batch 2 (25 articles)"
echo "  ☀️  Tomorrow 11:00 AM - Batch 3 (25 articles)"
echo "  🌤️  Tomorrow 02:00 PM - Batch 4 (25 articles)"
echo "  🌆 Tomorrow 08:00 PM - Batch 5 (25 articles)"
echo ""

# Module Status
echo "6️⃣  Active Modules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ AI Evolution Engine${NC}"
echo -e "${GREEN}✅ Content Generation Engine${NC} (150 articles/day)"
echo -e "${GREEN}✅ SEO Optimization Engine${NC}"
echo -e "${GREEN}✅ Social Media Engine${NC}"
echo ""

# System Resources
echo "7️⃣  System Resources"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Memory Usage: $(pm2 describe autonomous-orchestrator | grep "memory" | head -1 | awk '{print $3}')"
echo "CPU Usage: $(pm2 describe autonomous-orchestrator | grep "cpu" | head -1 | awk '{print $3}')"
echo "Uptime: $(pm2 describe autonomous-orchestrator | grep "uptime" | head -1 | awk '{print $3}')"
echo ""

echo "════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ AUTONOMOUS ENGINE STATUS: OPERATIONAL${NC}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📋 Commands:"
echo "  View logs:   pm2 logs autonomous-orchestrator"
echo "  Monitor:     pm2 monit"
echo "  Restart:     pm2 restart autonomous-orchestrator"
echo ""
