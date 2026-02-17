#!/usr/bin/env node
import SeoIntelligence from './seo-intelligence.js';

async function test() {
  console.log('🧪 Testing SEO Intelligence Module\n');
  console.log('='.repeat(60) + '\n');
  
  const seo = new SeoIntelligence();
  
  try {
    const snapshot = await seo.getCurrentSnapshot();
    const revenueOpp = await seo.getRevenueOpportunity();
    const opportunities = await seo.generateSeoOpportunities();
    
    console.log('\n' + '='.repeat(60));
    console.log('SEO INTELLIGENCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Keywords Tracked: ${snapshot.rankings.totalTracked}`);
    console.log(`Top 10 Rankings: ${snapshot.rankings.top10}`);
    console.log(`Quick-Win Keywords: ${revenueOpp.quickWinKeywords}`);
    console.log(`Potential Monthly Revenue: $${revenueOpp.estimatedMonthlyRevenue.toFixed(2)}`);
    console.log(`\nSEO Opportunities Identified: ${opportunities.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await seo.close();
  }
}

test();
