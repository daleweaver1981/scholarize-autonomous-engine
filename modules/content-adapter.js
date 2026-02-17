/**
 * Content Adapter
 * Transforms articles into platform-specific social media posts
 */

import Anthropic from '@anthropic-ai/sdk';
import { SOCIAL_CONFIG, CONTENT_HOOKS } from '../config/social-config.js';

export default class ContentAdapter {
  constructor(options = {}) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.dryRun = options.dryRun || false;
    this.logger = options.logger || console;

    // Statistics
    this.stats = {
      postsCreated: 0,
      platformBreakdown: {},
      avgEngagementPrediction: 0
    };
  }

  /**
   * Adapt article to all enabled platforms
   */
  async adaptArticle(article) {
    try {
      this.logger.info(`Adapting article: ${article.title}`);

      const adaptations = {};

      // Adapt for each enabled platform
      for (const [platform, config] of Object.entries(SOCIAL_CONFIG.platforms)) {
        if (config.enabled) {
          adaptations[platform] = await this.adaptToPlatform(article, platform, config);
        }
      }

      return {
        articleId: article.id,
        articleTitle: article.title,
        adaptations: adaptations,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Article adaptation failed:', error);
      throw error;
    }
  }

  /**
   * Adapt article to specific platform
   */
  async adaptToPlatform(article, platform, config) {
    this.logger.info(`  Adapting for ${platform}...`);

    try {
      // Generate platform-specific content
      const posts = await this.generatePosts(article, platform, config);

      // Add metadata
      const adaptation = {
        platform: platform,
        posts: posts,
        hashtags: this.generateHashtags(article, platform, config),
        bestTimes: config.bestTimes || [],
        estimatedReach: this.estimateReach(platform),
        created: new Date().toISOString()
      };

      // Update statistics
      this.updateStatistics(platform, posts.length);

      return adaptation;

    } catch (error) {
      this.logger.error(`  Failed to adapt for ${platform}:`, error);
      return {
        platform: platform,
        posts: [],
        error: error.message
      };
    }
  }

  /**
   * Generate posts for a platform
   */
  async generatePosts(article, platform, config) {
    const posts = [];

    // Generate 3 variations (different angles)
    const variations = await this.generateVariations(article, platform, config);

    for (let i = 0; i < variations.length; i++) {
      const post = {
        id: `${platform}_${article.id}_${i + 1}`,
        variation: i + 1,
        content: variations[i],
        platform: platform,
        articleLink: this.generateTrackingLink(article, platform),
        estimatedEngagement: this.predictEngagement(variations[i], platform),
        hashtags: this.selectBestHashtags(article.category, platform, config),
        scheduledFor: null,  // Will be set by scheduler
        status: 'draft'
      };

      posts.push(post);
    }

    return posts;
  }

  /**
   * Generate content variations using AI
   */
  async generateVariations(article, platform, config) {
    try {
      const maxLength = this.getMaxLength(platform, config);

      const prompt = `Create 3 engaging social media posts for ${platform} to promote this article.

Article Title: ${article.title}
Article Summary: ${article.abstract || article.sections[0]?.content.slice(0, 300)}
Category: ${article.category}

Platform: ${platform}
Max Length: ${maxLength} characters
Tone: ${config.contentStyle.tone}
Use Emoji: ${config.contentStyle.emoji ? 'Yes' : 'No'}
Call to Action: ${config.contentStyle.callsToAction?.[0] || 'Read more'}

Requirements:
- Create 3 different variations with different angles/hooks
- Each must be ${maxLength} characters or less (excluding link)
- Use ${config.contentStyle.tone} tone
- ${config.contentStyle.emoji ? 'Include relevant emoji' : 'No emoji'}
- End with a call to action
- Make each variation unique (different hook/angle)

Format: Return 3 posts separated by "---" (exactly 3 dashes)`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const text = response.content[0].text;
      const variations = text
        .split(/\n---\n|^---$/)
        .map(v => v.trim())
        .filter(v => v.length > 0)
        .slice(0, 3);

      // Ensure we have 3 variations
      while (variations.length < 3) {
        variations.push(this.generateFallbackPost(article, platform, config));
      }

      return variations;

    } catch (error) {
      this.logger.error('Variation generation failed:', error);
      // Return fallback posts
      return [
        this.generateFallbackPost(article, platform, config),
        this.generateFallbackPost(article, platform, config),
        this.generateFallbackPost(article, platform, config)
      ];
    }
  }

  /**
   * Generate fallback post if AI fails
   */
  generateFallbackPost(article, platform, config) {
    const maxLength = this.getMaxLength(platform, config);

    let post = `${article.title}\n\n`;
    post += `${article.abstract?.slice(0, 150) || article.sections[0]?.content.slice(0, 150)}...\n\n`;
    post += `${config.contentStyle.callsToAction?.[0] || 'Read more'}`;

    // Truncate if too long
    if (post.length > maxLength) {
      post = post.slice(0, maxLength - 3) + '...';
    }

    return post;
  }

  /**
   * Get max length for platform
   */
  getMaxLength(platform, config) {
    // Reserve space for hashtags and link
    const baseLength = config.maxLength || SOCIAL_CONFIG.contentAdaptation.summaryLength[platform];
    const reserveForHashtags = 50;  // ~3-5 hashtags
    const reserveForLink = 30;      // shortened link

    return baseLength - reserveForHashtags - reserveForLink;
  }

  /**
   * Generate hashtags for article
   */
  generateHashtags(article, platform, config) {
    const category = article.category || 'general';
    const hashtagConfig = SOCIAL_CONFIG.contentAdaptation.hashtags;

    if (!hashtagConfig.enabled) {
      return [];
    }

    // Get category-specific hashtags
    const categoryHashtags = hashtagConfig.categories[category] || [];

    // Add article-specific keywords as hashtags
    const keywordHashtags = (article.tags || [])
      .slice(0, 3)
      .map(tag => '#' + tag.replace(/\s+/g, ''));

    // Combine and limit
    const allHashtags = [...categoryHashtags, ...keywordHashtags];
    const limit = config.hashtagLimit || hashtagConfig.maxPerPost;

    return allHashtags.slice(0, limit);
  }

  /**
   * Select best hashtags for a post
   */
  selectBestHashtags(category, platform, config) {
    const hashtags = SOCIAL_CONFIG.contentAdaptation.hashtags.categories[category] || [];
    const limit = config.hashtagLimit || 3;

    // For Twitter/Instagram, use fewer, more targeted hashtags
    // For LinkedIn, can use more
    const selectedCount = platform === 'linkedin' ? limit : Math.min(limit, 3);

    return hashtags.slice(0, selectedCount);
  }

  /**
   * Generate tracking link with UTM parameters
   */
  generateTrackingLink(article, platform) {
    const baseUrl = `https://scholarnet.com/articles/${article.slug}`;
    const utm = SOCIAL_CONFIG.utm;

    const params = new URLSearchParams({
      utm_source: utm.medium[platform] || platform,
      utm_medium: 'social',
      utm_campaign: utm.campaign,
      utm_content: article.id
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Predict engagement score for a post
   */
  predictEngagement(content, platform) {
    // Simulated engagement prediction
    // In production, use ML model trained on historical data

    let score = 50; // Base score

    // Content quality factors
    if (content.includes('?')) score += 10;  // Questions increase engagement
    if (/\d+/.test(content)) score += 5;     // Numbers/stats are engaging
    if (content.length > 100) score += 5;    // Longer posts show effort
    if (content.split('\n').length > 2) score += 5;  // Structure helps

    // Platform-specific factors
    if (platform === 'twitter' && content.length < 200) score += 10;
    if (platform === 'linkedin' && content.length > 300) score += 10;

    // Emoji bonus (if appropriate for platform)
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 0 && SOCIAL_CONFIG.platforms[platform]?.contentStyle.emoji) {
      score += Math.min(emojiCount * 3, 15);
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Estimate reach for platform
   */
  estimateReach(platform) {
    // Simulated reach estimation
    // Based on average follower count and engagement rate

    const estimates = {
      twitter: Math.round(1000 + Math.random() * 2000),
      linkedin: Math.round(500 + Math.random() * 1000),
      reddit: Math.round(2000 + Math.random() * 5000),
      facebook: Math.round(800 + Math.random() * 1500)
    };

    return estimates[platform] || 1000;
  }

  /**
   * Create thread for Twitter (long content)
   */
  async createThread(article, maxThreadLength = 10) {
    try {
      const prompt = `Create a Twitter thread (max ${maxThreadLength} tweets) about this article:

Title: ${article.title}
Content: ${article.sections.slice(0, 3).map(s => s.content.slice(0, 200)).join('\n\n')}

Requirements:
- Each tweet must be 280 characters or less
- Start with a hook tweet
- Break down key points into separate tweets
- Use emoji sparingly
- Number tweets (1/X, 2/X, etc.)
- End with call to action and link

Format: Return tweets separated by "---"`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const text = response.content[0].text;
      const tweets = text
        .split(/\n---\n|^---$/)
        .map(t => t.trim())
        .filter(t => t.length > 0 && t.length <= 280)
        .slice(0, maxThreadLength);

      return {
        threadId: `thread_${article.id}_${Date.now()}`,
        tweets: tweets,
        totalTweets: tweets.length,
        articleLink: this.generateTrackingLink(article, 'twitter')
      };

    } catch (error) {
      this.logger.error('Thread creation failed:', error);
      return null;
    }
  }

  /**
   * Adapt for Reddit (more detailed)
   */
  async adaptForReddit(article, subreddit) {
    try {
      const prompt = `Create a Reddit post for r/${subreddit} about this article:

Title: ${article.title}
Summary: ${article.abstract}
Key Points: ${article.sections.slice(0, 3).map(s => s.name).join(', ')}

Requirements:
- Title: Informative, not clickbait (max 300 chars)
- Body: Provide value, summarize key insights (300-500 words)
- Tone: Casual, informative, authentic
- Include "TL;DR" at the end
- Mention it's original research/content
- Be transparent about source

Format as:
TITLE: [your title here]
BODY: [your body here]`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const text = response.content[0].text;

      // Parse title and body
      const titleMatch = text.match(/TITLE:\s*(.+?)(?:\n|$)/);
      const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

      return {
        subreddit: subreddit,
        title: titleMatch?.[1]?.trim() || article.title,
        body: bodyMatch?.[1]?.trim() || article.abstract,
        link: this.generateTrackingLink(article, 'reddit'),
        flair: this.suggestFlair(article, subreddit)
      };

    } catch (error) {
      this.logger.error('Reddit adaptation failed:', error);
      return {
        subreddit: subreddit,
        title: article.title,
        body: article.abstract,
        link: this.generateTrackingLink(article, 'reddit')
      };
    }
  }

  /**
   * Suggest flair for Reddit post
   */
  suggestFlair(article, subreddit) {
    const category = article.category.toLowerCase();

    const flairMap = {
      science: 'Science',
      technology: 'Technology',
      health: 'Health',
      education: 'Education',
      environment: 'Environment'
    };

    return flairMap[category] || 'Discussion';
  }

  /**
   * Update statistics
   */
  updateStatistics(platform, postCount) {
    this.stats.postsCreated += postCount;

    if (!this.stats.platformBreakdown[platform]) {
      this.stats.platformBreakdown[platform] = 0;
    }
    this.stats.platformBreakdown[platform] += postCount;
  }

  /**
   * Get adapter statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      platformsActive: Object.keys(this.stats.platformBreakdown).length
    };
  }
}
