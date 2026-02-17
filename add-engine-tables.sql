-- Add Autonomous Engine Tables to Existing ScholarNet Database
-- This script safely adds only the missing tables needed by the autonomous engine

-- Enable extensions (IF NOT EXISTS is safe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ARTICLES TABLE (Main Content Storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Content
    abstract TEXT,
    full_text TEXT NOT NULL,
    html_content TEXT,

    -- Metadata
    author VARCHAR(255) DEFAULT 'ScholarNet Research Team',
    category VARCHAR(100) NOT NULL,
    tags TEXT[],
    keywords TEXT[],

    -- SEO
    meta_description VARCHAR(160),
    seo_title VARCHAR(60),
    seo_keywords TEXT[],
    seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),

    -- Metrics
    word_count INTEGER NOT NULL,
    reading_time INTEGER,
    citation_count INTEGER DEFAULT 0,
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    readability_score DECIMAL(5,2),

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
    requires_review BOOLEAN DEFAULT true,
    auto_generated BOOLEAN DEFAULT true,
    seo_optimized BOOLEAN DEFAULT false,

    -- Research
    research_topic VARCHAR(255),
    research_brief JSONB,
    outline JSONB,
    sources JSONB,

    -- Social Media
    social_promoted BOOLEAN DEFAULT false,
    social_post_count INTEGER DEFAULT 0,

    -- Performance
    views INTEGER DEFAULT 0,
    engagement_score DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,

    -- AI
    ai_model_version VARCHAR(50),
    ai_confidence DECIMAL(5,2),
    ai_generation_time INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,

    -- Full-text search
    search_vector TSVECTOR
);

-- Index for articles
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- ============================================================================
-- KEYWORDS TABLE (SEO Keyword Research)
-- ============================================================================

CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Keyword data
    keyword TEXT NOT NULL,
    topic VARCHAR(255),
    category VARCHAR(100),

    -- Metrics
    search_volume INTEGER,
    keyword_difficulty INTEGER CHECK (keyword_difficulty >= 0 AND keyword_difficulty <= 100),
    cpc DECIMAL(10,2),
    competition_level VARCHAR(20) CHECK (competition_level IN ('low', 'medium', 'high')),

    -- Scoring
    opportunity_score DECIMAL(10,2),
    priority INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'discovered' CHECK (status IN ('discovered', 'targeted', 'optimized', 'ranking', 'archived')),
    targeted_by_article UUID REFERENCES articles(id),

    -- Rankings
    current_rank INTEGER,
    best_rank INTEGER,
    rank_history JSONB,

    -- Research
    related_keywords TEXT[],
    questions TEXT[],
    search_intent VARCHAR(50),

    -- Timestamps
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    targeted_at TIMESTAMP,

    UNIQUE(keyword)
);

-- Index for keywords
CREATE INDEX IF NOT EXISTS idx_keywords_status ON keywords(status);
CREATE INDEX IF NOT EXISTS idx_keywords_opportunity ON keywords(opportunity_score DESC);
CREATE INDEX IF NOT EXISTS idx_keywords_category ON keywords(category);
CREATE INDEX IF NOT EXISTS idx_keywords_volume ON keywords(search_volume DESC);

-- ============================================================================
-- CONTENT RESEARCH TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Research metadata
    topic VARCHAR(255) NOT NULL,
    category VARCHAR(100),

    -- Research content
    brief TEXT,
    outline JSONB,
    key_points JSONB,
    sources JSONB,

    -- Quality
    research_depth INTEGER CHECK (research_depth >= 1 AND research_depth <= 10),
    source_count INTEGER DEFAULT 0,
    confidence_score DECIMAL(5,2),

    -- Usage
    used_in_article UUID REFERENCES articles(id),
    reusable BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_research_topic ON content_research(topic);
CREATE INDEX IF NOT EXISTS idx_content_research_category ON content_research(category);

-- ============================================================================
-- QUALITY CHECKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

    -- Check results
    check_type VARCHAR(50) NOT NULL,
    passed BOOLEAN NOT NULL,
    score DECIMAL(5,2),

    -- Details
    issues JSONB,
    recommendations JSONB,
    metrics JSONB,

    -- Timestamps
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- AI
    ai_model VARCHAR(50),
    processing_time INTEGER
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_article ON quality_checks(article_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_type ON quality_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_quality_checks_passed ON quality_checks(passed);

-- ============================================================================
-- SOCIAL ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Reference
    post_id UUID,
    article_id UUID REFERENCES articles(id),

    -- Platform
    platform VARCHAR(50) NOT NULL,
    post_url TEXT,

    -- Metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,

    -- Engagement
    engagement_rate DECIMAL(5,2),
    click_through_rate DECIMAL(5,2),

    -- Conversions
    conversions INTEGER DEFAULT 0,
    conversion_value DECIMAL(10,2),

    -- Timestamps
    posted_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Raw data
    raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_social_analytics_article ON social_analytics(article_id);
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform ON social_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_social_analytics_posted ON social_analytics(posted_at DESC);

-- ============================================================================
-- AI LEARNINGS TABLE
-- ============================================================================

-- Check if ai_learnings exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_learnings') THEN
        CREATE TABLE ai_learnings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

            -- Learning metadata
            module VARCHAR(100) NOT NULL,
            learning_type VARCHAR(50) NOT NULL,

            -- Learning content
            context TEXT,
            observation TEXT NOT NULL,
            insight TEXT NOT NULL,

            -- Impact
            confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
            importance INTEGER CHECK (importance >= 1 AND importance <= 10),

            -- Application
            applied_count INTEGER DEFAULT 0,
            success_rate DECIMAL(5,2),

            -- Evidence
            evidence JSONB,
            metrics JSONB,

            -- Status
            validated BOOLEAN DEFAULT false,
            active BOOLEAN DEFAULT true,

            -- Timestamps
            learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_applied TIMESTAMP,
            validated_at TIMESTAMP
        );

        CREATE INDEX idx_ai_learnings_module ON ai_learnings(module);
        CREATE INDEX idx_ai_learnings_type ON ai_learnings(learning_type);
        CREATE INDEX idx_ai_learnings_active ON ai_learnings(active);
    END IF;
END $$;

-- ============================================================================
-- AUTONOMOUS REPORTS TABLE
-- ============================================================================

-- Check if autonomous_reports exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'autonomous_reports') THEN
        CREATE TABLE autonomous_reports (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

            -- Report metadata
            report_type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,

            -- Report content
            summary TEXT,
            findings JSONB,
            metrics JSONB,
            recommendations JSONB,

            -- Period
            period_start TIMESTAMP,
            period_end TIMESTAMP,

            -- Status
            status VARCHAR(20) DEFAULT 'generated',

            -- Timestamps
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sent_at TIMESTAMP,

            -- Recipients
            recipients TEXT[]
        );

        CREATE INDEX idx_autonomous_reports_type ON autonomous_reports(report_type);
        CREATE INDEX idx_autonomous_reports_generated ON autonomous_reports(generated_at DESC);
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update search vector for articles
CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_text, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'A');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_article_search_vector ON articles;
CREATE TRIGGER trigger_update_article_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_article_search_vector();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_articles_updated_at ON articles;
CREATE TRIGGER trigger_update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_keywords_updated_at ON keywords;
CREATE TRIGGER trigger_update_keywords_updated_at
    BEFORE UPDATE ON keywords
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Autonomous Engine tables added successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - articles (main content storage)';
    RAISE NOTICE '  - keywords (SEO keyword tracking)';
    RAISE NOTICE '  - content_research (research briefs)';
    RAISE NOTICE '  - quality_checks (quality control)';
    RAISE NOTICE '  - social_analytics (social media metrics)';
    RAISE NOTICE '  - ai_learnings (AI self-improvement)';
    RAISE NOTICE '  - autonomous_reports (automated reporting)';
    RAISE NOTICE '';
    RAISE NOTICE 'Database is ready for autonomous content generation!';
END $$;
