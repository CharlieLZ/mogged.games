import 'server-only';

import { cleanupExpiredAIGenerateIdempotencyRecords } from '@/shared/models/ai_generate_idempotency';

async function main() {
  const startedAt = new Date();
  const deletedCount =
    await cleanupExpiredAIGenerateIdempotencyRecords(startedAt);

  console.log('[ai-generate-idempotency] cleanup completed', {
    startedAt: startedAt.toISOString(),
    deletedCount,
  });
}

main().catch((error) => {
  console.error('[ai-generate-idempotency] cleanup failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
