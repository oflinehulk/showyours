import type { Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vital] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`);
  }

  // In production, send to your analytics endpoint
  // Example: navigator.sendBeacon('/api/vitals', JSON.stringify(metric));
}

export function reportWebVitals() {
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  });
}
