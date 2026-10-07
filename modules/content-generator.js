/**
 * Content Generator
 * Generates high-quality scholarly articles using AI
 * AUTO-ROTATES: Groq (FREE) → DeepSeek (CHEAP) → OpenAI → Anthropic (PAID)
 */

import AIProviderManager from './ai-provider-manager.js';
import ResearchSystem from './research-system.js';
import {
  CONTENT_CONFIG,
  ARTICLE_STRUCTURES,
  STYLE_GUIDELINES
} from '../config/content-config.js';

export default class ContentGenerator {
  constructor(options = {}) {
    this.logger = options.logger || console;

    // Initialize multi-provider manager (auto-rotates through free tiers first)
    this.ai = new AIProviderManager(this.logger);

    // Pass AI provider to research system so they share the same rotation
    this.research = new ResearchSystem({
      ...options,
      aiProvider: this.ai
    });
    this.dryRun = options.dryRun || false;

    // Statistics
    this.stats = {
      articlesGenerated: 0,
      totalWords: 0,
      totalTimeMs: 0,
      successRate: 0,
      averageQuality: 0
    };

    // Log provider setup
    const stats = this.ai.getStats();
    this.logger.info(`🎯 Content Generator initialized with ${stats.providers.length} providers`);
    this.logger.info(`📊 Current provider: ${stats.currentProvider}`);
  }

  /**
   * Generate a complete article
   * @param {Object} options - Generation options
   * @returns {Object} Complete article with metadata
   */
  async generateArticle(options = {}) {
    const startTime = Date.now();

    try {
      this.logger.info('Starting article generation...');

      // 1. Get research brief
      const brief = await this.research.generateResearchBrief({
        category: options.category,
        specificTopic: options.topic
      });

      this.logger.info(`Research complete: ${brief.topic.title}`);

      // 2. Select article structure
      const structure = this.selectStructure(options.type || 'research');

      // 3. Generate article content
      const content = await this.generateContent(brief, structure);

      this.logger.info('Article content generated');

      // 4. Generate metadata
      const metadata = this.generateMetadata(brief, content);

      // 5. Format article
      const article = this.formatArticle(brief, content, metadata);

      // 6. Update statistics
      this.updateStatistics(article, Date.now() - startTime);

      this.logger.info(`✅ Article complete: "${article.title}" (${article.wordCount} words)`);

      return article;

    } catch (error) {
      this.logger.error('Article generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple articles in batch
   */
  async generateBatch(count = 25, options = {}) {
    const startTime = Date.now();
    this.logger.info(`Starting batch generation: ${count} articles`);

    const articles = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        this.logger.info(`\nGenerating article ${i + 1}/${count}...`);

        const article = await this.generateArticle(options);
        articles.push(article);

        // Brief pause to avoid rate limits
        await this.sleep(2000);

      } catch (error) {
        this.logger.error(`Article ${i + 1} failed:`, error.message);
        errors.push({
          index: i + 1,
          error: error.message
        });

        // Continue with next article
        continue;
      }
    }

    const totalTime = Date.now() - startTime;

    this.logger.info('\n' + '='.repeat(60));
    this.logger.info('BATCH GENERATION COMPLETE');
    this.logger.info('='.repeat(60));
    this.logger.info(`✅ Success: ${articles.length}/${count} articles`);
    this.logger.info(`❌ Errors: ${errors.length}`);
    this.logger.info(`⏱️  Total time: ${(totalTime / 1000 / 60).toFixed(1)} minutes`);
    this.logger.info(`📊 Average: ${(totalTime / articles.length / 1000).toFixed(1)}s per article`);
    this.logger.info('='.repeat(60));

    return {
      articles,
      errors,
      stats: {
        total: count,
        successful: articles.length,
        failed: errors.length,
        totalTimeMs: totalTime,
        averageTimeMs: articles.length > 0 ? totalTime / articles.length : 0
      }
    };
  }

  /**
   * Generate article content using AI
   */
  async generateContent(brief, structure) {
    try {
      const sections = [];

      // Generate each section
      for (const sectionDef of structure.sections) {
        const section = await this.generateSection(
          brief,
          sectionDef,
          sections
        );

        sections.push(section);

        // Brief pause between sections
        await this.sleep(500);
      }

      return {
        sections,
        fullText: sections.map(s => s.content).join('\n\n'),
        wordCount: this.countWords(sections.map(s => s.content).join(' '))
      };

    } catch (error) {
      this.logger.error('Content generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a single section
   */
  async generateSection(brief, sectionDef, previousSections) {
    try {
      const previousText = previousSections.map(s => s.name + ':\n' + s.content).join('\n\n');

      const prompt = `You are writing a scholarly article titled: "${brief.topic.title}"

Topic: ${brief.topic.keyword}
Category: ${brief.topic.category}

Research context:
${brief.outline}

Write the "${sectionDef.name}" section.

Requirements:
- Target word count: ${sectionDef.minWords}-${sectionDef.maxWords} words
- ${STYLE_GUIDELINES.tone} tone
- ${STYLE_GUIDELINES.voice} voice
- Include relevant citations [Author, Year] format
- Use academic language
- Be specific and informative
- Maintain coherence with previous sections

Previous sections summary:
${previousText.slice(0, 500)}...

Write ONLY the "${sectionDef.name}" section content. Do not include the section heading.`;

      const content = await this.ai.generateText(prompt, {
        maxTokens: Math.ceil((sectionDef.maxWords + 200) * 1.5),
        temperature: CONTENT_CONFIG.temperature
      });
      const wordCount = this.countWords(content);

      return {
        name: sectionDef.name,
        content: content,
        wordCount: wordCount,
        targetRange: [sectionDef.minWords, sectionDef.maxWords]
      };

    } catch (error) {
      this.logger.error(`Section generation failed: ${sectionDef.name}`, error);
      throw error;
    }
  }

  /**
   * Select article structure
   */
  selectStructure(type) {
    return ARTICLE_STRUCTURES[type] || ARTICLE_STRUCTURES.research;
  }

  /**
   * Generate article metadata (SEO, keywords, etc.)
   */
  generateMetadata(brief, content) {
    // Extract key phrases from content
    const text = content.fullText.toLowerCase();

    // Simple keyword extraction (in production, use proper NLP)
    const keywords = [
      brief.topic.keyword,
      ...brief.topic.title.split(' ').filter(w => w.length > 5)
    ].slice(0, 10);

    // Generate meta description
    const firstParagraph = content.sections[0]?.content || '';
    const metaDescription = firstParagraph
      .split('.')[0]
      .slice(0, 155) + '...';

    return {
      keywords: keywords,
      metaDescription: metaDescription,
      category: brief.category,
      tags: this.generateTags(brief),
      slug: this.generateSlug(brief.topic.title),
      readingTime: Math.ceil(content.wordCount / 200), // 200 wpm
      academicLevel: 'undergraduate',
      publicationDate: new Date().toISOString()
    };
  }

  /**
   * Format complete article
   */
  formatArticle(brief, content, metadata) {
    return {
      // Identification
      id: this.generateArticleId(),
      title: brief.topic.title,
      slug: metadata.slug,

      // Content
      abstract: this.generateAbstract(content),
      sections: content.sections,
      fullText: content.fullText,
      htmlContent: this.generateHTML(brief.topic.title, content.sections),

      // Metadata
      author: 'Scholarize Research Team',
      category: brief.category,
      tags: metadata.tags,
      keywords: metadata.keywords,
      metaDescription: metadata.metaDescription,

      // Metrics
      wordCount: content.wordCount,
      readingTime: metadata.readingTime,
      citationCount: this.countCitations(content.fullText),

      // Research data
      researchBrief: brief.id,
      sources: brief.research.sources,

      // Status
      status: 'draft',
      createdAt: new Date().toISOString(),
      publishedAt: null,

      // Quality scores (placeholder - Phase 3.2 will add real checks)
      qualityScore: 85,
      readabilityScore: 72,
      plagiarismScore: 0,

      // Flags
      requiresReview: true,
      autoGenerated: true
    };
  }

  /**
   * Generate article abstract
   */
  generateAbstract(content) {
    const intro = content.sections.find(s => s.name === 'Introduction')?.content || '';
    const conclusion = content.sections.find(s => s.name === 'Conclusion')?.content || '';

    // Take first 2 sentences from intro and first sentence from conclusion
    const introSentences = intro.split(/[.!?]+/).slice(0, 2).join('. ');
    const conclusionSentence = conclusion.split(/[.!?]+/)[0];

    return `${introSentences}. ${conclusionSentence}.`.trim();
  }

  /**
   * Generate HTML content
   */
  generateHTML(title, sections) {
    let html = `<article class="scholarly-article">\n`;
    html += `  <h1>${this.escapeHtml(title)}</h1>\n\n`;

    for (const section of sections) {
      html += `  <section class="article-section">\n`;
      html += `    <h2>${this.escapeHtml(section.name)}</h2>\n`;

      // Split into paragraphs
      const paragraphs = section.content.split('\n\n');
      for (const para of paragraphs) {
        if (para.trim()) {
          html += `    <p>${this.escapeHtml(para.trim())}</p>\n`;
        }
      }

      html += `  </section>\n\n`;
    }

    html += `</article>`;
    return html;
  }

  /**
   * Helper: Generate tags
   */
  generateTags(brief) {
    const tags = [
      brief.topic.keyword,
      brief.category,
      'research',
      'scholarly'
    ];

    // Add some subtopics as tags
    if (brief.research.subtopics) {
      tags.push(...brief.research.subtopics.slice(0, 3));
    }

    return [...new Set(tags)].slice(0, 8);
  }

  /**
   * Helper: Generate URL slug
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  /**
   * Helper: Count words
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Helper: Count citations
   */
  countCitations(text) {
    const citationPattern = /\[[\w\s,]+\d{4}\]/g;
    const matches = text.match(citationPattern);
    return matches ? matches.length : 0;
  }

  /**
   * Helper: Escape HTML
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Helper: Generate article ID
   */
  generateArticleId() {
    return `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update statistics
   */
  updateStatistics(article, timeMs) {
    this.stats.articlesGenerated++;
    this.stats.totalWords += article.wordCount;
    this.stats.totalTimeMs += timeMs;
    this.stats.successRate = 100; // Will be calculated properly in batch
    this.stats.averageQuality = (
      (this.stats.averageQuality * (this.stats.articlesGenerated - 1) + article.qualityScore) /
      this.stats.articlesGenerated
    );
  }

  /**
   * Get generator statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      averageWords: this.stats.articlesGenerated > 0
        ? Math.round(this.stats.totalWords / this.stats.articlesGenerated)
        : 0,
      averageTimeMs: this.stats.articlesGenerated > 0
        ? Math.round(this.stats.totalTimeMs / this.stats.articlesGenerated)
        : 0
    };
  }
}
