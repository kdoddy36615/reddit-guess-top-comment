import '@testing-library/jest-dom/vitest';

// Stub env vars before any module that calls `createEnv` is evaluated.
// Tests should not rely on real credentials; SDK boundaries are mocked.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key';
process.env.GOOGLE_GENAI_API_KEY ??= 'test-gemini-key';
