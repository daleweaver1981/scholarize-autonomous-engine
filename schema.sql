-- ScholarNet Autonomous Engine Database Schema

-- Backups table
CREATE TABLE IF NOT EXISTS backups (
  id VARCHAR(255) PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Autonomous reports
CREATE TABLE IF NOT EXISTS autonomous_reports (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Request logs for monitoring
CREATE TABLE IF NOT EXISTS request_logs (
  id SERIAL PRIMARY KEY,
  method VARCHAR(10),
  path VARCHAR(500),
  status_code INTEGER,
  response_time INTEGER,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status_code);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(255) PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI learnings
CREATE TABLE IF NOT EXISTS ai_learnings (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  opportunity JSONB,
  insights JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id SERIAL PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost DECIMAL(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_service ON api_usage(service);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at);

-- View for daily API costs
CREATE OR REPLACE VIEW daily_api_costs AS
SELECT 
  DATE(created_at) as date,
  service,
  SUM(tokens_input) as total_input_tokens,
  SUM(tokens_output) as total_output_tokens,
  SUM(tokens_input + tokens_output) as total_tokens,
  SUM(cost) as total_cost,
  COUNT(*) as request_count
FROM api_usage
GROUP BY DATE(created_at), service
ORDER BY date DESC;
