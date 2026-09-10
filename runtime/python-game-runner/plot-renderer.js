// Matplotlib's Agg images stay within the isolated runner; no project uploads.
(() => {
  let root;
  const images = new Map();
  window.studioPlotRender = (number, data) => {
    if (!root) {
      root = document.createElement('section'); root.id = 'plot-root';
      root.setAttribute('aria-label', '그래프 결과'); root.tabIndex = 0;
      Object.assign(root.style, { position: 'absolute', inset: '0', overflow: 'auto', background: '#080f20', padding: '12px', boxSizing: 'border-box', zIndex: '3' });
      document.body.append(root);
    }
    root.hidden = false;
    let image = images.get(number);
    if (!image) {
      if (images.size >= 20) throw new Error('한 번에 그래프 20개까지 표시할 수 있습니다.');
      image = document.createElement('img'); image.alt = `그래프 ${number}`;
      Object.assign(image.style, { display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto 16px', background: 'white' });
      root.append(image); images.set(number, image);
    }
    image.src = `data:image/png;base64,${data}`;
  };
  window.studioPlotReset = preserve => {
    if (preserve) return;
    images.clear(); root?.remove(); root = null;
  };
})();
