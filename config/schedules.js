/**
 * Cron Schedule Configuration
 * All times in server timezone (America/Los_Angeles)
 */

export const SCHEDULES = {
  // ==================== CONTENT GENERATION ====================
  // Target: 100 articles/day (4 cycles × 25 articles) - FREE TIER MODE
  'content-2am': '0 2 * * *',          // ACTIVE - Cycle 1 (25 articles)
  // 'content-5am': '0 5 * * *',      // DISABLED
  'content-11am': '0 11 * * *',        // ACTIVE - Cycle 2 (25 articles)
  // 'content-2pm': '0 14 * * *',     // DISABLED
  'content-8pm': '0 20 * * *',         // ACTIVE - Cycle 3 (25 articles)
  'content-11pm': '0 23 * * *',        // ACTIVE - Cycle 4 (25 articles)

  // ==================== SEO OPERATIONS ====================
  'seo-competitor': '0 1 * * *',
  'seo-optimize-morning': '0 3 * * *',
  'seo-optimize-afternoon': '0 15 * * *',
  'seo-ranking-full': '0 6 * * *',
  'seo-ranking-quick': '0 */4 * * *',
  'seo-backlink-build': '0 4 * * 1',
  'seo-backlink-audit': '0 5 * * 5',

  // ==================== SOCIAL MEDIA ====================
  'social-morning': '30 3 * * *',
  'social-afternoon': '30 15 * * *',
  'social-evening': '30 21 * * *',

  // ==================== ANALYTICS & REPORTING ====================
  'analytics-daily': '0 9 * * *',

  // ==================== CODE QUALITY & IMPROVEMENT ====================
  'code-scan': '0 2 * * 0',
  'code-dependencies': '0 3 * * *',
  'code-security': '0 4 * * *',

  // ==================== AI EVOLUTION ====================
  'ai-evolution-check': '0 1 * * 1',
  'ai-performance-analysis': '0 2 * * 1',

  // ==================== HEALTH & MAINTENANCE ====================
  'health-check': '*/5 * * * *',
  'cleanup-logs': '0 0 * * *',
};

export const SCHEDULE_META = {
  // ACTIVE - 100 articles/day with FREE APIs (4 cycles × 25 articles)
  'content-2am': { module: 'content', action: 'generateBatch', params: { cycle: '2am', count: 25 }, priority: 'high', timeout: 3600000 },
  // 'content-5am': { module: 'content', action: 'generateBatch', params: { cycle: '5am', count: 25 }, priority: 'high', timeout: 3600000 },
  'content-11am': { module: 'content', action: 'generateBatch', params: { cycle: '11am', count: 25 }, priority: 'high', timeout: 3600000 },
  // 'content-2pm': { module: 'content', action: 'generateBatch', params: { cycle: '2pm', count: 25 }, priority: 'high', timeout: 3600000 },
  'content-8pm': { module: 'content', action: 'generateBatch', params: { cycle: '8pm', count: 25 }, priority: 'high', timeout: 3600000 },
  'content-11pm': { module: 'content', action: 'generateBatch', params: { cycle: '11pm', count: 25 }, priority: 'high', timeout: 3600000 },
  'seo-competitor': { module: 'seo', action: 'runCompetitorAnalysis', priority: 'medium', timeout: 1800000 },
  'seo-optimize-morning': { module: 'seo', action: 'runPageOptimization', params: { count: 10 }, priority: 'medium', timeout: 1800000 },
  'seo-optimize-afternoon': { module: 'seo', action: 'runPageOptimization', params: { count: 10 }, priority: 'medium', timeout: 1800000 },
  'seo-ranking-full': { module: 'seo', action: 'runFullRankingTracking', priority: 'high', timeout: 3600000 },
  'seo-ranking-quick': { module: 'seo', action: 'runQuickRankingCheck', params: { limit: 50 }, priority: 'low', timeout: 600000 },
  'seo-backlink-build': { module: 'seo', action: 'runBacklinkBuilding', params: { count: 20 }, priority: 'medium', timeout: 1800000 },
  'seo-backlink-audit': { module: 'seo', action: 'runBacklinkAudit', priority: 'medium', timeout: 1800000 },
  'social-morning': { module: 'social', action: 'postToAllPlatforms', params: { slot: 'morning' }, priority: 'medium', timeout: 900000 },
  'social-afternoon': { module: 'social', action: 'postToAllPlatforms', params: { slot: 'afternoon' }, priority: 'medium', timeout: 900000 },
  'social-evening': { module: 'social', action: 'postToAllPlatforms', params: { slot: 'evening' }, priority: 'medium', timeout: 900000 },
  'analytics-daily': { module: 'analytics', action: 'generateDailyReport', priority: 'high', timeout: 1800000 },
  'code-scan': { module: 'codeQuality', action: 'runWeeklyScan', priority: 'low', timeout: 7200000 },
  'code-dependencies': { module: 'codeQuality', action: 'checkDependencies', priority: 'low', timeout: 900000 },
  'code-security': { module: 'codeQuality', action: 'runSecurityScan', priority: 'medium', timeout: 1800000 },
  'ai-evolution-check': { module: 'codeQuality', action: 'trackAIEvolution', priority: 'medium', timeout: 1800000 },
  'ai-performance-analysis': { module: 'codeQuality', action: 'analyzePerformance', priority: 'low', timeout: 1800000 },
  'health-check': { module: 'health', action: 'checkSystemHealth', priority: 'critical', timeout: 60000 },
  'cleanup-logs': { module: 'maintenance', action: 'cleanupLogs', priority: 'low', timeout: 300000 },
};

export const RATE_LIMITS = {
  maxDailyArticles: 150,
  maxConcurrentContentGen: 5,
  maxDailySocialPosts: 12,
  maxDailyClaudeTokens: 1000000,
  maxDatabaseConnections: 20,
};

export default SCHEDULES;
