#!/bin/bash
# Auto-update sitemap with all published articles
# Run daily via cron at 5 AM

BASEURL="https://scholar.0xpi.com"
# Credentials come from an untracked env file so this script can live in git. It used to
# embed the Postgres password as a literal in three places, which is why it had to stay out
# of version control - and a live cron job outside version control is its own problem.
# cron gives a bare environment, so load it here rather than assuming it is exported.
ENV_FILE="${SCHOLARIZE_ENV_FILE:-/opt/scholarnet-ai/backend/.env}"
if [ -z "$DATABASE_URL" ] && [ -f "$ENV_FILE" ]; then
  DATABASE_URL=$(sed -n "s/^[[:space:]]*DATABASE_URL=//p" "$ENV_FILE" | head -1)
  DATABASE_URL=${DATABASE_URL%\"}
  DATABASE_URL=${DATABASE_URL#\"}
fi
if [ -z "$DATABASE_URL" ]; then
  echo "[sitemap] DATABASE_URL not set and not found in $ENV_FILE - refusing to run" >&2
  exit 1
fi
OUTPUT="/var/www/scholarnet/sitemap.xml"
TEMP="/tmp/sitemap-$(date +%s).xml"
TODAY=$(date +%Y-%m-%d)
DB="$DATABASE_URL"

echo "[$(date)] Updating sitemap..."

# Write header + static pages
cat > "$TEMP" << XMLHEAD
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASEURL}/</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${BASEURL}/brain-battles</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.95</priority></url>
  <url><loc>${BASEURL}/brain-battles/practice</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/scholastic-league</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.95</priority></url>
  <url><loc>${BASEURL}/may-madness</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.92</priority></url>
  <url><loc>${BASEURL}/school-war-room</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.88</priority></url>
  <url><loc>${BASEURL}/exam-season</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.95</priority></url>
  <url><loc>${BASEURL}/schools</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/schools/register</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/schools/partner</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.88</priority></url>
  <url><loc>${BASEURL}/schools/partnership-agreement</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.60</priority></url>
  <!-- The free tools. Added 2026-08-07: they were in NEITHER sitemap writer, while being the
       destination of every blog CTA, 89 YouTube Shorts and the AI-answer play. -->
  <url><loc>${BASEURL}/flashcard-generator</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.90</priority></url>
  <!-- Per-school /schools/:slug URLs are appended dynamically below from
       the schools table; do not hardcode them here. -->

  <url><loc>${BASEURL}/pricing</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/tools/study-plan</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/tools/gpa-calculator</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/tools/thesis-generator</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/tools</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.92</priority></url>
  <url><loc>${BASEURL}/blog</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/signup</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.90</priority></url>
  <url><loc>${BASEURL}/topics/ai-study-tools</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${BASEURL}/topics/study-tips</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${BASEURL}/topics/spaced-repetition</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${BASEURL}/topics/active-recall</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${BASEURL}/topics/flashcards</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${BASEURL}/topics/exam-prep</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>
  <url><loc>${BASEURL}/topics/college-life</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/productivity</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/note-taking</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/research-papers</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/ai-tutor</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/homework-help</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/spacing-effect</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/retrieval-practice</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/chatgpt-for-students</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>
  <url><loc>${BASEURL}/topics/sat-prep</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.82</priority></url>
  <url><loc>${BASEURL}/topics/ap-exam</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.82</priority></url>
XMLHEAD

# Append all published article URLs directly from DB
psql "$DATABASE_URL" -t -A -F'|' \
  -c "SELECT slug, to_char(\"updatedAt\"::date, 'YYYY-MM-DD') FROM seo_content WHERE status='published' AND (metadata->>'noindex') IS DISTINCT FROM 'true' AND slug IS NOT NULL AND slug <> '' AND (canonical_url IS NULL OR canonical_url = '' OR canonical_url = CONCAT('https://scholar.0xpi.com/blog/', slug)) ORDER BY \"createdAt\" DESC" \
  2>/dev/null | while IFS='|' read -r slug lastmod; do
    [ -z "$slug" ] && continue
    echo "  <url><loc>${BASEURL}/blog/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.80</priority></url>"
done >> "$TEMP"

# Append school profile URLs — only schools admin-assigned to a conference.
# Self-registered schools without a conference are excluded from the sitemap
# to keep spam/synthetic registrations out of Google's index.
psql "$DATABASE_URL" -t -A -F'|' \
  -c "SELECT slug, to_char(\"updatedAt\"::date, 'YYYY-MM-DD') FROM schools WHERE status='active' AND \"conferenceId\" IS NOT NULL AND slug IS NOT NULL AND slug <> '' ORDER BY \"totalPoints\" DESC NULLS LAST" \
  2>/dev/null | while IFS='|' read -r slug lastmod; do
    [ -z "$slug" ] && continue
    echo "  <url><loc>${BASEURL}/schools/${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>"
done >> "$TEMP"

echo '</urlset>' >> "$TEMP"

# Validate and deploy
URL_COUNT=$(grep -c '<url>' "$TEMP" 2>/dev/null || echo 0)
echo "[$(date)] Generated sitemap with $URL_COUNT URLs"

if [ "$URL_COUNT" -gt 50 ]; then
  mv "$TEMP" "$OUTPUT"
  echo "[$(date)] Sitemap deployed: $URL_COUNT URLs"
  # Update sitemap index lastmod so Google sees the sitemap has changed
  cat > "/var/www/scholarnet/sitemap-index.xml" << IDXEOF
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASEURL}/sitemap.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
</sitemapindex>
IDXEOF
  echo "[$(date)] Sitemap index updated"
else
  echo "[$(date)] ERROR: Sitemap too small ($URL_COUNT URLs) — not deploying"
  rm -f "$TEMP"
  exit 1
fi
