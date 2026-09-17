process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://tedor:tedor_test_password@localhost:5433/tedor_test?schema=public';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-0123456789abcdef';
process.env.TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ?? '123456789:TESTTOKEN_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
process.env.EMAIL_PROVIDER = 'mock';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL_DAYS = '30';