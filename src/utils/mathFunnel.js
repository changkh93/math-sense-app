// This helper reads only public marketing attribution; never form fields or click IDs.
const stages = new Set(['form_start', 'submit', 'success', 'error']);
export function mathMarketingWindow(current = typeof window === 'undefined' ? null : window) {
  if (!current) return null;
  try {
    const target = current.parent !== current ? current.parent : current;
    if (target.location.origin !== current.location.origin ||
        !['/math', '/math/'].includes(target.location.pathname)) return null;
    return target;
  } catch { return null; }
}
export function mathAttribution(search = '') {
  const params = new URLSearchParams(search);
  const allowed = {utm_source: ['naver', 'google', 'instagram', 'youtube', 'kakao', 'clip'], utm_medium: ['organic', 'social', 'video', 'cpc'], utm_campaign: ['math_trial']};
  return Object.entries(allowed).flatMap(([key, values]) => values.includes(params.get(key)) ? [`${key}=${params.get(key)}`] : []).join('&');
}
export function trackMath(stage, target = mathMarketingWindow()) {
  if (!target || !stages.has(stage)) return;
  try {
    target.dataLayer = target.dataLayer || [];
    target.dataLayer.push({event: `math_${stage}`, funnel: 'math', label: ''});
  } catch { /* Measurement must not interrupt an application. */ }
}
