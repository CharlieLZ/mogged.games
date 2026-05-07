export async function GET() {
  return Response.json(
    {
      ok: true,
      service: 'imageeditorai',
      timestamp: new Date().toISOString(),
      runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    },
    { status: 200 }
  );
}
