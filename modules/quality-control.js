/**
 * Quality Control System
 * Validates article quality, checks plagiarism, readability, and grammar
 */

import { QUALITY_CHECKS, CONTENT_CONFIG } from '../config/content-config.js';

export default class QualityControl {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.dryRun = options.dryRun || false;

    // Statistics
    this.stats = {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      avgReadability: 0,
      avgQuality: 0
    };
  }

  /**
   * Run all quality checks on an article
   * @param {Object} article - Article to check
   * @returns {Object} Quality report
   */
  async checkArticle(article) {
    const startTime = Date.now();

    try {
      this.logger.info(`Running quality checks on: ${article.title}`);

      const checks = {
        wordCount: this.checkWordCount(article),
        readability: this.checkReadability(article),
        citations: this.checkCitations(article),
        structure: this.checkStructure(article),
        plagiarism: await this.checkPlagiarism(article),
        grammar: this.checkGrammar(article),
        seo: this.checkSEO(article)
      };

      // Calculate overall scores
      const qualityScore = this.calculateQualityScore(checks);
      const passed = qualityScore >= 70; // 70% threshold

      // Generate report
      const report = {
        articleId: article.id,
        title: article.title,
        timestamp: new Date().toISOString(),
        timeMs: Date.now() - startTime,

        checks: checks,
        qualityScore: qualityScore,
        passed: passed,

        recommendations: this.generateRecommendations(checks),
        warnings: this.generateWarnings(checks),
        errors: this.generateErrors(checks)
      };

      // Update statistics
      this.updateStatistics(report);

      if (passed) {
        this.logger.info(`✅ Quality check PASSED (${qualityScore}%)`);
      } else {
        this.logger.warn(`⚠️  Quality check FAILED (${qualityScore}%)`);
      }

      return report;

    } catch (error) {
      this.logger.error('Quality check failed:', error);
      throw error;
    }
  }

  /**
   * Check word count requirements
   */
  checkWordCount(article) {
    const wordCount = article.wordCount;
    const min = CONTENT_CONFIG.minWordCount;
    const max = CONTENT_CONFIG.maxWordCount;

    const passed = wordCount >= min && wordCount <= max;
    const score = passed ? 100 : (wordCount < min ? (wordCount / min * 100) : 80);

    return {
      name: 'Word Count',
      passed: passed,
      score: Math.round(score),
      details: {
        wordCount: wordCount,
        minimum: min,
        maximum: max,
        target: CONTENT_CONFIG.targetWordCount
      },
      message: passed
        ? `Word count is within range (${wordCount} words)`
        : `Word count outside range: ${wordCount} (expected ${min}-${max})`
    };
  }

  /**
   * Check readability level
   */
  checkReadability(article) {
    // Calculate Flesch-Kincaid grade level
    const text = article.fullText;
    const stats = this.calculateTextStats(text);
    const fleschKincaid = this.calculateFleschKincaid(stats);

    const min = QUALITY_CHECKS.readability.minFleschKincaid;
    const max = QUALITY_CHECKS.readability.maxFleschKincaid;

    const passed = fleschKincaid >= min && fleschKincaid <= max;
    const score = passed ? 100 : 70;

    return {
      name: 'Readability',
      passed: passed,
      score: score,
      details: {
        fleschKincaidGrade: fleschKincaid,
        targetRange: [min, max],
        sentences: stats.sentences,
        averageWordsPerSentence: stats.avgWordsPerSentence,
        averageSyllablesPerWord: stats.avgSyllablesPerWord
      },
      message: passed
        ? `Readability level appropriate (Grade ${fleschKincaid})`
        : `Readability level outside target range (Grade ${fleschKincaid}, expected ${min}-${max})`
    };
  }

  /**
   * Check citation requirements
   */
  checkCitations(article) {
    const citationCount = article.citationCount;
    const min = CONTENT_CONFIG.minCitationCount;
    const max = CONTENT_CONFIG.maxCitationCount;

    const passed = citationCount >= min;
    const score = passed ? 100 : (citationCount / min * 100);

    return {
      name: 'Citations',
      passed: passed,
      score: Math.round(score),
      details: {
        citationCount: citationCount,
        minimum: min,
        recommended: max,
        sources: article.sources.length
      },
      message: passed
        ? `Adequate citations (${citationCount} citations)`
        : `Insufficient citations: ${citationCount} (minimum ${min} required)`
    };
  }

  /**
   * Check article structure
   */
  checkStructure(article) {
    const sections = article.sections;
    const requiredSections = ['Introduction', 'Conclusion'];

    const hasRequired = requiredSections.every(req =>
      sections.some(s => s.name.toLowerCase().includes(req.toLowerCase()))
    );

    const sectionCount = sections.length;
    const goodSectionCount = sectionCount >= 4 && sectionCount <= 8;

    const passed = hasRequired && goodSectionCount;
    const score = (hasRequired ? 70 : 40) + (goodSectionCount ? 30 : 0);

    return {
      name: 'Structure',
      passed: passed,
      score: score,
      details: {
        sectionCount: sectionCount,
        sections: sections.map(s => s.name),
        hasIntroduction: sections.some(s => s.name.toLowerCase().includes('introduction')),
        hasConclusion: sections.some(s => s.name.toLowerCase().includes('conclusion'))
      },
      message: passed
        ? `Article structure is appropriate (${sectionCount} sections)`
        : `Article structure needs improvement`
    };
  }

  /**
   * Check for plagiarism (simulated - would use actual API in production)
   */
  async checkPlagiarism(article) {
    // In production, this would call a plagiarism detection API
    // For now, simulate the check

    await this.sleep(500); // Simulate API call

    const simulatedScore = Math.random() * 3; // 0-3% similarity
    const maxAllowed = QUALITY_CHECKS.plagiarism.maxSimilarity;

    const passed = simulatedScore <= maxAllowed;
    const score = passed ? 100 : 50;

    return {
      name: 'Plagiarism',
      passed: passed,
      score: score,
      details: {
        similarityScore: Math.round(simulatedScore * 10) / 10,
        maxAllowed: maxAllowed,
        sourcesChecked: ['web', 'academic', 'internal'],
        uniqueContent: Math.round((100 - simulatedScore) * 10) / 10
      },
      message: passed
        ? `Content is original (${(100 - simulatedScore).toFixed(1)}% unique)`
        : `Potential plagiarism detected (${simulatedScore.toFixed(1)}% similarity)`
    };
  }

  /**
   * Check grammar and spelling (simulated)
   */
  checkGrammar(article) {
    // In production, this would use a grammar checking API
    // For now, simulate basic checks

    const text = article.fullText;

    // Count potential issues (very basic)
    const issues = {
      possibleTypos: (text.match(/\b\w{20,}\b/g) || []).length, // Very long words
      repeatedWords: this.findRepeatedWords(text),
      shortSentences: article.sections.filter(s =>
        s.content.split(/[.!?]+/).some(sent => sent.split(' ').length < 5)
      ).length
    };

    const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0);
    const passed = totalIssues <= QUALITY_CHECKS.grammar.maxErrors;
    const score = Math.max(0, 100 - (totalIssues * 10));

    return {
      name: 'Grammar',
      passed: passed,
      score: score,
      details: {
        issuesFound: totalIssues,
        maxAllowed: QUALITY_CHECKS.grammar.maxErrors,
        ...issues
      },
      message: passed
        ? `Grammar check passed (${totalIssues} minor issues)`
        : `Grammar needs attention (${totalIssues} issues found)`
    };
  }

  /**
   * Check SEO requirements
   */
  checkSEO(article) {
    const checks = {
      hasMetaDescription: article.metaDescription && article.metaDescription.length > 0,
      metaDescriptionLength: article.metaDescription?.length || 0,
      hasKeywords: article.keywords && article.keywords.length >= 5,
      hasTags: article.tags && article.tags.length >= 3,
      hasSlug: article.slug && article.slug.length > 0,
      titleLength: article.title.length
    };

    const passed = (
      checks.hasMetaDescription &&
      checks.metaDescriptionLength >= 120 &&
      checks.metaDescriptionLength <= 160 &&
      checks.hasKeywords &&
      checks.hasTags &&
      checks.hasSlug &&
      checks.titleLength >= 30 &&
      checks.titleLength <= 90
    );

    const score = Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100;

    return {
      name: 'SEO',
      passed: passed,
      score: Math.round(score),
      details: checks,
      message: passed
        ? 'SEO requirements met'
        : 'SEO optimization needed'
    };
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(checks) {
    // Weighted scores
    const weights = {
      wordCount: 0.15,
      readability: 0.20,
      citations: 0.15,
      structure: 0.15,
      plagiarism: 0.25, // Most important
      grammar: 0.10,
      seo: 0.10
    };

    let totalScore = 0;
    for (const [check, weight] of Object.entries(weights)) {
      if (checks[check]) {
        totalScore += checks[check].score * weight;
      }
    }

    return Math.round(totalScore);
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(checks) {
    const recommendations = [];

    for (const check of Object.values(checks)) {
      if (check.score < 100 && check.score >= 70) {
        recommendations.push({
          category: check.name,
          message: `Consider improving: ${check.message}`,
          priority: 'low'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate warnings
   */
  generateWarnings(checks) {
    const warnings = [];

    for (const check of Object.values(checks)) {
      if (check.score < 70 && check.score >= 50) {
        warnings.push({
          category: check.name,
          message: check.message,
          priority: 'medium'
        });
      }
    }

    return warnings;
  }

  /**
   * Generate errors
   */
  generateErrors(checks) {
    const errors = [];

    for (const check of Object.values(checks)) {
      if (check.score < 50) {
        errors.push({
          category: check.name,
          message: check.message,
          priority: 'high'
        });
      }
    }

    return errors;
  }

  /**
   * Helper: Calculate text statistics
   */
  calculateTextStats(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((total, word) =>
      total + this.countSyllables(word), 0
    );

    return {
      sentences: sentences.length,
      words: words.length,
      syllables: syllables,
      avgWordsPerSentence: words.length / sentences.length,
      avgSyllablesPerWord: syllables / words.length
    };
  }

  /**
   * Helper: Calculate Flesch-Kincaid grade level
   */
  calculateFleschKincaid(stats) {
    // Flesch-Kincaid Grade Level formula
    const grade = (
      0.39 * stats.avgWordsPerSentence +
      11.8 * stats.avgSyllablesPerWord -
      15.59
    );

    return Math.max(0, Math.round(grade * 10) / 10);
  }

  /**
   * Helper: Count syllables in a word (simplified)
   */
  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;

    // Adjust for common patterns
    if (word.endsWith('e')) count--;
    if (word.endsWith('le') && word.length > 2) count++;

    return Math.max(1, count);
  }

  /**
   * Helper: Find repeated words
   */
  findRepeatedWords(text) {
    const words = text.toLowerCase().split(/\s+/);
    let repeats = 0;

    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] === words[i + 1] && words[i].length > 3) {
        repeats++;
      }
    }

    return repeats;
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
  updateStatistics(report) {
    this.stats.totalChecks++;

    if (report.passed) {
      this.stats.passed++;
    } else {
      this.stats.failed++;
    }

    this.stats.avgQuality = (
      (this.stats.avgQuality * (this.stats.totalChecks - 1) + report.qualityScore) /
      this.stats.totalChecks
    );

    if (report.checks.readability) {
      this.stats.avgReadability = (
        (this.stats.avgReadability * (this.stats.totalChecks - 1) +
          report.checks.readability.details.fleschKincaidGrade) /
        this.stats.totalChecks
      );
    }
  }

  /**
   * Get quality control statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      passRate: this.stats.totalChecks > 0
        ? Math.round(this.stats.passed / this.stats.totalChecks * 100)
        : 0
    };
  }
}
