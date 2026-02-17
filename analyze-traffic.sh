#!/bin/bash
echo "📊 Analyzing ScholarNet Traffic Patterns"
echo "========================================"
echo ""

psql ***REMOVED*** << 'SQL'

-- Traffic by hour of day (last 30 days)
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as requests,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM request_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

SQL

echo ""
echo "Recommendation: Deploy during hours with <5% traffic"
echo ""
