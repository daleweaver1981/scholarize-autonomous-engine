#!/usr/bin/env node
import RevenueIntelligence from './revenue-intelligence.js';

async function test() {
  console.log('🧪 Testing Revenue Intelligence Module\n');
  console.log('='.repeat(60) + '\n');
  
  const revenue = new RevenueIntelligence();
  
  try {
    const snapshot = await revenue.getRevenueSnapshot();
    const opportunities = await revenue.generateRevenueOpportunities();
    
    console.log('\n' + '='.repeat(60));
    console.log('REVENUE INTELLIGENCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Active Subscriptions: ${snapshot.subscriptions.active}`);
    console.log(`Monthly Recurring Revenue: $${snapshot.mrr.totalMRR.toFixed(2)}`);
    console.log(`Annual Run Rate: $${snapshot.mrr.arr.toFixed(2)}`);
    console.log(`Churn Rate: ${snapshot.churn.churnRate}%`);
    console.log(`At-Risk Revenue: $${snapshot.failedPayments.reduce((s, p) => s + p.atRiskRevenue, 0).toFixed(2)}`);
    console.log(`\nRevenue Opportunities: ${opportunities.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await revenue.close();
  }
}

test();
