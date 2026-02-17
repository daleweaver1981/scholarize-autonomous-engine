/**
 * Social Media Configuration
 * Defines posting strategies, engagement rules, and platform settings
 */

export const SOCIAL_CONFIG = {
  // Posting schedule (3x daily)
  postingSchedule: {
    morning: '08:00',    // 8 AM - Peak engagement
    afternoon: '14:00',  // 2 PM - Lunch break
    evening: '20:00'     // 8 PM - After work
  },

  // Daily posting limits per platform
  dailyLimits: {
    twitter: 15,      // Twitter allows frequent posting
    linkedin: 3,      // LinkedIn prefers quality over quantity
    reddit: 5,        // Reddit is sensitive to spam
    facebook: 3,      // Facebook similar to LinkedIn
    instagram: 2      // Instagram focuses on visuals
  },

  // Platform-specific settings
  platforms: {
    twitter: {
      enabled: true,
      maxLength: 280,
      hashtagLimit: 3,
      threadingEnabled: true,
      maxThreadLength: 10,
      imageRequired: false,

      contentStyle: {
        tone: 'informative and engaging',
        emoji: true,
        questions: true,
        callsToAction: ['Read more', 'Learn more', 'Discover', 'Explore']
      },

      bestTimes: ['08:00', '12:00', '17:00', '20:00'],

      engagement: {
        autoReply: true,
        autoLike: false,  // Be conservative
        autoRetweet: false,
        autoFollow: false
      }
    },

    linkedin: {
      enabled: true,
      maxLength: 3000,
      hashtagLimit: 5,
      imageRequired: true,

      contentStyle: {
        tone: 'professional and authoritative',
        emoji: false,
        questions: true,
        callsToAction: ['Read the full article', 'Learn more', 'Discover insights']
      },

      bestTimes: ['07:00', '12:00', '17:00'],

      engagement: {
        autoReply: true,
        autoLike: false,
        autoComment: false,
        autoConnect: false
      }
    },

    reddit: {
      enabled: true,
      maxTitleLength: 300,

      contentStyle: {
        tone: 'casual and informative',
        emoji: false,
        questions: true,
        clickbait: false  // Reddit hates clickbait
      },

      targetSubreddits: [
        'science',
        'technology',
        'askscience',
        'education',
        'academicphilosophy',
        'scholar',
        'research',
        'artificial'
      ],

      bestTimes: ['09:00', '14:00', '21:00'],

      engagement: {
        autoReply: true,
        autoUpvote: false,  // Never vote manipulate
        autoComment: false
      },

      rules: {
        minAccountAge: 30,      // Days
        minKarma: 100,
        checkSubredditRules: true,
        respectRateLimits: true,
        noSelfPromotion: true
      }
    },

    facebook: {
      enabled: false,  // Requires page setup
      maxLength: 63206,
      imageRequired: true,

      contentStyle: {
        tone: 'conversational',
        emoji: true,
        questions: true
      },

      bestTimes: ['13:00', '15:00', '19:00']
    }
  },

  // Content adaptation rules
  contentAdaptation: {
    // Extract key points from articles
    summaryLength: {
      twitter: 240,      // Leave room for link and hashtags
      linkedin: 800,     // Longer form acceptable
      reddit: 500,       // Varies by subreddit
      facebook: 500
    },

    // Hashtag strategy
    hashtags: {
      enabled: true,
      maxPerPost: 5,
      placement: 'end',  // 'inline' or 'end'

      categories: {
        science: ['#Science', '#Research', '#STEM', '#Innovation', '#Discovery'],
        technology: ['#Technology', '#Tech', '#AI', '#Innovation', '#Future'],
        health: ['#Health', '#Medicine', '#Wellness', '#Healthcare', '#Science'],
        education: ['#Education', '#Learning', '#EdTech', '#Teaching', '#Knowledge'],
        environment: ['#Environment', '#Climate', '#Sustainability', '#Green', '#Nature'],
        social: ['#Society', '#Culture', '#Research', '#Analysis', '#Insights']
      }
    },

    // Link handling
    links: {
      shorten: false,      // Use full URLs for trust
      tracking: true,       // Add UTM parameters
      placement: 'end'      // Where to place links
    },

    // Image strategy
    images: {
      required: true,
      preferredSize: { width: 1200, height: 630 },
      formats: ['jpg', 'png'],
      fallback: 'stock-image-library'
    }
  },

  // Engagement automation
  engagement: {
    // Auto-reply settings
    autoReply: {
      enabled: true,
      replyDelay: { min: 300, max: 1800 },  // 5-30 minutes (human-like)

      triggers: {
        questions: true,       // Reply to questions
        mentions: true,        // Reply to mentions
        comments: true,        // Reply to comments
        directMessages: false  // Don't auto-reply to DMs
      },

      tone: 'helpful and professional',
      maxRepliesPerPost: 5,

      avoidTopics: [
        'politics',
        'religion',
        'controversial',
        'personal attacks'
      ]
    },

    // Engagement actions
    actions: {
      like: {
        enabled: false,  // Be conservative
        relatedContent: true,
        userContent: false
      },

      share: {
        enabled: false,  // Manual curation recommended
        threshold: 0.9   // Only share excellent content
      },

      follow: {
        enabled: false,  // Build audience organically
        followBack: true
      }
    },

    // Response templates
    responseTemplates: {
      thanks: [
        "Thank you for your interest! {personalization}",
        "Glad you found it helpful! {personalization}",
        "Appreciate your comment! {personalization}"
      ],

      question: [
        "Great question! {answer} For more details, check out: {link}",
        "Thanks for asking! {answer} Read more at: {link}",
        "{answer} You might also find this interesting: {link}"
      ],

      feedback: [
        "Thank you for the feedback! We appreciate your perspective.",
        "Thanks for sharing your thoughts!",
        "We value your input!"
      ]
    }
  },

  // Content promotion strategy
  promotion: {
    // New article promotion
    newArticle: {
      postsPerArticle: 3,     // Post 3 times across platforms
      spacingHours: 8,        // Space posts 8 hours apart
      platforms: ['twitter', 'linkedin', 'reddit'],
      varyContent: true       // Use different angles/hooks
    },

    // Evergreen content recycling
    evergreen: {
      enabled: true,
      recycleAfterDays: 30,
      maxRecycles: 3,
      platforms: ['twitter', 'linkedin']
    },

    // Trending topic leverage
    trending: {
      enabled: true,
      monitorTopics: true,
      quickResponse: true,
      maxHoursSincePublish: 24  // Only promote recent relevant articles
    }
  },

  // Analytics tracking
  analytics: {
    trackMetrics: [
      'impressions',
      'engagements',
      'clicks',
      'shares',
      'comments',
      'likes',
      'followers_gained',
      'reach',
      'engagement_rate'
    ],

    goals: {
      dailyImpressions: 10000,
      dailyClicks: 500,
      weeklyFollowersGained: 100,
      engagementRate: 2.0  // 2%
    },

    reporting: {
      frequency: 'daily',
      includeInsights: true,
      comparePrevious: true
    }
  },

  // Audience building
  audienceBuilding: {
    targetAudience: {
      interests: [
        'science',
        'technology',
        'research',
        'education',
        'innovation',
        'academic',
        'scholarly',
        'STEM'
      ],

      demographics: {
        ageRange: [25, 65],
        education: ['college', 'graduate'],
        professions: ['researcher', 'educator', 'student', 'professional']
      }
    },

    growthStrategy: {
      contentQuality: 'high',
      postingConsistency: 'daily',
      engagement: 'active',
      networking: 'strategic'
    },

    milestones: {
      month1: 500,
      month3: 2000,
      month6: 5000,
      month12: 15000
    }
  },

  // Safety and compliance
  safety: {
    // Rate limiting (avoid platform bans)
    rateLimits: {
      postsPerHour: 3,
      postsPerDay: 20,
      repliesPerHour: 10,
      actionsPerHour: 30
    },

    // Content moderation
    moderation: {
      enabled: true,
      checkForSpam: true,
      checkForToxicity: true,
      humanReview: true  // Sensitive posts need human approval
    },

    // Compliance
    compliance: {
      respectPlatformRules: true,
      noAutomationDisclosure: false,  // Don't advertise automation
      respondToReports: true,
      maintainAccountHealth: true
    }
  },

  // UTM parameters for tracking
  utm: {
    source: 'social',
    medium: {
      twitter: 'twitter',
      linkedin: 'linkedin',
      reddit: 'reddit',
      facebook: 'facebook'
    },
    campaign: 'organic_social',
    content: 'auto'  // Will be set per post
  }
};

// Platform-specific best practices
export const BEST_PRACTICES = {
  twitter: [
    'Use 1-3 relevant hashtags',
    'Include an engaging hook',
    'Add visual content when possible',
    'Post during peak hours',
    'Use threads for longer content',
    'Engage with replies quickly',
    'Vary content format (stats, quotes, questions)',
    'Retweet relevant content from others'
  ],

  linkedin: [
    'Start with a strong hook',
    'Use line breaks for readability',
    'Include relevant hashtags (3-5)',
    'Tag relevant people/companies',
    'Add compelling visuals',
    'Post during work hours',
    'Share insights, not just links',
    'Engage with commenters professionally'
  ],

  reddit: [
    'Read and follow subreddit rules',
    'Provide value, not just links',
    'Be authentic and transparent',
    'Engage in comments',
    'Don\'t be overly promotional',
    'Build karma before posting links',
    'Use appropriate flair',
    'Time posts for maximum visibility'
  ],

  facebook: [
    'Use engaging visuals',
    'Keep text concise',
    'Ask questions to encourage engagement',
    'Post when audience is active',
    'Use Facebook Stories',
    'Respond to comments',
    'Create events for special content',
    'Use Facebook Live sparingly'
  ]
};

// Content hooks and templates
export const CONTENT_HOOKS = {
  statistics: [
    "New research shows that {stat}...",
    "Did you know? {stat}",
    "Surprising finding: {stat}",
    "{stat} - Here's what it means..."
  ],

  questions: [
    "What if {question}?",
    "Have you ever wondered {question}?",
    "Why does {question}?",
    "How can {question}?"
  ],

  insights: [
    "Key insight: {insight}",
    "Here's what most people miss about {topic}:",
    "The truth about {topic}:",
    "What you need to know about {topic}:"
  ],

  trends: [
    "{topic} is changing rapidly. Here's what's new:",
    "The latest in {topic} research:",
    "Breaking down recent advances in {topic}:",
    "What's trending in {topic}:"
  ]
};

export default SOCIAL_CONFIG;
