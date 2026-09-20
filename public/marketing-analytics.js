/* Public marketing measurement only. No form values, student IDs or private routes. */
(() => {
  const id = 'G-SGWRBZ7X2E';
  if (location.hostname !== 'msense.me') return;
  const publicPath = p => ['/', '/python', '/trial', '/math', '/math/books'].includes(p) || /^\/(?:python|math)\/guides\/(?:[a-z0-9-]+\/)*$/.test(p);
  const path = () => location.pathname.replace(/\/$/, '') || '/';
  const allowed = () => publicPath(path()) || /^\/(?:python|math)\/guides\/(?:[a-z0-9-]+\/)*$/.test(location.pathname);
  if (!allowed()) return;
  const events = new Set(['python_view','python_cta','python_form_start','python_submit','python_success','python_error','python_video','math_form_start','math_submit','math_success','math_error']);
  const labels = new Set(['','page','results','learning','submission','foundation','lumi','game','advanced','math','algorithm']);
  const sources = new Set(['naver','google','instagram','youtube','kakao','clip']);
  const media = new Set(['organic','social','video','cpc']);
  const query = new URLSearchParams(location.search);
  const campaign = {};
  if (sources.has(query.get('utm_source'))) campaign.campaign_source = query.get('utm_source');
  if (media.has(query.get('utm_medium'))) campaign.campaign_medium = query.get('utm_medium');
  if (['python_trial','math_trial'].includes(query.get('utm_campaign'))) campaign.campaign_name = query.get('utm_campaign');
  const cleanReferrer = (() => { try { return new URL(document.referrer).origin; } catch { return ''; } })();
  window.dataLayer = window.dataLayer || [];
  const queue = window.dataLayer;
  const previous = [...queue];
  function gtag() { queue.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', {ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('js', new Date());
  gtag('config', id, {send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:'https://msense.me'+path(),page_referrer:cleanReferrer,...campaign});
  const params = () => ({send_to:id,page_location:'https://msense.me'+path(),page_title:path(),page_referrer:cleanReferrer,...campaign});
  function forward(item) {
    if (!allowed() || !item || !events.has(item.event)) return;
    gtag('event', item.event, {...params(),funnel:item.event.startsWith('math_')?'math':'python',label:labels.has(item.label)?item.label:''});
  }
  const push = queue.push.bind(queue);
  queue.push = function(...items) { const result=push(...items); items.forEach(forward); return result; };
  previous.forEach(forward);
  let lastPath;
  function page() {
    window['ga-disable-'+id] = !allowed();
    if (!allowed() || lastPath === path()) return;
    lastPath = path();
    gtag('set', {page_location:'https://msense.me'+lastPath,page_title:lastPath,page_referrer:cleanReferrer});
    gtag('event','page_view',params());
  }
  page();
  // Check navigation synchronously so private routes cannot inherit marketing collection.
  for (const method of ['pushState','replaceState']) {
    const original=history[method];
    history[method]=function(...args){const result=original.apply(this,args);page();return result;};
  }
  window.addEventListener('popstate',page);
  document.addEventListener('click',e=>{
    const a=e.target.closest?.('a[href]'); if(!a || !allowed())return;
    const u=new URL(a.href,location.href);
    const destination=u.pathname.replace(/\/$/,'')||'/';
    if(u.origin===location.origin && ['/python','/trial','/math'].includes(destination) && (u.hash==='#apply'||destination==='/trial')) {
      gtag('event','trial_link_click',{...params(),destination});
    }
  });
  const script=document.createElement('script');script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+id;
  document.head.appendChild(script);
})();
