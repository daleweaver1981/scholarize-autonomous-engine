module.exports = {
  apps: [{
    name: 'autonomous-orchestrator',
    script: './master-orchestrator.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      AI_EVOLUTION_ENABLED: 'true'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    cron_restart: '0 0 * * *',
    kill_timeout: 15000,
    listen_timeout: 3000,
    shutdown_with_message: true
  }]
};
