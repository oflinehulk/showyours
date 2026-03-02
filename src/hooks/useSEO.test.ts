import { renderHook } from '@testing-library/react';
import { useSEO } from './useSEO';

describe('useSEO', () => {
  beforeEach(() => {
    document.title = 'ShowYours';
    document.querySelectorAll('meta[property^="og:"], meta[name="description"], meta[name^="twitter:"]').forEach(el => el.remove());
    document.querySelector('link[rel="canonical"]')?.remove();
  });

  it('sets document.title with suffix', () => {
    renderHook(() => useSEO({ title: 'Find Players' }));
    expect(document.title).toBe('Find Players | ShowYours');
  });

  it('sets document.title without suffix when title is ShowYours', () => {
    renderHook(() => useSEO({ title: 'ShowYours' }));
    expect(document.title).toBe('ShowYours');
  });

  it('sets meta description', () => {
    renderHook(() => useSEO({ title: 'Test', description: 'Custom desc' }));
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('Custom desc');
  });

  it('uses default description when none provided', () => {
    renderHook(() => useSEO({ title: 'Test' }));
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toContain('MLBB recruitment platform');
  });

  it('sets og:title and og:description', () => {
    renderHook(() => useSEO({ title: 'Players', description: 'Browse players' }));
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Players | ShowYours');
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Browse players');
  });

  it('sets canonical link URL', () => {
    renderHook(() => useSEO({ title: 'Test', path: '/players' }));
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(link?.getAttribute('href')).toBe('https://showyours.lovable.app/players');
  });

  it('uses base URL when no path provided', () => {
    renderHook(() => useSEO({ title: 'Test' }));
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(link?.getAttribute('href')).toBe('https://showyours.lovable.app');
  });

  it('cleanup resets document.title', () => {
    const { unmount } = renderHook(() => useSEO({ title: 'Custom Title' }));
    expect(document.title).toBe('Custom Title | ShowYours');
    unmount();
    expect(document.title).toBe('ShowYours');
  });
});
