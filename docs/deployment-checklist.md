### Zero2Exit Deployment Checklist

#### 1. Install Docker

- **Install Docker Engine / Desktop** on the target machine.
- **Verify installation**:
  - `docker --version`
  - `docker run hello-world`

#### 2. Build backend image

- **From the backend directory**:
  - `cd zero2exit-backend`
  - `docker build -t zero2exit-backend:latest .`

#### 3. Run backend container

- **Start the container**:
  - `docker run --rm -p 3000:3000 --env-file .env.production zero2exit-backend:latest`
- **Confirm the container is serving**:
  - `curl http://localhost:3000/health`

#### 4. Run frontend build

- **From the frontend directory**:
  - `cd zero2exit-frontend`
  - `npm install`
  - `npm run build`

#### 5. Run Playwright tests

- **Ensure dependencies are installed**:
  - `npx playwright install`
- **Run the main E2E suite**:
  - `npm run test:e2e`
  - Optionally, use other scripts such as `test:e2e:headed` or `test:e2e:ui` as needed.

#### 6. Set production environment variables

Configure the following **in the deployment environment** (never commit real secrets):

- **Backend (`zero2exit-backend`)**
  - `NODE_ENV=production`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `CLERK_SECRET_KEY`
  - `STRIPE_SECRET_KEY`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `RESEND_API_KEY`
  - Optional: `LANGFUSE_*`, `PERPLEXITY_API_KEY`, `DOCUSIGN_*`, S3 bucket settings.
- **Frontend (`zero2exit-frontend`)**
  - `NEXT_PUBLIC_API_URL` (backend base URL, e.g. `https://api.zero2exit.com`)
  - `NEXT_PUBLIC_DOMAIN` (production frontend domain)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Clerk redirect URLs (`NEXT_PUBLIC_CLERK_*`)
  - Optional: `PLAYWRIGHT_BYPASS_SECRET` (non-production only).

#### 7. Health endpoint verification

- **With backend running (container or process)**:
  - Manually: `curl http://localhost:3000/health`
  - Using helper script:
    - From `zero2exit-backend`: `npx tsx scripts/verify-backend.ts`
  - Confirm:
    - HTTP status is `200`
    - JSON shows `database: "connected"` and `redis: "ok"`.

#### 8. Docker readiness checklist

- **Backend Dockerfile** (in `zero2exit-backend`):
  - Uses a **multi-stage build** (`builder` and `runner`).
  - Base image: `node:20-alpine`.
  - Runs `npx prisma generate` **before** `npm run build`.
  - Copies compiled artifacts from `/app/dist` and runs `node dist/server.js`.
  - Uses non-root user: `USER node` in the runner stage.
  - Exposes port `3000` with `EXPOSE 3000`.

