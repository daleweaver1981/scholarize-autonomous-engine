# 🛡️ Safe Autonomous Engine - Setup Guide

## 🚨 What Happened Tonight

The autonomous engine deployed AI-generated code directly to production with **ALL safety checks bypassed**. This caused multiple file breakages because:

1. ❌ **No validation** - Code wasn't checked for syntax errors
2. ❌ **No staging** - Went straight to production
3. ❌ **No approval** - No human review
4. ❌ **No testing** - No verification it works
5. ❌ **Poor rollback** - Backups to /tmp (lost on reboot)
6. ❌ **Safety bypass active** - Lines 42-45 in `autonomous-implementer-v2.js` always return `true`

---

## ✅ The New Safe System

We've implemented **9 layers of safety**:

### 1. **Proper Safety Checks** (canDeploy)
- ✅ Daily deployment limit (default: 1/day)
- ✅ Deployment window enforcement (2-6 AM Pacific)
- ✅ Traffic threshold (<15% of peak)
- ✅ Backend health check
- ✅ No recent failures

### 2. **Code Validation**
- ✅ Syntax checking
- ✅ Import validation
- ✅ Dangerous pattern detection (eval, dangerouslySetInnerHTML)
- ✅ Hardcoded secret detection
- ✅ File size limits

### 3. **Staging Environment**
- ✅ All changes test in staging first
- ✅ Automatic staging tests
- ✅ Isolated from production

### 4. **Human Approval System**
- ✅ Low-risk changes: auto-approved
- ✅ High-risk changes: require approval
- ✅ Admin dashboard UI
- ✅ 1-hour approval window

### 5. **Git Integration**
- ✅ Every deployment is a git commit
- ✅ Full change tracking
- ✅ Easy rollback with `git reset`
- ✅ Commit messages include details

### 6. **Incremental Rollout**
- ✅ Deploy to 10% of traffic first
- ✅ Monitor error rates
- ✅ Gradually increase to 50%, then 100%
- ✅ Auto-rollback if errors spike

### 7. **Better Health Checks**
- ✅ Check PM2 status
- ✅ Test actual HTTP endpoints
- ✅ Multiple checks over time
- ✅ 3-failure threshold

### 8. **Proper Backups**
- ✅ Git commits (not /tmp)
- ✅ Can rollback to any commit
- ✅ Persistent across reboots

### 9. **Emergency Alerts**
- ✅ Redis alerts for critical failures
- ✅ Detailed error logging
- ✅ Rollback failure detection

---

## 🔧 Installation Steps

### Step 1: Update the Main Engine

Edit `/opt/scholarnet-autonomous-engine/autonomous-engine-safe.js`:

**Change line 7 from:**
```javascript
import WorkingAutonomousImplementer from './autonomous-implementer-v2.js';
```

**To:**
```javascript
import SafeAutonomousImplementer from './autonomous-implementer-safe.js';
```

**And update line 14:**
```javascript
// Old
this.implementer = new WorkingAutonomousImplementer();

// New
this.implementer = new SafeAutonomousImplementer();
```

### Step 2: Configure Environment Variables

Edit `/opt/scholarnet-autonomous-engine/.env.production`:

```bash
# Safety Configuration
REQUIRE_APPROVAL=true          # Require human approval for high-risk changes
STAGING_ENABLED=true           # Test in staging before production
INCREMENTAL_ROLLOUT=true       # Gradual rollout (10% → 50% → 100%)
MAX_DAILY_DEPLOYMENTS=1        # Maximum deployments per day

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scholarnet
DB_USER=scholarnet_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API Keys
ANTHROPIC_API_KEY=your_key_here
```

### Step 3: Create Database Table

Run this SQL to create the deployments table:

```sql
CREATE TABLE IF NOT EXISTS autonomous_deployments (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(100) UNIQUE NOT NULL,
  opportunity JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,
  git_commit VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deployments_status ON autonomous_deployments(status);
CREATE INDEX idx_deployments_created ON autonomous_deployments(created_at DESC);
```

### Step 4: Set Up Staging Environment

```bash
# Create staging directory
sudo mkdir -p /opt/scholarnet-ai-staging

# Copy production to staging
sudo rsync -a /opt/scholarnet-ai/ /opt/scholarnet-ai-staging/

# Set permissions
sudo chown -R aiadmin:aiadmin /opt/scholarnet-ai-staging
```

### Step 5: Set Up Git in Production

```bash
cd /opt/scholarnet-ai

# Initialize git if not already
git init
git config user.email "autonomous@scholarnet.ai"
git config user.name "Autonomous Engine"

# Create initial commit
git add .
git commit -m "Initial commit before autonomous deployments"
```

### Step 6: Add Admin Routes

Edit `/opt/scholarnet-ai/backend/server.js` and add:

```javascript
const autonomousApprovals = require('./routes/autonomousApprovals');

// Add to your routes section
app.use('/api/admin/autonomous', adminProtectedRoute, autonomousApprovals);
```

### Step 7: Add to Admin Navigation

Edit your admin navigation to include:

```jsx
<Link to="/admin/autonomous-approvals">
  Autonomous Approvals
</Link>
```

And add the route in your router:

```jsx
<Route path="/admin/autonomous-approvals" element={<AutonomousApprovals />} />
```

---

## 🧪 Testing the Safe System

### Test 1: Safety Checks

```bash
cd /opt/scholarnet-autonomous-engine

# Should FAIL all checks (outside window, etc)
node -e "
import SafeAutonomousImplementer from './autonomous-implementer-safe.js';
const impl = new SafeAutonomousImplementer();
impl.canDeploy().then(result => {
  console.log('Safety check result:', result);
  process.exit(0);
});
"
```

### Test 2: Code Validation

```bash
# Test code validation
node -e "
import SafeAutonomousImplementer from './autonomous-implementer-safe.js';
const impl = new SafeAutonomousImplementer();

const testFiles = [{
  path: '/test.js',
  content: 'eval(\"dangerous\");' // Should FAIL
}];

impl.validateCode(testFiles).then(result => {
  console.log('Validation result:', result);
  process.exit(0);
});
"
```

### Test 3: Approval Flow

1. Go to `http://scholar.0xpi.com/admin/autonomous-approvals`
2. Should see empty pending approvals
3. Trigger a deployment (it will wait for approval)
4. Approval request should appear
5. Review and approve/reject

---

## ⚠️ Emergency Procedures

### If Deployment Breaks Production

**1. Immediate Rollback:**
```bash
cd /opt/scholarnet-ai

# See recent commits
git log --oneline -10

# Rollback to last good commit
git reset --hard <commit-hash>

# Restart backend
pm2 restart scholarnet-backend
```

**2. Check What Changed:**
```bash
# See what was in the bad commit
git show <bad-commit-hash>

# Compare with current
git diff <bad-commit-hash> HEAD
```

**3. Check Logs:**
```bash
# Backend logs
pm2 logs scholarnet-backend

# Autonomous engine logs
tail -f /opt/scholarnet-autonomous-engine/logs/*.log

# Check Redis for alerts
redis-cli GET autonomous:emergency_alert
```

### If Rollback Fails

```bash
# Nuclear option: restore from backup
cd /opt/scholarnet-ai
git reflog  # Find the commit before changes
git reset --hard <reflog-hash>
pm2 restart scholarnet-backend
```

---

## 📊 Monitoring & Logs

### Check Deployment Status

```bash
# Check Redis for today's deployments
redis-cli GET "autonomous:deployments:$(date +%Y-%m-%d)"

# Check for failed deployments
redis-cli GET autonomous:last_failed_deployment

# Check traffic percentage (if incremental rollout active)
redis-cli GET autonomous:traffic_percentage
```

### View Logs

```bash
# Autonomous engine logs
tail -f /opt/scholarnet-autonomous-engine/logs/*.log

# Backend logs
pm2 logs scholarnet-backend --lines 100

# Error logs specifically
pm2 logs scholarnet-backend --err
```

### Database Queries

```sql
-- Recent deployments
SELECT * FROM autonomous_deployments
ORDER BY created_at DESC LIMIT 10;

-- Failed deployments
SELECT * FROM autonomous_deployments
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Success rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM autonomous_deployments
GROUP BY status;
```

---

## 🔒 Security Best Practices

### 1. Keep Approval Enabled
```bash
# In .env.production
REQUIRE_APPROVAL=true  # Always keep this ON
```

### 2. Restrict Deployment Windows
Only deploy during low-traffic hours:
```javascript
deploymentWindows: [
  { start: 10, end: 14, label: 'Late Night Pacific (2 AM - 6 AM UTC)' }
]
```

### 3. Monitor Daily
- Check approval dashboard daily
- Review deployment logs
- Watch for unusual patterns

### 4. Regular Backups
```bash
# Backup git repository daily
cd /opt/scholarnet-ai
tar -czf ../backups/scholarnet-$(date +%Y%m%d).tar.gz .git

# Keep last 30 days
find ../backups -name "scholarnet-*.tar.gz" -mtime +30 -delete
```

---

## 🎯 Risk Levels Explained

### LOW RISK (Auto-Approved)
- ✅ New component files only
- ✅ No backend changes
- ✅ No route/model modifications
- ✅ Pure frontend UI components

### MEDIUM RISK (Requires Approval)
- ⚠️ Backend changes (non-critical)
- ⚠️ Existing component modifications
- ⚠️ New backend routes (non-auth)

### HIGH RISK (Requires Approval + Extra Review)
- 🚨 Database model changes
- 🚨 Authentication/authorization changes
- 🚨 Payment processing changes
- 🚨 External API integrations

---

## 📞 Support & Issues

If you encounter issues:

1. **Check logs first** (see Monitoring section)
2. **Review recent deployments** in database
3. **Check Redis alerts** for emergency info
4. **Rollback if needed** (see Emergency Procedures)
5. **Disable autonomous engine** if repeated issues:
   ```bash
   pm2 stop autonomous-engine
   ```

---

## ✅ Verification Checklist

Before enabling autonomous deployments:

- [ ] Git initialized in production (`/opt/scholarnet-ai/.git exists`)
- [ ] Staging environment created (`/opt/scholarnet-ai-staging`)
- [ ] Database table created (`autonomous_deployments`)
- [ ] Environment variables configured (`.env.production`)
- [ ] Admin approval route added (`/api/admin/autonomous`)
- [ ] Admin UI accessible (`/admin/autonomous-approvals`)
- [ ] Safety checks enabled (`REQUIRE_APPROVAL=true`)
- [ ] Tested rollback procedure
- [ ] Monitoring tools configured

---

## 🎉 You're Ready!

The autonomous engine is now **safe to use** with:
- ✅ 9 layers of protection
- ✅ Human approval for risky changes
- ✅ Staging environment testing
- ✅ Git-based rollback
- ✅ Incremental rollout
- ✅ Comprehensive monitoring

**Remember:** The engine can still break things if approved incorrectly. Always review changes carefully in the approval dashboard!
