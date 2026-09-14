import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { publicSeo } from '../utils/publicSeo';
export default function PublicSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    let path = pathname.replace(/\/$/, '') || '/';
    if (path === '/trial/python') path = '/python';
    const data = publicSeo[path];
    const nodes = [];
    // Replace the prerendered head too, so client navigation cannot retain another page's canonical.
    document.querySelectorAll('meta[name="description"], link[rel="canonical"], meta[property^="og:"]').forEach(node => node.remove());
    document.title = data?.title || '메타센스';
    if (!data) return;
    const add = (tag, attrs) => { const node = document.createElement(tag); Object.entries(attrs).forEach(([k,v]) => node.setAttribute(k,v)); document.head.appendChild(node); nodes.push(node); };
    const url = `https://msense.me${path === '/' ? '/' : path}`;
    add('meta', { name: 'description', content: data.description });
    add('link', { rel: 'canonical', href: url });
    for (const [key, value] of Object.entries({ type: 'website', title: data.title, description: data.description, url, image: 'https://msense.me/python-showcase/game-poster.webp' })) add('meta', { property: `og:${key}`, content: value });
    return () => nodes.forEach(node => node.remove());
  }, [pathname]);
  return null;
}
