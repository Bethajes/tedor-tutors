export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtlDays: number;
  webOrigin: string;
  mobileOrigin: string;
  telegramBotToken: string;
  emailProvider: string;
}

function parsePort(raw: string | undefined): number {
  const parsed = parseInt(raw ?? '', 10);
  // Guard against PORT=0 or garbage in the environment (e.g. an exported PORT=0
  // from shell tooling): the web app's rewrite target is fixed at port 4000, so
  // an ephemeral port would silently break the proxy.
  if (!Number.isInteger(parsed) || parsed <= 0) return 4000;
  return parsed;
}

export default (): { app: AppConfig } => ({
  app: {
    port: parsePort(process.env.PORT),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    jwtRefreshTtlDays: parseInt(process.env.JWT_REFRESH_TTL_DAYS ?? '30', 10),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    mobileOrigin: process.env.MOBILE_ORIGIN ?? '*',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    emailProvider: process.env.EMAIL_PROVIDER ?? 'mock',
  },
});