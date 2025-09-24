import * as Sentry from '@sentry/node';

export function initSentry(dsn?: string) {
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.0,
    environment: process.env.NODE_ENV || 'development',
  });
}

export function captureException(err: Error, extra?: Record<string, any>) {
  try {
    Sentry.captureException(err, { extra });
  } catch (e) {
    // swallow
  }
}

export function captureMessage(msg: string, level: any = 'info') {
  try {
    Sentry.captureMessage(msg, level as any);
  } catch (e) {
    // swallow
  }
}
