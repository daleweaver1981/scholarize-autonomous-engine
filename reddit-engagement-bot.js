#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.production' });

const { Pool } = pg;

class RedditEngagementBot {
  constructor() {
    this.claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.db = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    this.targetSubreddits = [
      'GetStudying',
      'college', 
      'APStudents',
      'HomeworkHelp',
      'StudyTips',
      'productivity'
    ];
    
    this.maxCommentsPerDay = 5;
    this.mentionScholarizePercent = 0.10; // 10% of responses
  }

  async setup() {
    console.log('🤖 Setting up Reddit bot tables...\n');
    
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS reddit_posts (
        id TEXT PRIMARY KEY,
        subreddit TEXT,
        title TEXT,
        content TEXT,
        url TEXT,
        score INTEGER,
        created_at TIMESTAMP,
        responded BOOLEAN DEFAULT FALSE,
        response TEXT,
        response_posted_at TIMESTAMP,
        mentioned_scholarnet BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_subreddit ON reddit_posts(subreddit);
      CREATE INDEX IF NOT EXISTS idx_responded ON reddit_posts(responded);
      CREATE INDEX IF NOT EXISTS idx_response_posted_at ON reddit_posts(response_posted_at);
    `);

    console.log('✅ Reddit bot tables created\n');
  }

  async fetchRecentPosts(subreddit, limit = 25) {
    try {
      console.log(`  → Fetching r/${subreddit}...`);
      
      const response = await axios.get(
        `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`,
        { 
          headers: { 
            'User-Agent': 'Mozilla/5.0 (compatible; ScholarizeBot/1.0)'
          },
          timeout: 10000
        }
      );

      const posts = response.data.data.children
        .filter(post => !post.data.stickied) // Skip pinned posts
        .map(post => ({
          id: post.data.id,
          subreddit: post.data.subreddit,
          title: post.data.title,
          content: post.data.selftext || '',
          url: `https://reddit.com${post.data.permalink}`,
          score: post.data.score,
          created_at: new Date(post.data.created_utc * 1000)
        }));

      console.log(`    Found ${posts.length} posts`);
      return posts;
      
    } catch (error) {
      console.error(`    Error fetching r/${subreddit}: ${error.message}`);
      return [];
    }
  }

  async isRelevantPost(post) {
    // Check if post is about studying, productivity, learning
    const keywords = [
      'study', 'studying', 'exam', 'test', 'homework', 'grade', 'gpa',
      'learn', 'learning', 'focus', 'procrastination', 'productive', 'flashcard',
      'note', 'notes', 'retention', 'memorize', 'understand', 'struggling',
      'midterm', 'finals', 'assignment', 'essay', 'research', 'college prep'
    ];

    const text = (post.title + ' ' + post.content).toLowerCase();
    
    // Must contain at least one keyword
    const hasKeyword = keywords.some(kw => text.includes(kw));
    
    // Filter out low-quality posts
    const isQuestion = text.includes('?') || text.includes('how') || text.includes('help');
    const hasContent = post.title.length > 20 || post.content.length > 50;
    
    return hasKeyword && (isQuestion || hasContent);
  }

  async generateResponse(post) {
    const shouldMention = Math.random() < this.mentionScholarizePercent;

    const prompt = `You are a helpful college student on Reddit helping another student with their question.

POST TITLE: ${post.title}
POST CONTENT: ${post.content}

Generate a genuinely helpful response (150-300 words):
- Give practical, specific advice based on real experience
- Be encouraging and supportive
- Share 2-3 concrete tips or strategies
- Keep it natural and conversational
- Use casual Reddit tone (not corporate)
${shouldMention ? '- In the last paragraph, casually mention Scholarize as a tool you personally use (1-2 sentences max, natural)' : '- Do NOT mention any specific tools, products, or apps'}

Write ONLY the response text, no meta-commentary or labels.`;

    try {
      const response = await this.claude.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      });

      return {
        text: response.content[0].text.trim(),
        mentioned: shouldMention
      };
    } catch (error) {
      console.error(`    Error generating response: ${error.message}`);
      return null;
    }
  }

  async run() {
    console.log('\n🤖 Reddit Engagement Bot Running...\n');
    console.log('='.repeat(70));

    // Check how many comments posted today
    const today = await this.db.query(`
      SELECT COUNT(*) as count
      FROM reddit_posts
      WHERE response_posted_at::date = CURRENT_DATE
    `);

    const todayCount = parseInt(today.rows[0].count) || 0;

    if (todayCount >= this.maxCommentsPerDay) {
      console.log(`\n⏸️  Daily limit reached (${todayCount}/${this.maxCommentsPerDay})`);
      console.log('   Will resume tomorrow\n');
      return;
    }

    console.log(`\n📊 Comments today: ${todayCount}/${this.maxCommentsPerDay}\n`);

    let responsesGenerated = 0;

    // Fetch posts from each subreddit
    for (const subreddit of this.targetSubreddits) {
      if (todayCount + responsesGenerated >= this.maxCommentsPerDay) {
        console.log('\n⏸️  Daily limit reached\n');
        break;
      }

      console.log(`\n📖 Checking r/${subreddit}...`);
      
      const posts = await this.fetchRecentPosts(subreddit);

      for (const post of posts) {
        // Check daily limit
        if (todayCount + responsesGenerated >= this.maxCommentsPerDay) {
          break;
        }

        // Check if already responded
        const existing = await this.db.query(
          'SELECT id FROM reddit_posts WHERE id = $1',
          [post.id]
        );

        if (existing.rows.length > 0) continue;

        // Check if post is too old (only respond to posts < 24 hours old)
        const hoursSincePosted = (Date.now() - post.created_at.getTime()) / (1000 * 60 * 60);
        if (hoursSincePosted > 24) continue;

        // Check if relevant
        if (!this.isRelevantPost(post)) continue;

        // Check if score is high enough (community engagement)
        if (post.score < 3) continue;

        console.log(`\n  ✓ Relevant post found!`);
        console.log(`    Title: "${post.title.substring(0, 60)}..."`);
        console.log(`    Score: ${post.score} | Age: ${Math.round(hoursSincePosted)}h`);

        // Generate response
        const response = await this.generateResponse(post);

        if (!response) {
          console.log(`    ⚠️  Failed to generate response`);
          continue;
        }

        // Save to database
        await this.db.query(`
          INSERT INTO reddit_posts 
          (id, subreddit, title, content, url, score, created_at, responded, response, response_posted_at, mentioned_scholarnet)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
        `, [
          post.id,
          post.subreddit,
          post.title,
          post.content,
          post.url,
          post.score,
          post.created_at,
          true,
          response.text,
          response.mentioned
        ]);

        console.log(`\n  📝 Response generated (${response.text.length} chars)`);
        console.log(`    Mentioned Scholarize: ${response.mentioned ? 'Yes' : 'No'}`);
        console.log(`    URL: ${post.url}`);
        console.log(`\n    Preview:\n    "${response.text.substring(0, 200)}..."\n`);

        responsesGenerated++;

        // Rate limit: wait 30 seconds between responses
        if (responsesGenerated < this.maxCommentsPerDay - todayCount) {
          console.log('  ⏳ Waiting 30 seconds...\n');
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n✅ Bot cycle complete`);
    console.log(`   Generated ${responsesGenerated} responses today\n`);
  }

  async getStats(days = 7) {
    const result = await this.db.query(`
      SELECT 
        subreddit,
        COUNT(*) as total_responses,
        COUNT(*) FILTER (WHERE mentioned_scholarnet = true) as mentioned_scholarnet,
        AVG(score) as avg_post_score
      FROM reddit_posts
      WHERE responded = true
        AND response_posted_at > NOW() - INTERVAL '${days} days'
      GROUP BY subreddit
      ORDER BY total_responses DESC
    `);

    const totals = await this.db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE mentioned_scholarnet = true) as mentions,
        COUNT(*) FILTER (WHERE response_posted_at::date = CURRENT_DATE) as today
      FROM reddit_posts
      WHERE responded = true
        AND response_posted_at > NOW() - INTERVAL '${days} days'
    `);

    console.log('\n📊 REDDIT BOT STATS (Last ' + days + ' Days)\n');
    console.log('='.repeat(70));
    
    if (result.rows.length > 0) {
      console.log('\nBY SUBREDDIT:');
      result.rows.forEach(row => {
        console.log(`\n  r/${row.subreddit}:`);
        console.log(`    Total Responses: ${row.total_responses}`);
        console.log(`    Mentioned Scholarize: ${row.mentioned_scholarnet}`);
        console.log(`    Avg Post Score: ${Math.round(row.avg_post_score)}`);
      });

      const total = totals.rows[0];
      console.log('\n\nOVERALL:');
      console.log(`  Total Responses: ${total.total}`);
      console.log(`  Scholarize Mentions: ${total.mentions} (${Math.round(total.mentions / total.total * 100)}%)`);
      console.log(`  Responses Today: ${total.today}`);
    } else {
      console.log('\nNo responses generated yet.');
    }

    console.log('\n' + '='.repeat(70) + '\n');
  }
}

export default RedditEngagementBot;

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new RedditEngagementBot();
  await bot.setup();
  await bot.run();
  await bot.getStats(7);
  await bot.db.end();
}
