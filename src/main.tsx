import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Initialize error tracking
initSentry();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Force reload when Safari restores page from bfcache (back-forward cache)
// This prevents showing stale CSS/JS after backgrounding and reopening the browser
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

// Always dark mode - Tron aesthetic
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);

// Report Web Vitals for performance monitoring
import('./lib/reportWebVitals').then(({ reportWebVitals }) => reportWebVitals());
