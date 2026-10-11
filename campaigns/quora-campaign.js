/**
 * Quora Campaign Automation
 * Generates Quora answers for top articles using free AI (Groq)
 */

import dotenv from 'dotenv';
dotenv.config({ override: true });

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Groq API helper (free tier)
async function callGroqAI(prompt, systemPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.warn(`Groq API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('Groq API call failed:', err.message);
    return null;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'scholarnet',
  user: process.env.POSTGRES_USER || 'scholarnet_user',
  password: process.env.POSTGRES_PASSWORD
});

// ScholarNet AI product features — campaigns are generated from these, not random articles
const SCHOLARNET_FEATURES = [
  {
    id: 'ai-tutor',
    feature: 'AI Tutor',
    url: 'https://scholar.0xpi.com/ai-tutor',
    description: '24/7 AI-powered personal tutor that explains concepts step-by-step, answers questions with cited sources, across any subject',
    targetTopics: ['AI homework help', 'online tutor for students', 'AI study help', 'best homework help app'],
    solves: 'needing help understanding concepts outside of class hours with no tutor available'
  },
  {
    id: 'quiz-generator',
    feature: 'AI Quiz Generator',
    url: 'https://scholar.0xpi.com/quizzes',
    description: 'Generates practice quizzes automatically from your notes, textbook chapters, or any topic — multiple choice, true/false, and short answer',
    targetTopics: ['free quiz maker for students', 'Quizlet alternative', 'practice quiz generator', 'AI quiz app'],
    solves: 'needing practice tests before exams without having to make them manually'
  },
  {
    id: 'flashcards',
    feature: 'AI Flashcard Generator',
    url: 'https://scholar.0xpi.com/flashcards',
    description: 'Automatically creates spaced-repetition flashcards from your notes or any topic to maximize long-term retention',
    targetTopics: ['AI flashcard maker', 'free flashcard app', 'Anki alternative', 'spaced repetition study app'],
    solves: 'spending hours making flashcards manually instead of actually studying'
  },
  {
    id: 'video-summary',
    feature: 'YouTube Video Summarizer',
    url: 'https://scholar.0xpi.com/video-summary',
    description: 'Paste any YouTube lecture URL and get a full summary, key points, and study notes — works with any educational video',
    targetTopics: ['YouTube video summarizer for students', 'summarize lecture videos', 'video to study notes', 'YouTube study tool'],
    solves: 'watching 2-hour lecture videos and struggling to take useful notes'
  },
  {
    id: 'notes',
    feature: 'AI Note-Taking',
    url: 'https://scholar.0xpi.com/notes',
    description: 'Smart note-taking with AI that organizes, summarizes, and converts your notes into study guides and flashcards automatically',
    targetTopics: ['best note taking app for college', 'AI note taking', 'smart notes app for students', 'organize lecture notes'],
    solves: 'disorganized notes that are hard to study from later'
  },
  {
    id: 'study-planner',
    feature: 'AI Study Planner',
    url: 'https://scholar.0xpi.com/study-planner',
    description: 'Builds a personalized study schedule around your exams, workload, and available time — with progress tracking and reminders',
    targetTopics: ['study planner app', 'exam schedule maker', 'student time management app', 'study schedule generator'],
    solves: 'not knowing what to study or when, especially close to exams'
  },
  {
    id: 'plagiarism-checker',
    feature: 'Plagiarism Checker',
    url: 'https://scholar.0xpi.com/plagiarism-checker',
    description: 'Free plagiarism checker for students — verify essays and papers before submission',
    targetTopics: ['free plagiarism checker for students', 'check my essay for plagiarism', 'plagiarism detector free'],
    solves: 'submitting papers without knowing if they accidentally contain plagiarism'
  },
  {
    id: 'practice-generator',
    feature: 'Practice Problem Generator',
    url: 'https://scholar.0xpi.com/practice-generator',
    description: 'Generates unlimited practice problems for any subject — math, science, history, languages — with full step-by-step solutions',
    targetTopics: ['unlimited practice problems', 'math practice problem generator', 'exam practice questions', 'study problem generator'],
    solves: 'running out of practice problems to work through before an exam'
  },
  {
    id: 'citations',
    feature: 'Citation Generator',
    url: 'https://scholar.0xpi.com/citations',
    description: 'Generates citations in APA, MLA, Chicago, and other formats from URLs, ISBNs, or manual entry — free with no word limits',
    targetTopics: ['free citation generator', 'APA citation maker', 'MLA citation generator', 'bibliography maker for students'],
    solves: 'formatting references correctly for academic papers'
  },
  {
    id: 'transcribe',
    feature: 'Lecture Transcription',
    url: 'https://scholar.0xpi.com/transcribe',
    description: 'Converts recorded lectures and audio into accurate text transcripts, then automatically generates study notes from them',
    targetTopics: ['transcribe lecture recordings', 'audio to notes for students', 'lecture transcription app', 'convert recording to notes'],
    solves: 'missing details from recorded lectures or spending hours transcribing audio manually'
  },
  {
    id: 'study-rooms',
    feature: 'Virtual Study Rooms',
    url: 'https://scholar.0xpi.com/study-rooms',
    description: 'Virtual collaborative study rooms where students study together, share notes, and quiz each other — works for remote study groups',
    targetTopics: ['virtual study room online', 'online study group app', 'study with others online', 'collaborative study platform'],
    solves: 'wanting to study with classmates when meeting in person is not possible'
  },
  {
    id: 'report-writer',
    feature: 'AI Report Writer',
    url: 'https://scholar.0xpi.com/report-writer',
    description: 'Helps students structure, outline, and draft academic reports and essays — with proper section flow and citation support',
    targetTopics: ['AI essay helper for students', 'academic report writing tool', 'essay structure tool', 'writing assistant for college'],
    solves: 'staring at a blank page not knowing how to structure an academic report'
  },
  {
    id: 'presentations',
    feature: 'AI Presentation Generator',
    url: 'https://scholar.0xpi.com/presentations',
    description: 'Creates complete presentation slide decks from a topic or your notes — with content, structure, and speaker note suggestions',
    targetTopics: ['AI presentation maker for students', 'free slide generator', 'auto PowerPoint creator', 'presentation maker from notes'],
    solves: 'spending hours building slides for a class presentation'
  },
  {
    id: 'study-coach',
    feature: 'AI Study Coach',
    url: 'https://scholar.0xpi.com/study-coach',
    description: 'Personalized AI coach that tracks study progress, identifies weak areas, and recommends what to focus on next',
    targetTopics: ['AI study coach', 'personalized study app', 'adaptive learning app for students', 'study progress tracker'],
    solves: 'studying hard but not improving because weak areas go unidentified'
  },
  {
    id: 'gamification',
    feature: 'Gamified Learning & Achievements',
    url: 'https://scholar.0xpi.com/gamification',
    description: 'Earn XP, badges, and achievements as you study — with streaks, leaderboards, and rewards to keep motivation high',
    targetTopics: ['gamified study app', 'study motivation app', 'earn rewards for studying', 'study streak app'],
    solves: 'losing motivation to study consistently over a long semester'
  }
];

// Keep TARGET_QUESTIONS exported for backwards compatibility
const TARGET_QUESTIONS = SCHOLARNET_FEATURES;

// Answer templates (natural, helpful, not salesy)
// NOTE: Avoid all templated openers - they are trained spam signals.
// Each template starts directly with substance. Affiliation must be disclosed.
const ANSWER_TEMPLATES = {
  personal_experience: {
    intro: (question, article) => `${article.mainPoint || 'The right approach makes a significant difference here'}.`,
    body: (article, url) => `What helped in practice:
${article.bullets}

(Disclosure: I run scholar.0xpi.com) I wrote up a detailed guide on this: ${url}

The part most people skip: ${article.keyTakeaway || 'consistency with a system that works for your learning style'}.`,
    outro: `Happy to answer follow-up questions in the comments.`
  },

  comprehensive_answer: {
    intro: (question, article) => `A few things that actually move the needle:`,
    body: (article, url) => `${article.bullets}

(Disclosure: I built scholar.0xpi.com) Full breakdown with specific tool recommendations: ${url}

Worth noting:
• ${article.point1 || 'Focus on understanding concepts, not just memorizing'}
• ${article.point2 || 'Spaced repetition beats re-reading every time'}
• ${article.point3 || 'Find a system that matches how you actually study'}`,
    outro: `The guide goes deeper on each of these if you want specifics.`
  },

  tool_recommendation: {
    intro: (question, article) => `After comparing a lot of ${article.category || 'study tools'}, here's what stands out:`,
    body: (article, url) => `**Options worth considering:**

${article.recommendations}

(Disclosure: I run scholar.0xpi.com) Full comparison with pros/cons: ${url}

What actually matters when choosing:
✓ ${article.criteria1 || 'Genuinely free — not a trial that locks features'}
✓ ${article.criteria2 || 'Works across your devices'}
✓ ${article.criteria3 || 'No paywall mid-workflow'}`,
    outro: `Let me know if you want more detail on any of these.`
  },

  problem_solution: {
    intro: (question, article) => `The root cause is usually ${article.problem || 'not having a repeatable approach'}.`,
    body: (article, url) => `What works:

${article.solutions}

(Disclosure: I run scholar.0xpi.com) More detail here: ${url}

Bottom line: ${article.bottomLine || 'Small consistent changes compound faster than sporadic effort.'}`,
    outro: `Let me know what you're working with and I can be more specific.`
  }
};

async function getTopArticles(limit = 200) {
  const query = `
    SELECT
      slug,
      title,
      "metaDescription",
      "seoScore",
      views
    FROM seo_content
    WHERE status = 'published'
    ORDER BY
      COALESCE("seoScore", 0) DESC,
      views DESC,
      "publishedAt" DESC
    LIMIT $1
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
}

async function generateQuoraAnswer(article, question, template = 'comprehensive_answer') {
  const baseUrl = process.env.FRONTEND_URL || 'https://scholar.0xpi.com';
  const url = `${baseUrl}/learn/${article.slug}`;

  // Try AI generation first (Groq - free)
  const aiAnswer = await generateAnswerWithAI(article, question, url);
  if (aiAnswer) {
    return {
      question: question.question,
      questionViews: question.views,
      answer: aiAnswer,
      url: url,
      template: 'ai_generated',
      article: {
        title: article.title,
        slug: article.slug
      }
    };
  }

  // Fallback: template-based generation
  const articleData = {
    title: article.title,
    slug: article.slug,
    description: article.metaDescription,
    category: extractCategory(article.title),
    mainPoint: extractMainPoint(article.title),
    keyTakeaway: extractKeyTakeaway(article.title),
    bullets: generateBullets(article),
    recommendations: generateRecommendations(article),
    problem: identifyProblem(question.question),
    solutions: generateSolutions(article),
    bottomLine: generateBottomLine(article),
    point1: extractPoint(article, 1),
    point2: extractPoint(article, 2),
    point3: extractPoint(article, 3),
    criteria1: 'Free with no hidden costs',
    criteria2: 'Easy to use',
    criteria3: 'Actually helpful (not gimmicky)'
  };

  const templateFn = ANSWER_TEMPLATES[template];
  if (!templateFn) {
    throw new Error(`Unknown template: ${template}`);
  }

  const answer = `${templateFn.intro(question.question, articleData)}

${templateFn.body(articleData, url)}

${templateFn.outro}`;

  return {
    question: question.question,
    questionViews: question.views,
    answer: answer,
    url: url,
    template: template,
    article: {
      title: article.title,
      slug: article.slug
    }
  };
}

async function generateAnswerWithAI(article, question, url) {
  const systemPrompt = `You are a knowledgeable person who writes genuine, substantive Quora answers.
You have built a study platform (scholar.0xpi.com) and openly disclose this when linking to it.
Write directly and helpfully. Never use filler openers.

BANNED PHRASES — never use these or anything like them:
- "Great question!"
- "I struggled with this too"
- "This is a common problem"
- "Here's what actually works"
- "Game-changer"
- "Hope this helps"
- Any opener that delays getting to substance

REQUIRED:
- Start the answer directly with useful information
- Include "(Disclosure: I run scholar.0xpi.com)" before any link to the site
- Be specific to the exact question asked, not generic study advice
- Sound like a real person who knows this topic, not a content template`;

  const userPrompt = `Write a Quora answer for this specific question: "${question.question}"

Relevant resource to reference: ${url}
Article title: "${article.title}"
Article description: "${article.metaDescription || ''}"

Requirements:
- 150-250 words
- Begin with a direct, substantive point — no filler opener
- Answer what the question actually asks, specifically
- Include the disclosure and URL once, naturally embedded
- Give 2-3 concrete, actionable points specific to the question
- End with an offer to answer follow-ups (not "hope this helps")`;

  return await callGroqAI(userPrompt, systemPrompt);
}

function extractCategory(title) {
  if (title.includes('Study App')) return 'study apps';
  if (title.includes('AI')) return 'AI tools';
  if (title.includes('Productivity')) return 'productivity tools';
  return 'study resources';
}

function extractMainPoint(title) {
  if (title.includes('Free')) return 'there are excellent free options available';
  if (title.includes('AI')) return 'AI tools can dramatically speed up your learning';
  if (title.includes('Best')) return 'using the right tools makes a huge difference';
  return 'having a good system is key';
}

function extractKeyTakeaway(title) {
  if (title.includes('Study App')) return 'finding apps that actually work for your learning style';
  if (title.includes('AI Homework')) return 'using AI as a learning tool, not a shortcut';
  if (title.includes('Quizlet')) return 'switching to better alternatives that are actually free';
  return 'being consistent with proven strategies';
}

function generateBullets(article) {
  const title = article.title;
  const desc = article.metaDescription || '';

  if (title.includes('15 Best') || title.includes('Study Apps')) {
    return `• AI-powered flashcard makers (better retention)
• Smart note-taking apps (organize everything)
• Practice problem generators (unlimited practice)
• Study timer apps with focus techniques`;
  }

  if (title.includes('AI Homework')) {
    return `• Get step-by-step solutions (not just answers)
• Understand concepts through AI explanations
• Practice with AI-generated problems
• Available 24/7 when you're stuck`;
  }

  if (title.includes('Quizlet Alternative')) {
    return `• Actually free (no premium required for basics)
• Better spaced repetition algorithms
• More customization options
• No annoying ads or paywalls`;
  }

  return `• Proven strategies that actually work
• Free tools and resources
• Step-by-step implementation guide
• Real results from other students`;
}

function generateRecommendations(article) {
  const title = article.title;

  if (title.includes('Study App')) {
    return `1. **AI Flashcard Tools** - Auto-generate from your notes
2. **Smart Note Apps** - Organize with AI tagging
3. **Practice Generators** - Unlimited problems
4. **Focus Timer Apps** - Pomodoro + analytics`;
  }

  if (title.includes('AI Homework')) {
    return `1. **AI Tutors** - Step-by-step explanations
2. **Problem Solvers** - Math, science, coding
3. **Study Assistants** - Summaries, flashcards, quizzes
4. **Writing Helpers** - Grammar, clarity, citations`;
  }

  return `Check the full list at the link above - I compare features, pricing, and real user experiences.`;
}

function identifyProblem(question) {
  if (question.includes('study')) return 'inefficient study methods';
  if (question.includes('grades')) return 'not knowing what strategies actually work';
  if (question.includes('time')) return 'poor time management and organization';
  return 'not having the right approach or tools';
}

function generateSolutions(article) {
  const title = article.title;

  if (title.includes('Study')) {
    return `1. Use active recall instead of re-reading
2. Practice spaced repetition systematically
3. Leverage AI tools for personalized learning
4. Track your progress to stay motivated`;
  }

  return `1. Start with the fundamentals
2. Use proven tools and techniques
3. Be consistent (even 20min/day helps)
4. Adjust based on what works for YOU`;
}

function generateBottomLine(article) {
  const title = article.title;

  if (title.includes('Free')) return 'You do not need expensive tools - free options work great';
  if (title.includes('AI')) return 'AI tools are game-changers if used correctly';
  if (title.includes('Best')) return 'The right tools and strategies make all the difference';
  return 'Start with small changes and build momentum';
}

function extractPoint(article, number) {
  const points = [
    'Focus on understanding concepts, not just memorizing',
    'Use spaced repetition for better long-term retention',
    'Practice actively with problems and quizzes',
    'Find tools that match your learning style',
    'Stay consistent with your study routine'
  ];
  return points[number - 1] || points[0];
}

function matchQuestions(article) {
  const title = article.title.toLowerCase();
  const matches = [];

  TARGET_QUESTIONS.forEach(q => {
    const topic = q.topic.toLowerCase();

    // Match based on keywords
    if (title.includes(topic) ||
        title.includes(topic.replace(' ', '-')) ||
        (topic.includes('study') && title.includes('study'))) {
      matches.push(q);
    }
  });

  // Always include general questions
  if (matches.length < 3) {
    matches.push(TARGET_QUESTIONS.find(q => q.topic === 'study techniques'));
    matches.push(TARGET_QUESTIONS.find(q => q.topic === 'grades'));
  }

  return matches.filter((q, index, self) =>
    index === self.findIndex(t => t.question === q.question)
  );
}

async function getUsedArticleSlugs() {
  const trackingPath = path.join(__dirname, '../data/campaign-tracking.json');
  try {
    const raw = await fs.readFile(trackingPath, 'utf8');
    const tracking = JSON.parse(raw);
    return new Set(tracking.quora_used_slugs || []);
  } catch {
    return new Set();
  }
}

async function saveUsedArticleSlugs(newSlugs) {
  const trackingPath = path.join(__dirname, '../data/campaign-tracking.json');
  let tracking = {};
  try {
    const raw = await fs.readFile(trackingPath, 'utf8');
    tracking = JSON.parse(raw);
  } catch {}
  const existing = new Set(tracking.quora_used_slugs || []);
  newSlugs.forEach(s => existing.add(s));
  tracking.quora_used_slugs = [...existing];
  await fs.writeFile(trackingPath, JSON.stringify(tracking, null, 2));
}

async function generateFeatureQA(feature) {
  const systemPrompt = `You are the founder of ScholarNet AI (scholar.0xpi.com), a free AI-powered study platform for students.
You answer Quora questions honestly and helpfully. You disclose your affiliation when linking to your platform.
Output valid JSON only, no markdown, no code blocks.

ScholarNet AI features: AI Tutor, Quiz Generator, Flashcard Generator, YouTube Video Summarizer,
AI Note-Taking, Study Planner, Plagiarism Checker, Practice Problem Generator, Citation Generator,
Lecture Transcription, Virtual Study Rooms, Report Writer, Presentation Generator, AI Study Coach,
Gamified Learning. Free to use at scholar.0xpi.com.

BANNED PHRASES — never use any of these:
- "Great question!", "I struggled with this too", "This is a common problem"
- "Here's what actually works", "Game-changer", "Hope this helps", "I stumbled upon"
- Any filler opener that delays getting to useful content

REQUIRED:
- Start with a direct, substantive answer — no warm-up phrases
- Include "(Disclosure: I built scholar.0xpi.com)" before any link to the platform
- Be specific and honest about what the feature actually does`;

  const userPrompt = `ScholarNet AI feature to write about:
Feature: "${feature.feature}"
What it does: "${feature.description}"
Problem it solves: "${feature.solves}"
Direct URL: ${feature.url}
Related search topics: ${feature.targetTopics.join(', ')}

Do two things:
1. Write a realistic Quora QUESTION that a student would actually search for — specific to this problem, not generic
2. Write a 150-200 word Quora ANSWER that:
   - Opens directly with what actually helps (no filler opener)
   - Addresses the specific problem the question is about
   - Mentions ScholarNet AI's feature with the disclosure BEFORE the URL, e.g. "(Disclosure: I built scholar.0xpi.com) — the [Feature] at [URL] does X"
   - Gives 2-3 concrete, useful points beyond just "use this tool"
   - Ends with an offer to answer follow-up questions

Return only this JSON:
{"question": "...", "answer": "..."}`;

  const result = await callGroqAI(userPrompt, systemPrompt);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    if (parsed.question && parsed.answer) {
      return { question: parsed.question, answer: parsed.answer, url: feature.url };
    }
  } catch {
    const match = result.match(/\{[\s\S]*"question"[\s\S]*"answer"[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.question && parsed.answer) {
          return { question: parsed.question, answer: parsed.answer, url: feature.url };
        }
      } catch {}
    }
  }
  return null;
}

async function generateDailyCampaign(count = 2) {
  console.log('🎯 Generating Quora Campaign...\n');

  try {
    // Load which features have already been used, rotate when all exhausted
    const usedSlugs = await getUsedArticleSlugs(); // reused for feature IDs
    const unusedFeatures = SCHOLARNET_FEATURES.filter(f => !usedSlugs.has(f.id));
    const featuresToUse = unusedFeatures.length >= count ? unusedFeatures : SCHOLARNET_FEATURES;

    if (unusedFeatures.length < count) {
      console.log('⚠️  All features used — rotating from the beginning');
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0];
    const campaign = {
      date: now.toISOString().split('T')[0],
      timestamp,
      answers: [],
      summary: {
        totalAnswers: 0,
        totalQuestions: 0,
        estimatedReach: 0
      }
    };

    const usedInThisCampaign = [];
    let answerCount = 0;

    for (const feature of featuresToUse) {
      if (answerCount >= count) break;

      console.log(`  Generating for feature: ${feature.feature}...`);
      const result = await generateFeatureQA(feature);
      if (!result) continue;

      campaign.answers.push({
        question: result.question,
        questionViews: 'N/A',
        answer: result.answer,
        url: result.url,
        template: 'ai_generated',
        article: { title: `ScholarNet AI — ${feature.feature}`, slug: feature.id },
        priority: answerCount + 1,
        status: 'pending'
      });

      usedInThisCampaign.push(feature.id);
      campaign.summary.totalAnswers++;
      answerCount++;
    }

    campaign.summary.totalQuestions = campaign.answers.length;

    // Do not save an empty campaign — fail loudly so the UI is not wiped
    if (campaign.answers.length === 0) {
      throw new Error('AI generation produced 0 answers — campaign not saved. Check Groq API or article availability.');
    }

    // Save used slugs so next campaign picks different articles
    await saveUsedArticleSlugs(usedInThisCampaign);

    // Save campaign
    const outputDir = path.join(__dirname, '../outputs/quora-campaigns');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `quora-campaign-${campaign.timestamp}.json`);
    await fs.writeFile(outputFile, JSON.stringify(campaign, null, 2));

    console.log(`✅ Campaign generated: ${outputFile}\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Total answers: ${campaign.summary.totalAnswers}`);
    console.log(`   - Unique questions: ${campaign.summary.totalQuestions}`);
    console.log(`   - Estimated reach: ${(campaign.summary.estimatedReach / 1000).toFixed(0)}K views`);
    console.log(`   - AI-generated: yes\n`);

    // Print first 2 answers as examples
    console.log('📝 Sample Answers:\n');
    for (let i = 0; i < Math.min(2, campaign.answers.length); i++) {
      const ans = campaign.answers[i];
      console.log(`Answer ${i + 1}:`);
      console.log(`Question: ${ans.question}`);
      console.log(`Views: ${ans.questionViews}`);
      console.log(`Answer Preview:\n${ans.answer.substring(0, 300)}...\n`);
    }

    console.log(`\n📁 Full campaign saved to: ${outputFile}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Find these questions on Quora');
    console.log('   2. Post answers (personalize slightly)');
    console.log('   3. Engage with comments');
    console.log('   4. Track which answers get traction\n');

    return campaign;

  } catch (error) {
    console.error('❌ Campaign generation failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = parseInt(process.argv[2]) || 2;
  generateDailyCampaign(count)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { generateDailyCampaign, generateQuoraAnswer, TARGET_QUESTIONS };
