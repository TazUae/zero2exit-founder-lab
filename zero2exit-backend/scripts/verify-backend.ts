import 'dotenv/config';

const DEFAULT_PORT = process.env.PORT ?? '3000';
const BASE_URL =
  process.env.BACKEND_URL ?? `http://localhost:${DEFAULT_PORT}`;

type HealthResponse = {
  status: string;
  database: string;
  redis: string;
  llm?: string;
  [key: string]: unknown;
};

async function main() {
  const url = `${BASE_URL.replace(/\/+$/, '')}/health`;
  // Node 20+ exposes fetch globally.
  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    console.error(`[verify-backend] Failed to reach ${url}:`, err);
    process.exit(1);
  }

  let body: HealthResponse;
  try {
    body = (await res.json()) as HealthResponse;
  } catch (err) {
    console.error(
      `[verify-backend] Health endpoint did not return valid JSON. status=${res.status}`,
      err,
    );
    process.exit(1);
  }

  const dbOk = body.database === 'connected';
  const redisOk = body.redis === 'ok';
  const overallOk = res.status === 200 && dbOk && redisOk;

  console.log('[verify-backend] GET', url);
  console.log('[verify-backend] HTTP status:', res.status);
  console.log('[verify-backend] Payload:', JSON.stringify(body, null, 2));

  if (!overallOk) {
    console.error(
      '[verify-backend] Backend is unhealthy:',
      `database=${body.database}, redis=${body.redis}, status=${body.status}`,
    );
    process.exit(1);
  }

  console.log('[verify-backend] Backend health is OK.');
}

main().catch((err) => {
  console.error('[verify-backend] Unexpected error:', err);
  process.exit(1);
});

