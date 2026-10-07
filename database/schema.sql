-- Scholarize Autonomous Engine Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Articles table (main content storage)
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Content
    abstract TEXT,
    full_text TEXT NOT NULL,
    html_content TEXT,

    -- Metadata
    author VARCHAR(255) DEFAULT 'Scholarize Research Team',
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
    research_brief_id VARCHAR(100),
    sources JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    published_at TIMESTAMP,
    seo_optimized_at TIMESTAMP,

    -- WordPress integration
    wordpress_id INTEGER,
    wordpress_url TEXT,

    -- Search
    search_vector TSVECTOR
);

-- Indexes for articles
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_seo_score ON articles(seo_score DESC);
CREATE INDEX idx_articles_quality_score ON articles(quality_score DESC);
CREATE INDEX idx_articles_search_vector ON articles USING GIN(search_vector);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_article_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.full_text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_article_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_article_search_vector();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- KEYWORDS & SEO
-- ============================================================================

-- Keywords table
CREATE TABLE keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Keyword data
    keyword VARCHAR(255) UNIQUE NOT NULL,
    search_volume INTEGER,
    difficulty INTEGER CHECK (difficulty >= 0 AND difficulty <= 100),
    cpc DECIMAL(10,2),
    competition VARCHAR(20) CHECK (competition IN ('low', 'medium', 'high', 'very high')),
    intent VARCHAR(20) CHECK (intent IN ('informational', 'commercial', 'transactional', 'navigational')),
    trend VARCHAR(20) CHECK (trend IN ('rising', 'stable', 'declining')),

    -- Metrics
    opportunity_score DECIMAL(10,2),
    priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')),

    -- Usage
    articles_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_opportunity_score ON keywords(opportunity_score DESC);
CREATE INDEX idx_keywords_priority ON keywords(priority);

-- Article-Keyword relationship
CREATE TABLE article_keywords (
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,

    PRIMARY KEY (article_id, keyword_id)
);

CREATE INDEX idx_article_keywords_article ON article_keywords(article_id);
CREATE INDEX idx_article_keywords_keyword ON article_keywords(keyword_id);
CREATE INDEX idx_article_keywords_primary ON article_keywords(is_primary) WHERE is_primary = true;

-- ============================================================================
-- SOCIAL MEDIA
-- ============================================================================

-- Social media posts
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Article reference
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

    -- Post details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'linkedin', 'reddit', 'facebook', 'instagram')),
    content TEXT NOT NULL,
    variation INTEGER,

    -- Links
    article_link TEXT,
    tracking_link TEXT,

    -- Metadata
    hashtags TEXT[],
    estimated_engagement INTEGER,

    -- Scheduling
    scheduled_for TIMESTAMP,
    posted_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),

    -- Platform response
    platform_post_id VARCHAR(255),
    platform_url TEXT,
    error_message TEXT,

    -- Metrics (updated periodically)
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_posts_article ON social_posts(article_id);
CREATE INDEX idx_social_posts_platform ON social_posts(platform);
CREATE INDEX idx_social_posts_status ON social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_posts(scheduled_for);
CREATE INDEX idx_social_posts_posted ON social_posts(posted_at DESC);

-- ============================================================================
-- ANALYTICS
-- ============================================================================

-- Article analytics (daily snapshots)
CREATE TABLE article_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,

    -- Date
    date DATE NOT NULL,

    -- Traffic
    pageviews INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTEGER, -- seconds
    bounce_rate DECIMAL(5,2),

    -- Sources
    organic_traffic INTEGER DEFAULT 0,
    social_traffic INTEGER DEFAULT 0,
    direct_traffic INTEGER DEFAULT 0,
    referral_traffic INTEGER DEFAULT 0,

    -- SEO
    search_impressions INTEGER DEFAULT 0,
    search_clicks INTEGER DEFAULT 0,
    avg_position DECIMAL(5,2),
    ctr DECIMAL(5,2),

    -- Engagement
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(article_id, date)
);

CREATE INDEX idx_article_analytics_article ON article_analytics(article_id);
CREATE INDEX idx_article_analytics_date ON article_analytics(date DESC);

-- System analytics (daily)
CREATE TABLE system_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Date
    date DATE UNIQUE NOT NULL,

    -- Content
    articles_generated INTEGER DEFAULT 0,
    articles_published INTEGER DEFAULT 0,
    total_words_generated INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5,2),
    avg_seo_score DECIMAL(5,2),

    -- Social
    social_posts_created INTEGER DEFAULT 0,
    social_posts_published INTEGER DEFAULT 0,
    total_social_impressions INTEGER DEFAULT 0,
    total_social_clicks INTEGER DEFAULT 0,
    avg_engagement_rate DECIMAL(5,2),

    -- Traffic
    total_pageviews INTEGER DEFAULT 0,
    total_unique_visitors INTEGER DEFAULT 0,
    total_organic_traffic INTEGER DEFAULT 0,

    -- SEO
    avg_search_position DECIMAL(5,2),
    total_search_impressions INTEGER DEFAULT 0,
    total_search_clicks INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_analytics_date ON system_analytics(date DESC);

-- ============================================================================
-- SYSTEM MANAGEMENT
-- ============================================================================

-- Task queue
CREATE TABLE task_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Task details
    task_type VARCHAR(100) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    payload JSONB,

    -- Scheduling
    scheduled_for TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,

    -- Results
    result JSONB,
    error_message TEXT,

    -- Priority
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_scheduled ON task_queue(scheduled_for);
CREATE INDEX idx_task_queue_priority ON task_queue(priority DESC);

-- Health checks log
CREATE TABLE health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Check details
    check_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),

    -- Metrics
    response_time_ms INTEGER,
    details JSONB,

    -- Timestamp
    checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_health_checks_type ON health_checks(check_type);
CREATE INDEX idx_health_checks_status ON health_checks(status);
CREATE INDEX idx_health_checks_checked_at ON health_checks(checked_at DESC);

-- System events log
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),

    -- Message
    message TEXT NOT NULL,
    details JSONB,

    -- Context
    module VARCHAR(100),
    user_id VARCHAR(100),

    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_severity ON system_events(severity);
CREATE INDEX idx_system_events_created_at ON system_events(created_at DESC);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Article performance view
CREATE VIEW article_performance AS
SELECT
    a.id,
    a.title,
    a.slug,
    a.category,
    a.status,
    a.quality_score,
    a.seo_score,
    a.published_at,
    COUNT(DISTINCT sp.id) as social_posts_count,
    SUM(sp.impressions) as total_impressions,
    SUM(sp.clicks) as total_clicks,
    SUM(aa.pageviews) as total_pageviews,
    SUM(aa.unique_visitors) as total_visitors,
    AVG(aa.avg_position) as avg_search_position
FROM articles a
LEFT JOIN social_posts sp ON a.id = sp.article_id
LEFT JOIN article_analytics aa ON a.id = aa.article_id
GROUP BY a.id;

-- Daily performance summary
CREATE VIEW daily_performance AS
SELECT
    date,
    articles_generated,
    articles_published,
    social_posts_published,
    total_pageviews,
    total_unique_visitors,
    total_search_clicks,
    avg_quality_score,
    avg_seo_score
FROM system_analytics
ORDER BY date DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Get article with full details
CREATE OR REPLACE FUNCTION get_article_details(article_uuid UUID)
RETURNS TABLE (
    article_data JSONB,
    keywords_data JSONB,
    social_posts_data JSONB,
    analytics_data JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        row_to_json(a.*)::JSONB as article_data,
        (SELECT jsonb_agg(k.*) FROM keywords k
         JOIN article_keywords ak ON k.id = ak.keyword_id
         WHERE ak.article_id = article_uuid) as keywords_data,
        (SELECT jsonb_agg(sp.*) FROM social_posts sp
         WHERE sp.article_id = article_uuid) as social_posts_data,
        (SELECT jsonb_agg(aa.*) FROM article_analytics aa
         WHERE aa.article_id = article_uuid) as analytics_data
    FROM articles a
    WHERE a.id = article_uuid;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert system event for database initialization
INSERT INTO system_events (event_type, event_category, severity, message, details)
VALUES (
    'database_initialized',
    'system',
    'info',
    'Scholarize Autonomous Engine database initialized successfully',
    jsonb_build_object(
        'version', '1.0.0',
        'schema_version', '1',
        'initialized_at', NOW()
    )
);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions (adjust based on your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO scholarnet_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO scholarnet_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO scholarnet_user;
