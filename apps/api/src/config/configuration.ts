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

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT ?? '4000', 10),
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