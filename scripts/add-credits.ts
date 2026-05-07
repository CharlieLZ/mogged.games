/**
 * Add Credits to User Script
 *
 * This script adds credits to a user account.
 *
 * Usage:
 *   npx tsx scripts/add-credits.ts --email=charlie0simmon@gmail.com --credits=100000000
 */

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { credit, user } from '@/config/db/schema';

import { calculateManualCreditExpiration } from './add-credits.shared';

async function addCredits() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const creditsArg = args.find((arg) => arg.startsWith('--credits='));

  if (!emailArg || !creditsArg) {
    console.error('❌ Error: Please provide email and credits amount');
    console.log('\nUsage:');
    console.log(
      '  npx tsx scripts/add-credits.ts --email=user@example.com --credits=100000000'
    );
    process.exit(1);
  }

  try {
    const email = emailArg.split('=')[1];
    const creditsAmount = parseInt(creditsArg.split('=')[1]);

    if (isNaN(creditsAmount) || creditsAmount <= 0) {
      console.error('❌ Error: Credits amount must be a positive number');
      process.exit(1);
    }

    // Find user
    console.log(`🔍 Looking up user by email: ${email}`);

    const [targetUser] = await db()
      .select()
      .from(user)
      .where(eq(user.email, email));

    if (!targetUser) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${targetUser.name} (${targetUser.email})\n`);

    // Create credit record
    console.log(`💰 Adding ${creditsAmount} credits to user...`);

    const transactionNo = `grant-${nanoid(16)}`;
    const expiresAt = calculateManualCreditExpiration();

    await db()
      .insert(credit)
      .values({
        id: nanoid(),
        userId: targetUser.id,
        userEmail: targetUser.email,
        transactionNo: transactionNo,
        transactionType: 'grant',
        transactionScene: 'gift',
        credits: creditsAmount,
        remainingCredits: creditsAmount,
        description: `Manual credits grant for testing - ${creditsAmount} credits`,
        expiresAt: expiresAt,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    console.log(`\n✅ Successfully added credits!`);
    console.log(`\n📊 Summary:`);
    console.log(`   User: ${targetUser.name} (${targetUser.email})`);
    console.log(`   Credits Added: ${creditsAmount.toLocaleString()}`);
    console.log(`   Transaction No: ${transactionNo}`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    console.log(`   Status: active`);
    console.log('');

    console.log('💡 Next Steps:');
    console.log('   - User can now use these credits for API testing');
    console.log(
      '   - Credits will expire on: ' + expiresAt.toLocaleDateString()
    );
    console.log('');
  } catch (error) {
    console.error('\n❌ Error adding credits:', error);
    process.exit(1);
  }
}

// Run the script
addCredits()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
