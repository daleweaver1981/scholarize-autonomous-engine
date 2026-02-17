#!/usr/bin/env node
import UserAcquisitionIntelligence from './user-acquisition-intelligence.js';

async function test() {
  console.log('🧪 Testing User Acquisition Intelligence\n');
  console.log('='.repeat(60) + '\n');
  
  const acquisition = new UserAcquisitionIntelligence();
  
  try {
    const snapshot = await acquisition.getAcquisitionSnapshot();
    const opportunities = await acquisition.generateAcquisitionOpportunities();
    
    console.log('\n' + '='.repeat(60));
    console.log('USER ACQUISITION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Unique Visitors (30d): ${snapshot.traffic.visitors30d}`);
    console.log(`Signups (30d): ${snapshot.signups.signups30d}`);
    console.log(`Conversion Rate: ${snapshot.conversion.visitorToSignup}%`);
    console.log(`\nAcquisition Opportunities: ${opportunities.length}`);
    opportunities.forEach((opp, i) => {
      console.log(`\n${i + 1}. ${opp.title}`);
      console.log(`   Category: ${opp.category}`);
      console.log(`   Impact: ${opp.impact.revenue || JSON.stringify(opp.impact)}`);
    });
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await acquisition.close();
  }
}

test();
