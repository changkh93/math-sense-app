const crypto = require('node:crypto');
const PIXEL_ID = 'KNgLaeimp7kng1pnbPCGpx';

function buildPythonLead(data, now = Date.now()) {
  const measurement = data?.openaiMeasurement;
  if (data?.type !== 'trial' || data.selectedCourse !== '파이썬 코딩' ||
      measurement?.consent !== true) return null;
  const oppref = measurement.oppref;
  // Preserve the opaque click reference exactly; never include form fields.
  if (typeof oppref !== 'string' || !oppref || oppref.length > 4096 || /[\s\x00-\x1f]/.test(oppref)) return null;
  return { id: crypto.randomUUID(), type: 'lead_created', timestamp_ms: now,
    oppref, source_url: 'https://msense.me/python/', action_source: 'web',
    opt_out: true, data: { type: 'customer_action' } };
}

async function sendPythonLead(event, key, fetchImpl) {
  if (!event || !key) return 'skipped';
  try {
    const response = await fetchImpl(`https://bzr.openai.com/v1/events?pid=${PIXEL_ID}`, {
      method: 'POST', timeout: 3000,
      headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] }),
    });
    return response.ok ? 'sent' : 'failed';
  } catch { return 'failed'; }
}
module.exports = { PIXEL_ID, buildPythonLead, sendPythonLead };
