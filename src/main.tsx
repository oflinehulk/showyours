import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Initialize theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
