/**
 * Content Generation Configuration
 * Defines topics, styles, and generation parameters
 */

export const CONTENT_CONFIG = {
  // Daily targets
  dailyArticleTarget: 150,
  articlesPerCycle: 25,
  cyclesPerDay: 6,

  // Article specifications
  minWordCount: 800,
  maxWordCount: 2000,
  targetWordCount: 1200,

  // Quality thresholds
  minReadabilityScore: 60,
  maxPlagiarismScore: 5,
  minCitationCount: 3,
  maxCitationCount: 10,

  // Generation parameters
  temperature: 0.7,
  model: 'claude-sonnet-4-5-20250929',
  maxRetries: 3,
  timeoutMs: 120000, // 2 minutes per article
};

// Scholarly topics and categories
export const TOPICS = {
  science: [
    'Quantum Physics',
    'Neuroscience',
    'Climate Science',
    'Molecular Biology',
    'Astronomy',
    'Genetics',
    'Artificial Intelligence',
    'Renewable Energy',
    'Nanotechnology',
    'Biotechnology'
  ],
  technology: [
    'Machine Learning',
    'Cybersecurity',
    'Blockchain',
    'Internet of Things',
    'Cloud Computing',
    'Quantum Computing',
    'Robotics',
    '5G Networks',
    'Edge Computing',
    'Virtual Reality'
  ],
  health: [
    'Public Health',
    'Medical Research',
    'Nutrition Science',
    'Mental Health',
    'Epidemiology',
    'Preventive Medicine',
    'Healthcare Technology',
    'Pharmacology',
    'Immunology',
    'Sports Medicine'
  ],
  education: [
    'Online Learning',
    'Educational Psychology',
    'STEM Education',
    'Higher Education',
    'Early Childhood Education',
    'Special Education',
    'Educational Technology',
    'Curriculum Development',
    'Learning Assessment',
    'Teacher Training'
  ],
  environment: [
    'Climate Change',
    'Conservation Biology',
    'Sustainable Development',
    'Environmental Policy',
    'Renewable Resources',
    'Pollution Control',
    'Wildlife Protection',
    'Ocean Conservation',
    'Green Technology',
    'Ecosystem Management'
  ],
  social: [
    'Social Psychology',
    'Urban Planning',
    'Economic Development',
    'Cultural Studies',
    'Public Policy',
    'Demographics',
    'Sociology',
    'Political Science',
    'Human Rights',
    'Communication Studies'
  ]
};

// Article structure templates
export const ARTICLE_STRUCTURES = {
  research: {
    sections: [
      { name: 'Introduction', minWords: 150, maxWords: 250 },
      { name: 'Background', minWords: 200, maxWords: 350 },
      { name: 'Current Research', minWords: 300, maxWords: 500 },
      { name: 'Key Findings', minWords: 200, maxWords: 350 },
      { name: 'Implications', minWords: 150, maxWords: 250 },
      { name: 'Conclusion', minWords: 100, maxWords: 150 }
    ]
  },
  review: {
    sections: [
      { name: 'Introduction', minWords: 150, maxWords: 250 },
      { name: 'Literature Review', minWords: 400, maxWords: 600 },
      { name: 'Analysis', minWords: 300, maxWords: 500 },
      { name: 'Discussion', minWords: 200, maxWords: 350 },
      { name: 'Conclusion', minWords: 100, maxWords: 150 }
    ]
  },
  analysis: {
    sections: [
      { name: 'Introduction', minWords: 150, maxWords: 250 },
      { name: 'Methodology', minWords: 200, maxWords: 300 },
      { name: 'Data Analysis', minWords: 350, maxWords: 550 },
      { name: 'Results', minWords: 200, maxWords: 350 },
      { name: 'Discussion', minWords: 150, maxWords: 250 },
      { name: 'Conclusion', minWords: 100, maxWords: 150 }
    ]
  },
  overview: {
    sections: [
      { name: 'Introduction', minWords: 150, maxWords: 250 },
      { name: 'Historical Context', minWords: 200, maxWords: 350 },
      { name: 'Current State', minWords: 300, maxWords: 500 },
      { name: 'Future Directions', minWords: 200, maxWords: 350 },
      { name: 'Conclusion', minWords: 100, maxWords: 150 }
    ]
  }
};

// Writing style guidelines
export const STYLE_GUIDELINES = {
  tone: 'scholarly and objective',
  voice: 'third person',
  perspective: 'academic',
  citationStyle: 'APA',

  requirements: [
    'Use formal academic language',
    'Avoid personal pronouns (I, we, you)',
    'Support claims with citations',
    'Use clear topic sentences',
    'Include transitional phrases',
    'Define technical terms',
    'Maintain objectivity',
    'Use active voice when possible'
  ],

  avoid: [
    'Casual or colloquial language',
    'Unsubstantiated claims',
    'Emotional language',
    'Redundancy',
    'Excessive jargon',
    'Absolute statements without evidence',
    'First-person narrative',
    'Clickbait or sensationalism'
  ]
};

// Quality control parameters
export const QUALITY_CHECKS = {
  plagiarism: {
    enabled: true,
    maxSimilarity: 5, // percentage
    checkSources: ['web', 'academic', 'internal']
  },

  readability: {
    enabled: true,
    minFleschKincaid: 12, // college level
    maxFleschKincaid: 16, // graduate level
    targetFleschKincaid: 14 // undergraduate level
  },

  grammar: {
    enabled: true,
    maxErrors: 3,
    autoFix: true
  },

  factChecking: {
    enabled: true,
    requireCitations: true,
    verifyStats: true,
    checkDates: true
  },

  seo: {
    enabled: true,
    minKeywordDensity: 1.0, // percentage
    maxKeywordDensity: 3.0,
    requireMetaDescription: true,
    minMetaDescLength: 120,
    maxMetaDescLength: 160
  }
};

// Publishing configuration
export const PUBLISHING_CONFIG = {
  autoPublish: false, // Set to true for full automation
  requireReview: true, // Human review before publishing

  platforms: {
    wordpress: {
      enabled: true,
      status: 'draft', // 'draft' or 'publish'
      categories: ['Research', 'Analysis', 'Reviews'],
      tags: 'auto', // Auto-generate from content
      featuredImage: 'auto' // Auto-generate or find
    },

    medium: {
      enabled: false,
      status: 'draft'
    },

    internal: {
      enabled: true,
      database: 'scholarnet_db',
      table: 'articles'
    }
  },

  scheduling: {
    enabled: true,
    publishTimes: [
      '08:00', // 8 AM
      '12:00', // 12 PM
      '16:00', // 4 PM
      '20:00'  // 8 PM
    ],
    timezone: 'America/Los_Angeles'
  }
};

// Research source configuration
export const RESEARCH_SOURCES = {
  academic: [
    'Google Scholar',
    'PubMed',
    'arXiv',
    'JSTOR',
    'IEEE Xplore'
  ],

  news: [
    'Science Daily',
    'Nature News',
    'Scientific American',
    'New Scientist'
  ],

  databases: [
    'Web of Science',
    'Scopus',
    'PubMed Central'
  ],

  maxSourcesPerArticle: 10,
  minSourceAge: 0, // years (0 = any age)
  maxSourceAge: 5, // years (prefer recent)
  preferPeerReviewed: true
};

export default CONTENT_CONFIG;
