import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  path?: string;
}

const BASE_TITLE = 'ShowYours';
const BASE_URL = 'https://showyours.lovable.app';
const DEFAULT_DESCRIPTION = 'MLBB recruitment platform — find players, build squads, host tournaments effortlessly.';

export function useSEO({ title, description, path }: SEOProps) {
  useEffect(() => {
    const fullTitle = title === BASE_TITLE ? title : `${title} | ${BASE_TITLE}`;
    document.title = fullTitle;

    const desc = description || DEFAULT_DESCRIPTION;
    const url = path ? `${BASE_URL}${path}` : BASE_URL;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }, [title, description, path]);
}
