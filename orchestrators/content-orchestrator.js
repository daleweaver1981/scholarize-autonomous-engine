/**
 * Content Orchestrator
 * Coordinates content generation, research, and quality control
 */

import Database from '../lib/database.js';
import ResearchSystem from '../modules/research-system.js';
import ContentGenerator from '../modules/content-generator.js';
import QualityControl from '../modules/quality-control.js';

export default class ContentOrchestrator {
  constructor(masterOrchestrator) {
    this.master = masterOrchestrator;
    this.db = new Database();
    this.research = null;
    this.generator = null;
    this.quality = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    await this.db.connect();
    this.research = new ResearchSystem();
    this.generator = new ContentGenerator();
    this.quality = new QualityControl();

    // Connect modules
    this.generator.research = this.research;
    this.generator.qualityControl = this.quality;

    this.isInitialized = true;
    console.log('  ✓ Content Orchestrator initialized');
  }

  async executeTask(taskName, params = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    switch (taskName) {
      case 'generateBatch':
        return await this.generateBatch(params);
      case 'generateSingle':
        return await this.generateSingle(params);
      default:
        throw new Error(`Unknown task: ${taskName}`);
    }
  }

  async generateBatch({ cycle = 'manual', count = 25 } = {}) {
    console.log(`\n📝 Content Generation Batch: ${cycle} (${count} articles)`);
    const startTime = Date.now();
    const results = {
      cycle,
      count,
      generated: 0,
      failed: 0,
      totalWords: 0,
      articles: [],
      interrupted: false
    };

    for (let i = 0; i < count; i++) {
      // Check for shutdown signal before each article
      if (this.master.isShuttingDown) {
        console.log(`\n⚠️  Shutdown detected. Stopping after ${i} articles.`);
        results.interrupted = true;
        break;
      }

      try {
        console.log(`\n  Article ${i + 1}/${count}...`);
        const article = await this.generateSingle({ batchMode: true });

        if (article && article.id) {
          results.generated++;
          results.totalWords += article.word_count || 0;
          results.articles.push({
            id: article.id,
            title: article.title,
            word_count: article.word_count,
            quality_score: article.quality_score
          });
          console.log(`  ✅ ${article.title.substring(0, 60)}...`);
        }
      } catch (error) {
        results.failed++;
        console.error(`  ❌ Failed article ${i + 1}:`, error.message);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const status = results.interrupted ? 'interrupted' : 'complete';
    console.log(`\n✅ Batch ${status}: ${results.generated}/${count} articles in ${duration}s`);
    console.log(`   Total words: ${results.totalWords.toLocaleString()}`);
    if (results.generated > 0) {
      console.log(`   Avg speed: ${Math.round(duration / results.generated)}s per article`);
    }

    return results;
  }

  async generateSingle({ category, batchMode = false } = {}) {
    try {
      // Generate research brief
      const brief = await this.research.generateResearchBrief({ category });

      // Generate article content
      const article = await this.generator.generateArticle({
        topic: brief.topic.keyword,  // Pass keyword string, not entire object
        category: brief.category,
        research: brief
      });

      // Run quality checks
      const qualityReport = await this.quality.checkArticle(article);
      article.quality_score = qualityReport.qualityScore;
      article.quality_checks = qualityReport.checks;

      // Save to database
      const saved = await this.saveArticle(article);

      if (!batchMode) {
        console.log(`\n✅ Article generated and saved:`);
        console.log(`   ID: ${saved.id}`);
        console.log(`   Title: ${saved.title}`);
        console.log(`   Words: ${saved.word_count}`);
        console.log(`   Quality: ${saved.quality_score}%`);
      }

      return saved;
    } catch (error) {
      console.error('❌ Article generation failed:', error.message);
      throw error;
    }
  }

  async saveArticle(article) {
    try {
      // Prepare article data
      const content = article.content || article.full_text || article.fullText || '';
      const metaDescription = article.abstract || article.summary || content.substring(0, 160);
      const qualityScore = Math.min(article.quality_score || 0, 100); // Cap at 100
      const status = qualityScore >= 80 ? 'published' : 'draft';

      const articleData = {
        title: article.title,
        slug: this.generateSlug(article.title || 'untitled'),
        content: content,
        metaDescription: metaDescription,
        keywords: article.keywords || [],
        status: status,
        seoScore: qualityScore,
        publishedAt: status === 'published' ? new Date() : null
      };

      // Insert into seo_content table (used by UI)
      const result = await this.db.query(
        `INSERT INTO seo_content (
          title, slug, content, "metaDescription", keywords, status, "seoScore", "publishedAt", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          "updatedAt" = NOW()
        RETURNING id, title, slug, LENGTH(content) as word_count, "seoScore" as quality_score, "createdAt" as created_at`,
        [
          articleData.title,
          articleData.slug,
          articleData.content,
          articleData.metaDescription,
          articleData.keywords,
          articleData.status,
          articleData.seoScore,
          articleData.publishedAt
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to save article:', error.message);
      throw error;
    }
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }

  convertToHTML(content) {
    // Simple markdown-like conversion
    if (!content) return '';
    return content
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('\n');
  }

  async getStats() {
    const result = await this.db.query(`
      SELECT
        COUNT(*) as total_articles,
        SUM(word_count) as total_words,
        AVG(quality_score)::integer as avg_quality,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today_count
      FROM articles
      WHERE auto_generated = true
    `);

    return result.rows[0];
  }
}
