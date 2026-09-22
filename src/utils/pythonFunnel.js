// Only fixed labels enter analytics. Never pass form values, URLs, referral tokens or contact details.
const EVENTS = new Set(['python_view', 'python_cta', 'python_form_start', 'python_submit', 'python_success', 'python_error', 'python_video']);
export function trackPython(event, label = '') {
  if (typeof window === 'undefined' || !EVENTS.has(event)) return;
  const payload = { event, funnel: 'python', label: ['', 'page', 'results', 'learning', 'submission', 'foundation', 'lumi', 'game', 'advanced', 'math', 'algorithm'].includes(label) ? label : '' };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}
export function pythonAttribution(search = '') {
  const params = new URLSearchParams(search);
  const allowed = { utm_source: ['naver', 'google', 'instagram', 'youtube', 'kakao', 'clip', 'chatgpt'], utm_medium: ['organic', 'social', 'video', 'cpc', 'paid'], utm_campaign: ['python_trial', 'python_parent_20260929'] };
  return Object.entries(allowed).flatMap(([key, values]) => values.includes(params.get(key)) ? [`${key}=${params.get(key)}`] : []).join('&');
}
