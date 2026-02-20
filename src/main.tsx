import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Always dark mode - Tron aesthetic
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
