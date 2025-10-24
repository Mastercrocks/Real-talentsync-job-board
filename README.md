# StockView — Robinhood-style Dashboard (Demo)

This repository contains a Vite + React demo dashboard inspired by the Robinhood UI. It uses Tailwind CSS, Framer Motion and Recharts. The app runs in demo mode using static sample data.

Key files & where to find them
- `index.html` — Vite entry
- `package.json` — npm scripts
- `src/main.jsx` — app entry
- `src/App.jsx` — root App component
- `src/pages/Dashboard.jsx` — main dashboard page (wires demo data)
- `src/components/` — React components (Navbar, StockCard, TrendingList, Chart)
- `src/data/stocksData.js` — demo dataset used by the page
- `src/styles/index.css` — Tailwind directives and app styles

Run locally
```powershell
npm install
npm run dev

# open http://localhost:5173/
```

If some files are not visible in the VS Code Explorer:
- Click the refresh icon in the Explorer view, or press Ctrl+R to reload the window.
- Make sure there are no file filters enabled in the Explorer view.
- If using OneDrive, ensure files have finished syncing and are present on disk (green check or available locally).

If anything is still missing, tell me the filename and I will recreate or show its path.

Live data (optional):
- The app can fetch live quotes from Finnhub. To enable this, create a file named `.env` in the project root and add:

```
VITE_FINNHUB_KEY=your_finnhub_api_key_here
```

Then restart the dev server. When a valid key is present the dashboard will attempt to replace demo prices with live quotes.

Note: the demo `pennyDemo` list now uses real tickers (SNDL, SIRI, BB, NOK, ZNGA). Prices in the demo file are illustrative; for accurate live prices provide a Finnhub key as above.
