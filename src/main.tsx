import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- Debug instrumentation (temporary) -------------------------------
// Adds global handlers and a fetch wrapper to log outgoing requests
// and responses for easier debugging in the browser console.
try {
	console.log("[debug] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL || "(not set)");

	// Global error handlers
	window.addEventListener("error", (ev) => {
		// @ts-ignore
		console.error("[debug] window.error:", ev.error ?? ev.message, ev);
	});
	window.addEventListener("unhandledrejection", (ev) => {
		// @ts-ignore
		console.error("[debug] unhandledrejection:", ev.reason);
	});

	// Wrap fetch to log requests and responses (non-invasive)
	const _fetch = window.fetch.bind(window);
	// @ts-ignore
	window.fetch = async (...args) => {
		try {
			console.groupCollapsed("[debug][fetch]", args[0]);
			console.log("[debug][fetch] args:", args);
			const res = await _fetch(...args);
			console.log("[debug][fetch] status:", res.status, res.statusText);
			// Try to read a text body for debugging (safe for most responses)
			try {
				const clone = res.clone();
				clone.text().then((body) => {
					if (body) console.log("[debug][fetch] body:", body);
				}).catch(() => {});
			} catch (e) {}
			console.groupEnd();
			return res;
		} catch (err) {
			console.error("[debug][fetch] error:", err);
			throw err;
		}
	};
} catch (e) {
	// If anything goes wrong here, don't block app rendering
	// eslint-disable-next-line no-console
	console.error("[debug] instrumentation failed", e);
}

// ─── Register Service Worker for Push Notifications ──────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[SW] Registered, scope:', reg.scope);
        // Check for updates periodically
        setInterval(() => reg.update(), 60 * 60 * 1000); // every hour
      })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
