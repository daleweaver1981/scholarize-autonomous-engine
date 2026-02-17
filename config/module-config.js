/**
 * Module Configuration
 */

export const MODULE_CONFIG = {
  content: {
    enabled: true,
    articlesPerCycle: 25,
    totalCycles: 6,
    dailyTarget: 150,
    concurrentLimit: 5,
    qualityThreshold: 60,
    retryAttempts: 3,
    retryDelay: 5000,
  },
  seo: {
    enabled: true,
    competitor: {
      enabled: true,
      competitors: ['studysmarter.com', 'quizlet.com', 'coursera.org', 'khanacademy.org', 'chegg.com'],
      analysisDepth: 'comprehensive',
    },
    optimization: {
      enabled: true,
      pagesPerRun: 10,
      minTimeSinceLastOptimization: 7,
      priorityScore: 50,
    },
    ranking: {
      enabled: true,
      fullTrackingEnabled: true,
      quickCheckEnabled: true,
      quickCheckLimit: 50,
      gscIntegration: true,
    },
    backlinks: {
      enabled: true,
      prospectsPerWeek: 20,
      outreachEnabled: false,
      auditEnabled: true,
    },
  },
  social: {
    enabled: true,
    platforms: ['twitter', 'reddit', 'linkedin', 'facebook'],
    postsPerCycle: 1,
    contentSelection: {
      recentHours: 24,
      minSeoScore: 70,
      diversityEnabled: true,
    },
    scheduling: {
      slots: ['morning', 'afternoon', 'evening'],
      timezone: 'America/Los_Angeles',
    },
  },
  analytics: {
    enabled: true,
    dailyReport: {
      enabled: true,
      deliveryTime: '09:00',
      recipients: ['admin@scholar.0xpi.com'],
      slackEnabled: false,
    },
    metrics: {
      seo: true,
      content: true,
      social: true,
      traffic: true,
      revenue: true,
    },
  },
  codeQuality: {
    enabled: true,
    scanning: {
      enabled: true,
      frequency: 'weekly',
      paths: ['/opt/scholarnet-ai/backend', '/opt/scholarnet-ai/frontend/src', '/opt/scholarnet-autonomous-engine'],
      exclude: ['node_modules', 'dist', 'build', '.git'],
    },
    improvements: {
      enabled: true,
      maxPRsPerWeek: 1,
      requireApproval: true,
      testRequired: true,
    },
    aiEvolution: {
      enabled: true,
      checkFrequency: 'weekly',
      autoUpgrade: false,
      performanceTracking: true,
      competitorMonitoring: true,
    },
    security: {
      enabled: true,
      scanFrequency: 'daily',
      criticalAlerts: true,
    },
  },
  health: {
    enabled: true,
    checkInterval: 300,
    alerts: {
      email: true,
      slack: false,
      threshold: {
        cpu: 80,
        memory: 85,
        disk: 90,
      },
    },
  },
};

export default MODULE_CONFIG;
