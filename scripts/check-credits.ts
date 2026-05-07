/**
 * Check User Credits Script
 *
 * This script checks the total credits balance for a user.
 *
 * Usage:
 *   npx tsx scripts/check-credits.ts --email=user@example.com
 */

import { eq, and, gt } from 'drizzle-orm';

import { db } from '@/core/db';
import { user, credit } from '@/config/db/schema';

async function checkCredits() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));

  if (!emailArg) {
    console.error('❌ Error: Please provide email');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/check-credits.ts --email=user@example.com');
    process.exit(1);
  }

  try {
    const email = emailArg.split('=')[1];

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

    // Get all active credit records
    const credits = await db()
      .select()
      .from(credit)
      .where(
        and(
          eq(credit.userId, targetUser.id),
          eq(credit.status, 'active'),
          gt(credit.remainingCredits, 0)
        )
      );

    // Calculate total credits
    const totalCredits = credits.reduce(
      (sum, c) => sum + c.remainingCredits,
      0
    );

    console.log(`💰 Credits Summary:`);
    console.log(`   Total Available Credits: ${totalCredits.toLocaleString()}`);
    console.log(`   Active Credit Records: ${credits.length}\n`);

    if (credits.length > 0) {
      console.log(`📝 Credit Records:`);
      credits.forEach((c, index) => {
        console.log(`\n   ${index + 1}. Transaction: ${c.transactionNo}`);
        console.log(`      Credits: ${c.credits.toLocaleString()}`);
        console.log(
          `      Remaining: ${c.remainingCredits.toLocaleString()}`
        );
        console.log(`      Type: ${c.transactionType}`);
        console.log(`      Scene: ${c.transactionScene || 'N/A'}`);
        console.log(
          `      Expires: ${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}`
        );
        console.log(`      Description: ${c.description || 'N/A'}`);
      });
    }

    console.log('');
  } catch (error) {
    console.error('\n❌ Error checking credits:', error);
    process.exit(1);
  }
}

// Run the script
checkCredits()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
