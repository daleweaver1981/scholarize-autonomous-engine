#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║        Quick Production Deployment (Standalone)          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Stop any existing instance
pm2 delete scholarnet-orchestrator 2>/dev/null || true
pm2 delete autonomous-orchestrator 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.production .env 2>/dev/null || cat > .env << 'EOF'
NODE_ENV=production
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
DRY_RUN_MODE=false
AUTO_PUBLISH=false
LOG_LEVEL=info
EOF
fi

echo ""
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.cjs

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

pm2 status

echo ""
echo "📋 Commands:"
echo "  View logs:   pm2 logs autonomous-orchestrator"
echo "  Monitor:     pm2 monit"
echo "  Restart:     pm2 restart autonomous-orchestrator"
echo "  Stop:        pm2 stop autonomous-orchestrator"
echo ""
echo "🎉 Your autonomous engine is running!"
echo ""

