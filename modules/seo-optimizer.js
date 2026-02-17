/**
 * SEO Optimizer
 * Optimizes articles for search engine visibility
 */

import Anthropic from '@anthropic-ai/sdk';
import { SEO_CONFIG } from '../config/seo-config.js';
import KeywordResearch from './keyword-research.js';

export default class SEOOptimizer {
  constructor(options = {}) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.keywordResearch = new KeywordResearch(options);
    this.dryRun = options.dryRun || false;
    this.logger = options.logger || console;

    // Statistics
    this.stats = {
      articlesOptimized: 0,
      avgSEOScore: 0,
      improvementRate: 0
    };
  }

  /**
   * Optimize an article for SEO
   */
  async optimizeArticle(article, targetKeyword = null) {
    try {
      this.logger.info(`Optimizing article: ${article.title}`);

      const startTime = Date.now();

      // 1. Determine target keyword if not provided
      if (!targetKeyword) {
        targetKeyword = await this.selectBestKeyword(article);
      }

      // 2. Get keyword data
      const keywordData = await this.keywordResearch.getKeywordSuggestions(
        targetKeyword,
        10
      );

      const primaryKeyword = keywordData[0];
      const secondaryKeywords = keywordData.slice(1, 6);

      // 3. Analyze current SEO
      const currentSEO = this.analyzeSEO(article, primaryKeyword);

      // 4. Generate optimization recommendations
      const recommendations = this.generateRecommendations(
        article,
        primaryKeyword,
        secondaryKeywords,
        currentSEO
      );

      // 5. Apply optimizations
      const optimizedArticle = await this.applyOptimizations(
        article,
        recommendations,
        primaryKeyword,
        secondaryKeywords
      );

      // 6. Re-analyze to measure improvement
      const optimizedSEO = this.analyzeSEO(optimizedArticle, primaryKeyword);

      // 7. Generate SEO report
      const report = {
        articleId: article.id,
        title: article.title,
        timestamp: new Date().toISOString(),
        timeMs: Date.now() - startTime,

        keywords: {
          primary: primaryKeyword,
          secondary: secondaryKeywords
        },

        before: currentSEO,
        after: optimizedSEO,
        improvement: this.calculateImprovement(currentSEO, optimizedSEO),

        recommendations: recommendations,
        applied: recommendations.filter(r => r.applied),

        optimizedArticle: optimizedArticle
      };

      // Update statistics
      this.updateStatistics(report);

      this.logger.info(`✅ SEO optimization complete (Score: ${currentSEO.score} → ${optimizedSEO.score})`);

      return report;

    } catch (error) {
      this.logger.error('SEO optimization failed:', error);
      throw error;
    }
  }

  /**
   * Select the best target keyword for an article
   */
  async selectBestKeyword(article) {
    // Extract main topic from title
    const title = article.title.toLowerCase();

    // Try to find keywords in title
    const keywords = await this.keywordResearch.getKeywordSuggestions(
      article.category || title.split(' ').slice(0, 3).join(' '),
      5
    );

    return keywords[0]?.keyword || article.title.split(':')[0];
  }

  /**
   * Analyze article's current SEO
   */
  analyzeSEO(article, primaryKeyword) {
    const checks = {
      title: this.checkTitle(article.title, primaryKeyword),
      metaDescription: this.checkMetaDescription(article.metaDescription, primaryKeyword),
      url: this.checkURL(article.slug, primaryKeyword),
      headings: this.checkHeadings(article.sections, primaryKeyword),
      keywordDensity: this.checkKeywordDensity(article.fullText, primaryKeyword),
      contentLength: this.checkContentLength(article.wordCount),
      readability: this.checkReadability(article),
      internalLinks: this.checkInternalLinks(article),
      externalLinks: this.checkExternalLinks(article),
      images: this.checkImages(article)
    };

    // Calculate overall score
    const score = this.calculateSEOScore(checks);

    return {
      score: score,
      grade: this.getGrade(score),
      checks: checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check title optimization
   */
  checkTitle(title, keyword) {
    const length = title.length;
    const config = SEO_CONFIG.onPage.titleLength;

    const hasKeyword = title.toLowerCase().includes(keyword?.keyword?.toLowerCase() || '');
    const keywordPosition = hasKeyword ?
      title.toLowerCase().indexOf(keyword?.keyword?.toLowerCase() || '') : -1;

    const lengthScore = (
      length >= config.min && length <= config.max ? 100 :
      length < config.min ? (length / config.min * 100) :
      (config.max / length * 100)
    );

    const keywordScore = hasKeyword ? 100 : 0;
    const positionScore = keywordPosition <= 30 ? 100 : 50; // Keyword in first 30 chars

    const score = Math.round((lengthScore + keywordScore + positionScore) / 3);

    return {
      name: 'Title Optimization',
      score: score,
      passed: score >= 70,
      details: {
        length: length,
        optimal: config.optimal,
        hasKeyword: hasKeyword,
        keywordPosition: keywordPosition
      },
      message: score >= 90 ? 'Title is well optimized' :
               score >= 70 ? 'Title is good, minor improvements possible' :
               'Title needs optimization'
    };
  }

  /**
   * Check meta description
   */
  checkMetaDescription(description, keyword) {
    if (!description) {
      return {
        name: 'Meta Description',
        score: 0,
        passed: false,
        details: { missing: true },
        message: 'Meta description is missing'
      };
    }

    const length = description.length;
    const config = SEO_CONFIG.onPage.metaDescLength;

    const hasKeyword = description.toLowerCase().includes(keyword?.keyword?.toLowerCase() || '');
    const hasCallToAction = /learn|discover|explore|find out|read more/i.test(description);

    const lengthScore = (
      length >= config.min && length <= config.max ? 100 :
      length < config.min ? (length / config.min * 100) :
      (config.max / length * 100)
    );

    const keywordScore = hasKeyword ? 100 : 0;
    const ctaScore = hasCallToAction ? 100 : 50;

    const score = Math.round((lengthScore + keywordScore + ctaScore) / 3);

    return {
      name: 'Meta Description',
      score: score,
      passed: score >= 70,
      details: {
        length: length,
        optimal: config.optimal,
        hasKeyword: hasKeyword,
        hasCallToAction: hasCallToAction
      },
      message: score >= 90 ? 'Meta description is excellent' :
               score >= 70 ? 'Meta description is good' :
               'Meta description needs improvement'
    };
  }

  /**
   * Check URL structure
   */
  checkURL(slug, keyword) {
    const length = slug.length;
    const hasKeyword = slug.includes(keyword?.keyword?.toLowerCase().replace(/\s+/g, '-') || '');
    const hasNumbers = /\d/.test(slug);
    const hasStopWords = /\b(a|an|the|and|or|but|in|on|at|to|for)\b/.test(slug);

    const lengthScore = length <= SEO_CONFIG.onPage.urlLength.max ? 100 : 70;
    const keywordScore = hasKeyword ? 100 : 50;
    const cleanScore = (!hasStopWords && !hasNumbers) ? 100 : 80;

    const score = Math.round((lengthScore + keywordScore + cleanScore) / 3);

    return {
      name: 'URL Structure',
      score: score,
      passed: score >= 70,
      details: {
        length: length,
        hasKeyword: hasKeyword,
        hasStopWords: hasStopWords
      },
      message: score >= 90 ? 'URL is well optimized' : 'URL could be improved'
    };
  }

  /**
   * Check heading structure
   */
  checkHeadings(sections, keyword) {
    const h2Count = sections.length;
    const config = SEO_CONFIG.onPage.headingStructure;

    const keywordInHeadings = sections.some(s =>
      s.name.toLowerCase().includes(keyword?.keyword?.toLowerCase() || '')
    );

    const countScore = (
      h2Count >= config.h2Count.min && h2Count <= config.h2Count.max ? 100 : 70
    );

    const keywordScore = keywordInHeadings ? 100 : 60;

    const score = Math.round((countScore + keywordScore) / 2);

    return {
      name: 'Heading Structure',
      score: score,
      passed: score >= 70,
      details: {
        h2Count: h2Count,
        optimal: `${config.h2Count.min}-${config.h2Count.max}`,
        keywordInHeadings: keywordInHeadings
      },
      message: score >= 90 ? 'Heading structure is excellent' : 'Heading structure is adequate'
    };
  }

  /**
   * Check keyword density
   */
  checkKeywordDensity(text, keyword) {
    if (!keyword) {
      return { name: 'Keyword Density', score: 50, passed: true, details: {}, message: 'No keyword specified' };
    }

    const words = text.toLowerCase().split(/\s+/);
    const keywordWords = keyword.keyword.toLowerCase().split(/\s+/);
    const keywordLength = keywordWords.length;

    let count = 0;
    for (let i = 0; i <= words.length - keywordLength; i++) {
      const phrase = words.slice(i, i + keywordLength).join(' ');
      if (phrase === keyword.keyword.toLowerCase()) {
        count++;
      }
    }

    const density = (count / words.length) * 100;
    const config = SEO_CONFIG.onPage.keywordDensity.primary;

    const score = (
      density >= config.min && density <= config.max ? 100 :
      density < config.min ? (density / config.min * 100) :
      (config.max / density * 100)
    );

    return {
      name: 'Keyword Density',
      score: Math.round(score),
      passed: density >= config.min && density <= config.max,
      details: {
        density: parseFloat(density.toFixed(2)),
        optimal: `${config.min}-${config.max}%`,
        count: count
      },
      message: density >= config.min && density <= config.max ?
        'Keyword density is optimal' :
        density < config.min ? 'Keyword usage is too low' :
        'Keyword density is too high (keyword stuffing risk)'
    };
  }

  /**
   * Check content length
   */
  checkContentLength(wordCount) {
    const config = SEO_CONFIG.onPage.contentStructure;

    const score = (
      wordCount >= config.optimalWordCount ? 100 :
      wordCount >= config.minWordCount ? 80 :
      (wordCount / config.minWordCount * 80)
    );

    return {
      name: 'Content Length',
      score: Math.round(score),
      passed: wordCount >= config.minWordCount,
      details: {
        wordCount: wordCount,
        optimal: config.optimalWordCount,
        minimum: config.minWordCount
      },
      message: wordCount >= config.optimalWordCount ? 'Content length is excellent' :
               wordCount >= config.minWordCount ? 'Content length is adequate' :
               'Content is too short'
    };
  }

  /**
   * Check readability
   */
  checkReadability(article) {
    const score = article.readabilityScore || 75;

    return {
      name: 'Readability',
      score: Math.round(score),
      passed: score >= 60,
      details: {
        score: score,
        level: score >= 80 ? 'Easy' : score >= 60 ? 'Medium' : 'Difficult'
      },
      message: score >= 80 ? 'Content is easy to read' :
               score >= 60 ? 'Content readability is acceptable' :
               'Content is difficult to read'
    };
  }

  /**
   * Check internal links (simulated)
   */
  checkInternalLinks(article) {
    const count = Math.floor(Math.random() * 5) + 1; // Simulated
    const config = SEO_CONFIG.onPage.contentStructure;

    const score = count >= config.minInternalLinks ? 100 : (count / config.minInternalLinks * 100);

    return {
      name: 'Internal Links',
      score: Math.round(score),
      passed: count >= config.minInternalLinks,
      details: {
        count: count,
        minimum: config.minInternalLinks
      },
      message: count >= config.minInternalLinks ? 'Good internal linking' : 'Add more internal links'
    };
  }

  /**
   * Check external links
   */
  checkExternalLinks(article) {
    const count = article.citationCount || 0;
    const config = SEO_CONFIG.onPage.contentStructure;

    const score = count >= config.minExternalLinks ? 100 : (count / config.minExternalLinks * 100);

    return {
      name: 'External Links',
      score: Math.round(score),
      passed: count >= config.minExternalLinks,
      details: {
        count: count,
        minimum: config.minExternalLinks
      },
      message: count >= config.minExternalLinks ? 'Good external linking' : 'Add more authoritative external links'
    };
  }

  /**
   * Check images (simulated)
   */
  checkImages(article) {
    const count = Math.floor(Math.random() * 3); // Simulated
    const config = SEO_CONFIG.onPage.contentStructure;

    const score = count >= config.minImages ? 100 : (count / config.minImages * 100);

    return {
      name: 'Images',
      score: Math.round(score),
      passed: count >= config.minImages,
      details: {
        count: count,
        minimum: config.minImages
      },
      message: count >= config.minImages ? 'Good image usage' : 'Add more relevant images'
    };
  }

  /**
   * Calculate overall SEO score
   */
  calculateSEOScore(checks) {
    const weights = SEO_CONFIG.scoringWeights;

    const criticalChecks = [
      checks.title,
      checks.metaDescription,
      checks.keywordDensity,
      checks.contentLength
    ];

    const otherChecks = [
      checks.url,
      checks.headings,
      checks.readability,
      checks.internalLinks,
      checks.externalLinks,
      checks.images
    ];

    const criticalScore = criticalChecks.reduce((sum, check) => sum + check.score, 0) / criticalChecks.length;
    const otherScore = otherChecks.reduce((sum, check) => sum + check.score, 0) / otherChecks.length;

    return Math.round(criticalScore * 0.7 + otherScore * 0.3);
  }

  /**
   * Get grade from score
   */
  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(article, primaryKeyword, secondaryKeywords, currentSEO) {
    const recommendations = [];

    for (const [key, check] of Object.entries(currentSEO.checks)) {
      if (check.score < 90) {
        recommendations.push({
          category: check.name,
          priority: check.score < 50 ? 'high' : check.score < 70 ? 'medium' : 'low',
          currentScore: check.score,
          issue: check.message,
          action: this.getRecommendedAction(key, check, primaryKeyword),
          applied: false
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get recommended action for a check
   */
  getRecommendedAction(checkType, check, keyword) {
    const actions = {
      title: `Include "${keyword?.keyword}" in the title, preferably at the beginning`,
      metaDescription: `Write a compelling meta description (120-160 chars) including "${keyword?.keyword}"`,
      url: `Simplify URL slug to include main keyword: "${keyword?.keyword?.replace(/\s+/g, '-')}"`,
      headings: `Include "${keyword?.keyword}" in at least one H2 heading`,
      keywordDensity: check.details.density < 1 ?
        `Increase usage of "${keyword?.keyword}" (current: ${check.details.density}%, target: 1-2.5%)` :
        `Reduce keyword density to avoid stuffing (current: ${check.details.density}%, target: 1-2.5%)`,
      contentLength: `Expand content to ${SEO_CONFIG.onPage.contentStructure.optimalWordCount} words`,
      readability: 'Simplify complex sentences and use shorter paragraphs',
      internalLinks: `Add ${check.details.minimum - check.details.count} internal links to related articles`,
      externalLinks: `Add ${check.details.minimum - check.details.count} external links to authoritative sources`,
      images: `Add ${check.details.minimum - check.details.count} relevant images with alt text`
    };

    return actions[checkType] || 'Review and improve this aspect';
  }

  /**
   * Apply optimizations to article
   */
  async applyOptimizations(article, recommendations, primaryKeyword, secondaryKeywords) {
    const optimized = { ...article };

    // Apply high priority optimizations automatically
    for (const rec of recommendations) {
      if (rec.priority === 'high') {
        switch (rec.category) {
          case 'Title Optimization':
            if (!optimized.title.toLowerCase().includes(primaryKeyword.keyword.toLowerCase())) {
              optimized.title = await this.optimizeTitle(optimized.title, primaryKeyword);
              rec.applied = true;
            }
            break;

          case 'Meta Description':
            if (!optimized.metaDescription ||
                !optimized.metaDescription.toLowerCase().includes(primaryKeyword.keyword.toLowerCase())) {
              optimized.metaDescription = await this.optimizeMetaDescription(
                optimized.abstract || optimized.fullText,
                primaryKeyword
              );
              rec.applied = true;
            }
            break;

          case 'URL Structure':
            if (!optimized.slug.includes(primaryKeyword.keyword.toLowerCase().replace(/\s+/g, '-'))) {
              optimized.slug = this.optimizeSlug(optimized.title, primaryKeyword);
              rec.applied = true;
            }
            break;
        }
      }
    }

    // Add keyword metadata
    optimized.seoKeywords = {
      primary: primaryKeyword,
      secondary: secondaryKeywords.map(kw => kw.keyword)
    };

    optimized.seoOptimized = true;
    optimized.seoOptimizedAt = new Date().toISOString();

    return optimized;
  }

  /**
   * Optimize title
   */
  async optimizeTitle(currentTitle, keyword) {
    // If title already has keyword, keep it
    if (currentTitle.toLowerCase().includes(keyword.keyword.toLowerCase())) {
      return currentTitle;
    }

    // Add keyword to beginning if title is too long
    if (currentTitle.length > 50) {
      return `${keyword.keyword}: ${currentTitle.slice(0, 50)}...`;
    }

    // Otherwise, incorporate keyword naturally
    return `Understanding ${keyword.keyword}: ${currentTitle}`;
  }

  /**
   * Optimize meta description
   */
  async optimizeMetaDescription(content, keyword) {
    // Extract first meaningful sentence
    const firstParagraph = content.split(/\n\n/)[0] || content.slice(0, 300);
    const sentences = firstParagraph.split(/[.!?]+/);

    let description = sentences[0].trim();

    // Ensure keyword is included
    if (!description.toLowerCase().includes(keyword.keyword.toLowerCase())) {
      description = `Learn about ${keyword.keyword}. ${description}`;
    }

    // Trim to optimal length
    if (description.length > 155) {
      description = description.slice(0, 152) + '...';
    }

    // Add call to action if room
    if (description.length < 140) {
      description += ' Read more to discover key insights.';
    }

    return description.slice(0, 160);
  }

  /**
   * Optimize URL slug
   */
  optimizeSlug(title, keyword) {
    // Start with keyword
    let slug = keyword.keyword.toLowerCase();

    // Add 2-3 words from title that aren't stop words
    const titleWords = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word =>
        word.length > 3 &&
        !['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this'].includes(word)
      );

    // Add up to 3 meaningful words
    const additionalWords = titleWords.filter(w => !slug.includes(w)).slice(0, 3);
    slug += '-' + additionalWords.join('-');

    return slug.replace(/\s+/g, '-').slice(0, 60);
  }

  /**
   * Calculate improvement
   */
  calculateImprovement(before, after) {
    const scoreDiff = after.score - before.score;
    const percentChange = ((after.score - before.score) / before.score * 100);

    return {
      scoreDifference: scoreDiff,
      percentChange: parseFloat(percentChange.toFixed(1)),
      gradeChange: before.grade !== after.grade ? `${before.grade} → ${after.grade}` : 'No change',
      improved: scoreDiff > 0
    };
  }

  /**
   * Update statistics
   */
  updateStatistics(report) {
    this.stats.articlesOptimized++;

    this.stats.avgSEOScore = (
      (this.stats.avgSEOScore * (this.stats.articlesOptimized - 1) + report.after.score) /
      this.stats.articlesOptimized
    );

    if (report.improvement.improved) {
      this.stats.improvementRate = (
        (this.stats.improvementRate * (this.stats.articlesOptimized - 1) + 1) /
        this.stats.articlesOptimized * 100
      );
    }
  }

  /**
   * Get optimizer statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      keywordStats: this.keywordResearch.getStatistics()
    };
  }
}
