/**
 * Social Media Manager
 * Orchestrates posting across multiple social media platforms
 */

import ContentAdapter from './content-adapter.js';
import { SOCIAL_CONFIG } from '../config/social-config.js';

export default class SocialMediaManager {
  constructor(options = {}) {
    this.adapter = new ContentAdapter(options);
    this.dryRun = options.dryRun || false;
    this.logger = options.logger || console;

    // Post queue
    this.queue = [];
    this.scheduled = [];
    this.posted = [];

    // Statistics
    this.stats = {
      totalPosts: 0,
      platformStats: {},
      engagement: {
        impressions: 0,
        clicks: 0,
        likes: 0,
        shares: 0,
        comments: 0
      }
    };
  }

  /**
   * Promote an article across social media
   */
  async promoteArticle(article, options = {}) {
    try {
      this.logger.info(`\n${'='.repeat(60)}`);
      this.logger.info(`Promoting Article: ${article.title}`);
      this.logger.info('='.repeat(60));

      const startTime = Date.now();

      // 1. Adapt article to all platforms
      this.logger.info('\n1️⃣  Adapting content for social platforms...');
      const adaptations = await this.adapter.adaptArticle(article);

      // 2. Schedule posts
      this.logger.info('\n2️⃣  Scheduling posts...');
      const scheduledPosts = this.schedulePosts(adaptations, options);

      // 3. Prepare promotion report
      const report = {
        articleId: article.id,
        articleTitle: article.title,
        timestamp: new Date().toISOString(),
        timeMs: Date.now() - startTime,

        adaptations: adaptations,
        scheduledPosts: scheduledPosts,

        summary: {
          totalPosts: scheduledPosts.length,
          platforms: Object.keys(adaptations.adaptations).length,
          estimatedReach: this.calculateTotalReach(adaptations),
          scheduledTimes: this.getScheduledTimes(scheduledPosts)
        }
      };

      // 4. Add to queue
      this.queue.push(...scheduledPosts);
      this.scheduled.push(...scheduledPosts);

      this.logger.info('\n✅ Article promotion prepared!');
      this.logger.info(`   Total posts: ${report.summary.totalPosts}`);
      this.logger.info(`   Platforms: ${report.summary.platforms}`);
      this.logger.info(`   Estimated reach: ${report.summary.estimatedReach.toLocaleString()}`);

      return report;

    } catch (error) {
      this.logger.error('Article promotion failed:', error);
      throw error;
    }
  }

  /**
   * Schedule posts across time slots
   */
  schedulePosts(adaptations, options = {}) {
    const scheduledPosts = [];
    const timeSlots = this.getTimeSlots();
    let slotIndex = 0;

    // Schedule posts for each platform
    for (const [platform, adaptation] of Object.entries(adaptations.adaptations)) {
      if (!adaptation.posts || adaptation.posts.length === 0) continue;

      for (let i = 0; i < adaptation.posts.length; i++) {
        const post = adaptation.posts[i];

        // Assign time slot (rotate through available slots)
        const timeSlot = timeSlots[slotIndex % timeSlots.length];
        slotIndex++;

        // Add delay between posts (hours)
        const delayHours = i * 8; // 8 hours between variations

        const scheduledPost = {
          ...post,
          scheduledTime: this.calculateScheduleTime(timeSlot, delayHours),
          platform: platform,
          hashtags: adaptation.hashtags,
          status: 'scheduled',
          estimatedReach: adaptation.estimatedReach
        };

        scheduledPosts.push(scheduledPost);
      }
    }

    // Sort by scheduled time
    scheduledPosts.sort((a, b) =>
      new Date(a.scheduledTime) - new Date(b.scheduledTime)
    );

    return scheduledPosts;
  }

  /**
   * Get available time slots from config
   */
  getTimeSlots() {
    return [
      SOCIAL_CONFIG.postingSchedule.morning,
      SOCIAL_CONFIG.postingSchedule.afternoon,
      SOCIAL_CONFIG.postingSchedule.evening
    ];
  }

  /**
   * Calculate actual schedule time
   */
  calculateScheduleTime(timeSlot, delayHours = 0) {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);

    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    // Add delay
    if (delayHours > 0) {
      scheduled.setHours(scheduled.getHours() + delayHours);
    }

    return scheduled.toISOString();
  }

  /**
   * Calculate total estimated reach
   */
  calculateTotalReach(adaptations) {
    let totalReach = 0;

    for (const adaptation of Object.values(adaptations.adaptations)) {
      if (adaptation.estimatedReach) {
        totalReach += adaptation.estimatedReach * (adaptation.posts?.length || 0);
      }
    }

    return totalReach;
  }

  /**
   * Get scheduled times summary
   */
  getScheduledTimes(scheduledPosts) {
    return scheduledPosts.map(post => ({
      platform: post.platform,
      time: new Date(post.scheduledTime).toLocaleString(),
      variation: post.variation
    }));
  }

  /**
   * Post to social media (simulated)
   * In production, this would use platform APIs
   */
  async postToSocialMedia(post) {
    try {
      this.logger.info(`\nPosting to ${post.platform}...`);

      if (this.dryRun) {
        this.logger.info('[DRY RUN] Would post:', post.content.slice(0, 100) + '...');
        return {
          success: true,
          postId: `dry_run_${Date.now()}`,
          platform: post.platform,
          url: '#'
        };
      }

      // Simulate API call
      await this.sleep(1000);

      // Simulate success
      const result = {
        success: true,
        postId: `${post.platform}_${Date.now()}`,
        platform: post.platform,
        url: `https://${post.platform}.com/post/${Date.now()}`,
        postedAt: new Date().toISOString(),
        initialMetrics: {
          impressions: 0,
          engagements: 0,
          clicks: 0
        }
      };

      // Update statistics
      this.updatePostStatistics(post.platform);

      // Move to posted list
      post.status = 'posted';
      post.postedAt = result.postedAt;
      post.postUrl = result.url;
      this.posted.push(post);

      this.logger.info(`✅ Posted to ${post.platform}`);
      this.logger.info(`   URL: ${result.url}`);

      return result;

    } catch (error) {
      this.logger.error(`Failed to post to ${post.platform}:`, error);
      post.status = 'failed';
      post.error = error.message;

      return {
        success: false,
        platform: post.platform,
        error: error.message
      };
    }
  }

  /**
   * Process post queue (run scheduled posts)
   */
  async processQueue() {
    const now = new Date();
    const readyPosts = this.queue.filter(post =>
      post.status === 'scheduled' &&
      new Date(post.scheduledTime) <= now
    );

    if (readyPosts.length === 0) {
      this.logger.info('No posts ready to publish');
      return [];
    }

    this.logger.info(`\nProcessing ${readyPosts.length} scheduled posts...`);

    const results = [];

    for (const post of readyPosts) {
      const result = await this.postToSocialMedia(post);
      results.push(result);

      // Remove from queue
      this.queue = this.queue.filter(p => p.id !== post.id);

      // Delay between posts to respect rate limits
      await this.sleep(5000); // 5 seconds
    }

    return results;
  }

  /**
   * Get engagement metrics (simulated)
   */
  async getEngagementMetrics(postId) {
    // Simulated engagement metrics
    // In production, fetch from platform APIs

    const baseEngagement = Math.floor(Math.random() * 100);

    return {
      postId: postId,
      timestamp: new Date().toISOString(),
      metrics: {
        impressions: baseEngagement * 10,
        clicks: Math.floor(baseEngagement * 0.5),
        likes: Math.floor(baseEngagement * 0.3),
        shares: Math.floor(baseEngagement * 0.1),
        comments: Math.floor(baseEngagement * 0.05)
      },
      engagementRate: parseFloat((baseEngagement / 1000 * 100).toFixed(2))
    };
  }

  /**
   * Generate engagement report
   */
  async generateEngagementReport(timeframe = '7days') {
    this.logger.info('\n📊 Generating engagement report...');

    const recentPosts = this.posted.slice(-20); // Last 20 posts

    const platformMetrics = {};
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalEngagements = 0;

    for (const post of recentPosts) {
      const metrics = await this.getEngagementMetrics(post.id);

      // Aggregate by platform
      if (!platformMetrics[post.platform]) {
        platformMetrics[post.platform] = {
          posts: 0,
          impressions: 0,
          clicks: 0,
          likes: 0,
          shares: 0,
          comments: 0
        };
      }

      platformMetrics[post.platform].posts++;
      platformMetrics[post.platform].impressions += metrics.metrics.impressions;
      platformMetrics[post.platform].clicks += metrics.metrics.clicks;
      platformMetrics[post.platform].likes += metrics.metrics.likes;
      platformMetrics[post.platform].shares += metrics.metrics.shares;
      platformMetrics[post.platform].comments += metrics.metrics.comments;

      totalImpressions += metrics.metrics.impressions;
      totalClicks += metrics.metrics.clicks;
      totalEngagements += metrics.metrics.likes + metrics.metrics.shares + metrics.metrics.comments;
    }

    const report = {
      timeframe: timeframe,
      timestamp: new Date().toISOString(),
      totalPosts: recentPosts.length,

      overall: {
        impressions: totalImpressions,
        clicks: totalClicks,
        engagements: totalEngagements,
        clickThroughRate: totalImpressions > 0 ?
          parseFloat((totalClicks / totalImpressions * 100).toFixed(2)) : 0,
        engagementRate: totalImpressions > 0 ?
          parseFloat((totalEngagements / totalImpressions * 100).toFixed(2)) : 0
      },

      byPlatform: platformMetrics,

      topPerformers: this.getTopPerformers(recentPosts)
    };

    // Display report
    this.displayEngagementReport(report);

    return report;
  }

  /**
   * Get top performing posts
   */
  getTopPerformers(posts) {
    // Simulate top performers
    return posts
      .slice(0, 5)
      .map(post => ({
        postId: post.id,
        platform: post.platform,
        content: post.content.slice(0, 60) + '...',
        impressions: Math.floor(Math.random() * 5000) + 1000,
        engagementRate: parseFloat((Math.random() * 5 + 1).toFixed(2))
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);
  }

  /**
   * Display engagement report
   */
  displayEngagementReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('SOCIAL MEDIA ENGAGEMENT REPORT');
    console.log('='.repeat(60));

    console.log(`\nTimeframe: ${report.timeframe}`);
    console.log(`Total Posts: ${report.totalPosts}`);

    console.log('\n📊 Overall Metrics:');
    console.log(`   Impressions: ${report.overall.impressions.toLocaleString()}`);
    console.log(`   Clicks: ${report.overall.clicks.toLocaleString()}`);
    console.log(`   Engagements: ${report.overall.engagements.toLocaleString()}`);
    console.log(`   CTR: ${report.overall.clickThroughRate}%`);
    console.log(`   Engagement Rate: ${report.overall.engagementRate}%`);

    console.log('\n📱 By Platform:');
    for (const [platform, metrics] of Object.entries(report.byPlatform)) {
      console.log(`\n   ${platform.toUpperCase()}:`);
      console.log(`      Posts: ${metrics.posts}`);
      console.log(`      Impressions: ${metrics.impressions.toLocaleString()}`);
      console.log(`      Clicks: ${metrics.clicks.toLocaleString()}`);
      console.log(`      Likes: ${metrics.likes.toLocaleString()}`);
      console.log(`      Shares: ${metrics.shares.toLocaleString()}`);
      console.log(`      Comments: ${metrics.comments.toLocaleString()}`);
    }

    console.log('\n🏆 Top Performers:');
    report.topPerformers.slice(0, 3).forEach((post, i) => {
      console.log(`\n   ${i + 1}. ${post.platform.toUpperCase()}`);
      console.log(`      "${post.content}"`);
      console.log(`      Impressions: ${post.impressions.toLocaleString()}`);
      console.log(`      Engagement Rate: ${post.engagementRate}%`);
    });

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Update post statistics
   */
  updatePostStatistics(platform) {
    this.stats.totalPosts++;

    if (!this.stats.platformStats[platform]) {
      this.stats.platformStats[platform] = {
        posts: 0,
        impressions: 0,
        clicks: 0
      };
    }

    this.stats.platformStats[platform].posts++;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queued: this.queue.length,
      scheduled: this.scheduled.filter(p => p.status === 'scheduled').length,
      posted: this.posted.length,
      failed: this.scheduled.filter(p => p.status === 'failed').length
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      queue: this.getQueueStatus(),
      adapterStats: this.adapter.getStatistics()
    };
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
