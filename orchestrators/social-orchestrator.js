/**
 * Social Media Orchestrator
 * Coordinates social media posting and promotion
 */

import Database from '../lib/database.js';
import ContentAdapter from '../modules/content-adapter.js';
import SocialMediaManager from '../modules/social-media-manager.js';

export default class SocialOrchestrator {
  constructor(masterOrchestrator) {
    this.master = masterOrchestrator;
    this.db = new Database();
    this.adapter = null;
    this.manager = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    await this.db.connect();
    this.adapter = new ContentAdapter();
    this.manager = new SocialMediaManager();

    this.isInitialized = true;
    console.log('  ✓ Social Orchestrator initialized');
  }

  async executeTask(taskName, params = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    switch (taskName) {
      case 'postToAllPlatforms':
        return await this.postToAllPlatforms(params);
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }

  async postToAllPlatforms({ slot = 'morning' } = {}) {
    console.log(`\n📱 Social media posting: ${slot} slot`);

    // Get articles that haven't been promoted yet or need more promotion
    const articles = await this.db.query(
      `SELECT id, title, abstract, full_text, category, keywords
       FROM articles
       WHERE status = 'published'
       AND (social_promoted = false OR social_post_count < 3)
       ORDER BY published_at DESC
       LIMIT 5`
    );

    if (articles.rows.length === 0) {
      console.log('  ℹ️  No articles ready for social promotion');
      return { posted: 0, total: 0 };
    }

    let posted = 0;
    for (const article of articles.rows) {
      try {
        // Adapt content for social media
        const adaptations = await this.adapter.adaptArticle(article);

        // Promote on social media
        const result = await this.manager.promoteArticle(article, adaptations);

        // Update article
        await this.db.query(
          `UPDATE articles
           SET social_promoted = true,
               social_post_count = social_post_count + $1,
               updated_at = NOW()
           WHERE id = $2`,
          [result.scheduledPosts.length, article.id]
        );

        posted++;
        console.log(`  ✅ Promoted: ${article.title.substring(0, 50)}...`);
      } catch (error) {
        console.error(`  ❌ Failed to promote article ${article.id}:`, error.message);
      }
    }

    console.log(`\n✅ Social posting complete: ${posted} articles promoted`);
    return { posted, total: articles.rows.length };
  }

  async getStats() {
    const result = await this.db.query(`
      SELECT
        COUNT(*) FILTER (WHERE social_promoted = true) as promoted_count,
        SUM(social_post_count) as total_posts
      FROM articles
    `);

    return result.rows[0];
  }
}
