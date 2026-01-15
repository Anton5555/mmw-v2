/**
 * Script to manually test the daily-events cron job
 * Usage: npx tsx scripts/test-cron.ts
 */

import 'dotenv/config';

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET is not set in your .env file');
  process.exit(1);
}

async function testCronJob() {
  const url = `${APP_URL}/api/cron/daily-events`;
  
  console.log('🚀 Testing cron job...');
  console.log(`📍 URL: ${url}`);
  console.log(`🔑 Using CRON_SECRET: ${CRON_SECRET.substring(0, 8)}...`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await response.json();

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('');
    console.log('📦 Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data.success) {
      console.log('✅ Cron job executed successfully!');
      if (data.events) {
        console.log(`   Events: ${data.events.success ? '✅' : '❌'} (${data.events.eventsCount} events)`);
      }
      if (data.recommendation) {
        console.log(`   Recommendation: ${data.recommendation.success ? '✅' : '❌'} (type: ${data.recommendation.type || 'N/A'})`);
      }
    } else {
      console.log('❌ Cron job failed or returned errors');
      if (data.events?.error) {
        console.log(`   Events error: ${data.events.error}`);
      }
      if (data.recommendation?.error) {
        console.log(`   Recommendation error: ${data.recommendation.error}`);
      }
    }
  } catch (error) {
    console.error('❌ Error calling cron job:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

testCronJob();
