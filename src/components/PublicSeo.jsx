import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { publicSeo } from '../utils/publicSeo';
import { studioSchema } from '../utils/studioSeo';
export default function PublicSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    let path = pathname.replace(/\/$/, '') || '/';
    if (path === '/trial/python') path = '/python';
    const data = publicSeo[path];
    const nodes = [];
    // Replace the prerendered head too, so client navigation cannot retain another page's canonical.
    document.querySelectorAll('meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], script[data-public-seo-schema]').forEach(node => node.remove());
    document.title = data?.title || '메타센스';
    if (!data) return;
    const add = (tag, attrs) => { const node = document.createElement(tag); Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v)); document.head.appendChild(node); nodes.push(node); };
    const url = `https://msense.me${path === '/' ? '/' : `${path}/`}`;
    add('meta', { name: 'description', content: data.description });
    add('meta', { name: 'robots', content: 'index,follow,max-image-preview:large' });
    add('link', { rel: 'canonical', href: url });
    for (const [key, value] of Object.entries({ type: 'website', title: data.title, description: data.description, url, image: 'https://msense.me/python-showcase/game-poster.webp' })) add('meta', { property: `og:${key}`, content: value });
    if (path === '/python-game-studio') {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.publicSeoSchema = '';
      script.textContent = JSON.stringify(studioSchema).replace(/</g, '\\u003c');
      document.head.appendChild(script);
      nodes.push(script);
    }
    return () => nodes.forEach(node => node.remove());
  }, [pathname]);
  return null;
}
