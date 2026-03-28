-- Minimal auth stub for local Docker Postgres so Prisma migrations that reference
-- auth.users and auth.uid() can apply. The Fastify app connects with a DB role that
-- bypasses RLS (superuser); this file only satisfies schema/FK requirements.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::uuid;
$$ LANGUAGE sql STABLE;
