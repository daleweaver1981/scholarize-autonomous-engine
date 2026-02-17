/**
 * SEO Configuration
 * Defines SEO targets, strategies, and optimization parameters
 */

export const SEO_CONFIG = {
  // Target domain
  domain: 'scholarnet.com',
  targetCountry: 'US',
  targetLanguage: 'en',

  // Keyword research parameters
  keywordResearch: {
    minSearchVolume: 100,
    maxSearchVolume: 100000,
    maxKeywordDifficulty: 60,
    minCPC: 0.50, // Minimum cost-per-click (indicates commercial value)
    targetKeywordsPerMonth: 500,

    // Keyword intent preferences
    intentPreferences: {
      informational: 0.60, // 60% informational
      commercial: 0.25,    // 25% commercial
      transactional: 0.10, // 10% transactional
      navigational: 0.05   // 5% navigational
    }
  },

  // On-page optimization targets
  onPage: {
    titleLength: { min: 30, max: 60, optimal: 55 },
    metaDescLength: { min: 120, max: 160, optimal: 155 },
    urlLength: { max: 75 },

    keywordDensity: {
      primary: { min: 1.0, max: 2.5, optimal: 1.5 }, // percentage
      secondary: { min: 0.5, max: 1.5, optimal: 1.0 }
    },

    headingStructure: {
      h1Count: { min: 1, max: 1 },
      h2Count: { min: 3, max: 8 },
      h3Count: { min: 2, max: 12 }
    },

    contentStructure: {
      minWordCount: 800,
      optimalWordCount: 1500,
      maxWordCount: 3000,
      minParagraphs: 8,
      avgParagraphLength: { min: 40, max: 150 },
      minImages: 2,
      minInternalLinks: 3,
      minExternalLinks: 2
    },

    readability: {
      minFleschScore: 60,
      maxFleschScore: 80,
      optimalGradeLevel: 10
    }
  },

  // Competitor analysis
  competitorAnalysis: {
    maxCompetitors: 10,
    analyzeTopN: 3, // Top 3 results

    metrics: [
      'title_optimization',
      'content_length',
      'keyword_usage',
      'backlink_count',
      'domain_authority',
      'page_speed',
      'mobile_friendly',
      'schema_markup',
      'internal_linking',
      'content_freshness'
    ],

    updateFrequency: 'weekly'
  },

  // Backlink strategy
  backlinkBuilding: {
    targetBacklinksPerMonth: 50,
    minDomainAuthority: 20,
    maxDomainAuthority: 70,

    linkTypes: {
      guestPosts: 0.30,        // 30%
      resourcePages: 0.20,     // 20%
      brokenLinkBuilding: 0.15, // 15%
      contentPromotion: 0.20,   // 20%
      directorySubmissions: 0.15 // 15%
    },

    anchorTextDistribution: {
      exact: 0.05,       // 5% exact match
      partial: 0.20,     // 20% partial match
      branded: 0.30,     // 30% branded
      generic: 0.25,     // 25% generic (click here, etc.)
      naked: 0.20        // 20% naked URLs
    },

    qualityThresholds: {
      minDA: 20,
      minTraffic: 1000,
      maxSpamScore: 5,
      requiresRelevance: true
    }
  },

  // Rank tracking
  rankTracking: {
    checkFrequency: 'daily',
    trackTopN: 100, // Track top 100 positions

    locations: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia'
    ],

    devices: ['desktop', 'mobile'],

    alertThresholds: {
      positionDrop: 10,     // Alert if drops 10+ positions
      positionGain: 5,      // Celebrate if gains 5+ positions
      outOfTop100: true     // Alert if drops out of top 100
    }
  },

  // Technical SEO
  technicalSEO: {
    sitemapGeneration: true,
    robotsTxtOptimization: true,
    canonicalTags: true,
    schemaMarkup: ['Article', 'BreadcrumbList', 'Organization'],

    performance: {
      targetPageSpeed: 90,
      targetLCP: 2500,      // Largest Contentful Paint (ms)
      targetFID: 100,       // First Input Delay (ms)
      targetCLS: 0.1        // Cumulative Layout Shift
    },

    crawlability: {
      maxCrawlDepth: 3,
      internalLinksPerPage: { min: 3, max: 10 }
    }
  },

  // Content optimization priorities
  contentPriorities: [
    'keyword_optimization',
    'content_quality',
    'user_intent_match',
    'readability',
    'multimedia_inclusion',
    'internal_linking',
    'external_citations',
    'freshness',
    'engagement_signals'
  ],

  // SEO scoring weights
  scoringWeights: {
    onPage: 0.30,
    contentQuality: 0.25,
    backlinks: 0.20,
    technicalSEO: 0.15,
    userExperience: 0.10
  }
};

// Top SEO tools and APIs (for integration)
export const SEO_TOOLS = {
  keywordResearch: [
    'Google Keyword Planner',
    'Ahrefs Keywords Explorer',
    'SEMrush Keyword Magic Tool',
    'Moz Keyword Explorer',
    'Ubersuggest'
  ],

  competitorAnalysis: [
    'Ahrefs Site Explorer',
    'SEMrush Domain Analytics',
    'Moz Link Explorer',
    'SpyFu',
    'SimilarWeb'
  ],

  rankTracking: [
    'Google Search Console',
    'Ahrefs Rank Tracker',
    'SEMrush Position Tracking',
    'AccuRanker',
    'SERPWatcher'
  ],

  backlinkAnalysis: [
    'Ahrefs Backlink Checker',
    'Moz Link Explorer',
    'Majestic SEO',
    'SEMrush Backlink Analytics'
  ]
};

// Common SEO keywords for scholarly content
export const SCHOLARLY_KEYWORDS = {
  modifiers: [
    'research',
    'study',
    'analysis',
    'review',
    'guide',
    'overview',
    'introduction',
    'understanding',
    'explained',
    'definition',
    '2026',
    'latest',
    'recent',
    'comprehensive',
    'complete',
    'advanced',
    'beginner',
    'expert'
  ],

  questionWords: [
    'what is',
    'how to',
    'why does',
    'when to',
    'where can',
    'which',
    'who',
    'benefits of',
    'advantages of',
    'disadvantages of',
    'comparison',
    'vs',
    'versus',
    'difference between',
    'best practices'
  ],

  academicTerms: [
    'theoretical framework',
    'methodology',
    'findings',
    'implications',
    'literature review',
    'meta-analysis',
    'systematic review',
    'empirical study',
    'case study',
    'longitudinal study',
    'cross-sectional',
    'qualitative',
    'quantitative'
  ]
};

// Geographic targeting
export const GEO_TARGETS = {
  primary: {
    country: 'United States',
    cities: [
      'New York',
      'Los Angeles',
      'Chicago',
      'Houston',
      'Phoenix',
      'Philadelphia',
      'San Antonio',
      'San Diego',
      'Dallas',
      'San Jose'
    ]
  },

  secondary: [
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'India'
  ]
};

// Link building targets
export const LINK_TARGETS = {
  educational: [
    '.edu domains',
    'University websites',
    'Research institutions',
    'Academic journals',
    'Educational blogs'
  ],

  government: [
    '.gov domains',
    'Government agencies',
    'Public institutions',
    'Policy organizations'
  ],

  highAuthority: [
    'Major news outlets',
    'Industry publications',
    'Professional associations',
    'Scientific organizations',
    'Think tanks'
  ],

  niche: [
    'Scholarly blogs',
    'Research directories',
    'Academic forums',
    'Scientific communities',
    'Professional networks'
  ]
};

// Content refresh strategy
export const CONTENT_REFRESH = {
  frequency: 'quarterly',

  triggers: [
    'ranking_drop',      // Article drops 10+ positions
    'traffic_decline',   // Traffic down 30%+ month-over-month
    'outdated_info',     // Content older than 12 months
    'competitor_update', // Competitor published newer content
    'keyword_shift'      // Search trends changed
  ],

  updatePriority: {
    high: [
      'Top 10 ranking articles',
      'High traffic pages',
      'Conversion pages'
    ],
    medium: [
      'Position 11-30 articles',
      'Medium traffic pages'
    ],
    low: [
      'Position 30+ articles',
      'Low traffic pages'
    ]
  },

  updateActions: [
    'Update statistics and data',
    'Add new research findings',
    'Expand content (+500 words)',
    'Update title and meta',
    'Add new images/media',
    'Improve internal linking',
    'Refresh publication date',
    'Add FAQ section',
    'Improve mobile experience'
  ]
};

export default SEO_CONFIG;
