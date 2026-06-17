import { base44 } from '@/api/base44Client';

/**
 * Silently auto-captures a system error to the Issue entity.
 * Fire-and-forget — never throws, never shows UI.
 * Rate-limited: won't re-report the same error+page combo within 30 seconds.
 */
const recentCaptures = new Map();

export async function captureSystemError(error, context = {}) {
  const messageKey = String(error?.message || error || 'unknown');
  const pageKey = window.location?.pathname || 'unknown';
  const dedupeKey = `${messageKey}::${pageKey}`;

  // Avoid flooding duplicates
  const lastCapture = recentCaptures.get(dedupeKey);
  if (lastCapture && Date.now() - lastCapture < 30000) return;
  recentCaptures.set(dedupeKey, Date.now());

  try {
    await base44.functions.invoke('reportIssue', {
      type: 'system_error',
      title: String(error?.message || error || 'Unknown error').slice(0, 200),
      description: String(error?.stack || error?.toString?.() || String(error || '')).slice(0, 2000),
      error_stack: error?.stack || null,
      error_context: JSON.stringify({
        ...context,
        url: window.location?.href,
        userAgent: navigator?.userAgent?.slice(0, 300),
      }).slice(0, 2000),
      page_url: window.location?.href || null,
    });
  } catch (_) {
    // Silent — prevent cascading failures
  }
}