/**
 * Script to check the daily recommendation in the database
 * Usage: npx tsx scripts/check-recommendation.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecommendation() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    console.log('🔍 Checking daily recommendation for today...');
    console.log(`📅 Date: ${today.toISOString()}`);
    console.log('');

    const recommendation = await prisma.dailyRecommendation.findUnique({
      where: { date: today },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            mamRank: true,
          },
        },
        list: {
          select: {
            id: true,
            name: true,
          },
        },
        participant: {
          select: {
            id: true,
            displayName: true,
            slug: true,
          },
        },
      },
    });

    if (!recommendation) {
      console.log('❌ No recommendation found for today');
      console.log('   Make sure the cron job has run successfully');
      return;
    }

    console.log('✅ Recommendation found!');
    console.log('');
    console.log('📊 Details:');
    console.log(`   Type: ${recommendation.type}`);
    console.log(`   Curator: ${recommendation.curatorName || 'N/A'}`);
    console.log(`   Created: ${recommendation.createdAt.toISOString()}`);
    console.log('');

    switch (recommendation.type) {
      case 'movie':
        if (recommendation.movie) {
          console.log('🎬 Movie:');
          console.log(`   ID: ${recommendation.movie.id}`);
          console.log(`   Title: ${recommendation.movie.title}`);
          console.log(`   MAM Rank: ${recommendation.movie.mamRank || 'N/A'}`);
        }
        break;
      case 'list':
        if (recommendation.list) {
          console.log('📋 List:');
          console.log(`   ID: ${recommendation.list.id}`);
          console.log(`   Name: ${recommendation.list.name}`);
        }
        break;
      case 'participant':
        if (recommendation.participant) {
          console.log('👤 Participant:');
          console.log(`   ID: ${recommendation.participant.id}`);
          console.log(`   Name: ${recommendation.participant.displayName}`);
          console.log(`   Slug: ${recommendation.participant.slug}`);
        }
        break;
    }

    if (recommendation.metadata) {
      console.log('');
      console.log('📝 Metadata:');
      console.log(JSON.stringify(recommendation.metadata, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecommendation();
