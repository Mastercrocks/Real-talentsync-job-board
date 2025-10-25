# StockView — Robinhood-style Live Dashboard

Vite + React dashboard inspired by the Robinhood UI. Uses Tailwind CSS, Framer Motion, and Recharts. The app fetches real market data from Finnhub — no mock data in production.

Key files & where to find them
- `index.html` — Vite entry
- `package.json` — npm scripts
- `src/main.jsx` — app entry
- `src/App.jsx` — root App component
- `src/pages/Dashboard.jsx` — main dashboard page (wires sections)
- `src/components/` — React components (Navbar, StockCard, TrendingList, Chart)
- `src/styles/index.css` — Tailwind directives and app styles
  
APIs
- `src/api/fetchFinnhub.js` — Finnhub client (quotes, candles, search, market news, social sentiment)
- `src/api/newsAggregator.js` — Aggregates Finnhub general + company news, adds simple sentiment labels
- `src/api/sentimentScanner.js` — Real early penny stock sentiment scanner (7‑day aggregation)

Run locally (requires Finnhub API key)
```powershell
npm install
npm run dev

# open http://localhost:5173/
```

Create a `.env` file in the project root and add:

```
VITE_FINNHUB_KEY=your_finnhub_api_key_here
```

Restart the dev server after creating or editing `.env`. In development, the Navbar shows a tiny badge indicating whether the API key is detected.

If some files are not visible in the VS Code Explorer:
- Click the refresh icon in the Explorer view, or press Ctrl+R to reload the window.
- Make sure there are no file filters enabled in the Explorer view.
- If using OneDrive, ensure files have finished syncing and are present on disk (green check or available locally).

If anything is still missing, tell me the filename and I will recreate or show its path.
Deploy to Railway

Static Site (recommended):
1. Create a Static Site service
2. Variables → add `VITE_FINNHUB_KEY`
3. Build command: `npm ci && npm run build`
4. Output directory: `dist`
5. Deploy, then attach a custom domain in the Domains tab (no port needed)

Node service (optional):
1. Variables → add `VITE_FINNHUB_KEY`
2. Build command: `npm ci && npm run build`
3. Start command: `vite preview --host 0.0.0.0 --port $PORT`
4. Deploy and attach domain

Notes
- Vite embeds env vars at build time. Set `VITE_FINNHUB_KEY` before triggering a build on Railway.
- The News widget uses exponential backoff on 429 responses and shows last-good results when available.
- The Early Penny Stock Movers may be empty if Finnhub has limited social data for the current tickers; it refreshes every 2 minutes.
