/**
 * Refund Failed AI Tasks Script
 *
 * This script refunds credits for failed or canceled AI tasks
 * that still have an active consume record.
 *
 * Usage:
 *   npx tsx scripts/refund-failed-ai-tasks.ts --email=user@example.com
 *   npx tsx scripts/refund-failed-ai-tasks.ts --user-id=USER_ID
 *   npx tsx scripts/refund-failed-ai-tasks.ts --name=UserName
 *   npx tsx scripts/refund-failed-ai-tasks.ts --email=user@example.com --dry-run
 */

import './server-only-shim.js';

import { and, eq, ilike, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask, credit, user } from '@/config/db/schema';
import { AITaskStatus } from '@/extensions/ai/types';
import { updateAITaskById } from '@/shared/models/ai_task';
import { CreditStatus, CreditTransactionType } from '@/shared/models/credit';

type RefundTask = {
  id: string;
  status: string;
  creditId: string | null;
  costCredits: number;
  taskId: string | null;
  model: string;
  transactionNo: string;
};

async function refundFailedTasks() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const userIdArg = args.find((arg) => arg.startsWith('--user-id='));
  const nameArg = args.find((arg) => arg.startsWith('--name='));
  const dryRun = args.includes('--dry-run');

  if (!emailArg && !userIdArg && !nameArg) {
    console.error('❌ Error: Please provide email, user-id, or name');
    console.log('\nUsage:');
    console.log(
      '  npx tsx scripts/refund-failed-ai-tasks.ts --email=user@example.com'
    );
    console.log(
      '  npx tsx scripts/refund-failed-ai-tasks.ts --user-id=USER_ID'
    );
    console.log(
      '  npx tsx scripts/refund-failed-ai-tasks.ts --name=UserName'
    );
    console.log(
      '  npx tsx scripts/refund-failed-ai-tasks.ts --email=user@example.com --dry-run'
    );
    process.exit(1);
  }

  try {
    let targetUserId = userIdArg ? userIdArg.split('=')[1] : '';
    let targetEmail = emailArg ? emailArg.split('=')[1] : '';
    const targetName = nameArg ? nameArg.split('=')[1] : '';

    if (!targetUserId && targetName) {
      console.log(`🔍 Looking up user by name: ${targetName}`);
      const matchedUsers = await db()
        .select()
        .from(user)
        .where(ilike(user.name, `%${targetName}%`));

      if (matchedUsers.length === 0) {
        console.error(`❌ No users matched name: ${targetName}`);
        process.exit(1);
      }

      if (matchedUsers.length > 1) {
        console.error(
          `❌ Multiple users matched name "${targetName}", please use --user-id or --email:`
        );
        matchedUsers.forEach((matched) => {
          console.log(
            `   - id=${matched.id} name=${matched.name || 'N/A'} email=${matched.email || 'N/A'}`
          );
        });
        process.exit(1);
      }

      targetUserId = matchedUsers[0]?.id || '';
      targetEmail = matchedUsers[0]?.email || targetEmail;
      console.log(
        `✓ Found user: ${matchedUsers[0]?.name || 'N/A'} (${targetEmail || 'N/A'})\n`
      );
    }

    if (!targetUserId) {
      console.log(`🔍 Looking up user by email: ${targetEmail}`);
      const [targetUser] = await db()
        .select()
        .from(user)
        .where(eq(user.email, targetEmail));

      if (!targetUser) {
        console.error(`❌ User not found: ${targetEmail}`);
        process.exit(1);
      }

      targetUserId = targetUser.id;
      targetEmail = targetUser.email || targetEmail;
      console.log(`✓ Found user: ${targetUser.name} (${targetEmail})\n`);
    }

    const refundableTasks = (await db()
      .select({
        id: aiTask.id,
        status: aiTask.status,
        creditId: aiTask.creditId,
        costCredits: aiTask.costCredits,
        taskId: aiTask.taskId,
        model: aiTask.model,
        transactionNo: credit.transactionNo,
      })
      .from(aiTask)
      .innerJoin(credit, eq(aiTask.creditId, credit.id))
      .where(
        and(
          eq(aiTask.userId, targetUserId),
          inArray(aiTask.status, [
            AITaskStatus.FAILED,
            AITaskStatus.CANCELED,
          ]),
          eq(credit.status, CreditStatus.ACTIVE),
          eq(credit.transactionType, CreditTransactionType.CONSUME)
        )
      )) as RefundTask[];

    if (refundableTasks.length === 0) {
      console.log('✅ No failed/canceled tasks found that need refunds.');
      return;
    }

    console.log('📋 Tasks eligible for refund:');
    refundableTasks.forEach((task, index) => {
      console.log(
        `  ${index + 1}. task=${task.id} status=${task.status} credits=${task.costCredits} txn=${task.transactionNo}`
      );
    });
    console.log('');

    if (dryRun) {
      console.log('🧪 Dry run enabled, no changes were applied.');
      return;
    }

    let refundedCount = 0;
    for (const task of refundableTasks) {
      await updateAITaskById(task.id, {
        status: task.status as AITaskStatus,
        creditId: task.creditId || undefined,
      });
      refundedCount += 1;
    }

    console.log('✅ Refund complete.');
    console.log(`   Refunded tasks: ${refundedCount}`);
  } catch (error) {
    console.error('\n❌ Error refunding failed tasks:', error);
    process.exit(1);
  }
}

refundFailedTasks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
