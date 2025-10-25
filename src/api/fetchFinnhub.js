import axios from 'axios'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
// Safely read env values — in the browser `process` is undefined, so guard accesses to avoid ReferenceError
let TOKEN = null
try {
  // Vite exposes env via import.meta.env in ESM modules
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FINNHUB_KEY) {
    TOKEN = import.meta.env.VITE_FINNHUB_KEY
  }
} catch (e) {
  // ignore — import.meta may not be readable in some environments
}
if (!TOKEN && typeof process !== 'undefined' && process.env && process.env.VITE_FINNHUB_KEY) {
  TOKEN = process.env.VITE_FINNHUB_KEY
}

// Developer-friendly console warning if token is missing
if (!TOKEN) {
  try {
    const dev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
    if (dev) {
      // eslint-disable-next-line no-console
      console.warn('[StockView] Finnhub API key not found. Set VITE_FINNHUB_KEY in your .env and restart the dev server.')
    }
  } catch (_) {
    // ignore
  }
}

async function fetchQuote(ticker) {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${TOKEN}`
  const res = await axios.get(url)
  return res.data
}

// resolution: 1,5,15,30,60 (minutes), D (day), W, M
async function fetchCandlesRaw(ticker, resolution, fromTs, toTs) {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const url = `${FINNHUB_BASE}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=${encodeURIComponent(resolution)}&from=${Math.floor(fromTs)}&to=${Math.floor(toTs)}&token=${TOKEN}`
  const res = await axios.get(url)
  return res.data
}

// Fetch multiple quotes sequentially (simple, respects typical rate limits)
export async function fetchQuotes(tickers = []) {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const out = {}
  for (const t of tickers) {
    try {
      const q = await fetchQuote(t)
      // Finnhub returns c (current), d (change), dp (change percent)
      out[t] = {
        price: q.c,
        change: q.d,
        changePercent: q.dp
      }
    } catch (err) {
      // ignore single failures
      out[t] = null
    }
  }
  return out
}

export async function fetchCandlesForTicker(ticker, resolution = 'D', fromTs, toTs) {
  const now = Math.floor(Date.now() / 1000)
  if (!fromTs || !toTs) {
    if (['1','5','15','30','60'].includes(String(resolution))) {
      // default to last 24 hours for intraday
      fromTs = now - 24 * 60 * 60
      toTs = now
    } else if (resolution === 'D') {
      // last 90 days
      fromTs = now - 90 * 24 * 60 * 60
      toTs = now
    } else if (resolution === 'W') {
      fromTs = now - 52 * 7 * 24 * 60 * 60
      toTs = now
    } else if (resolution === 'M') {
      fromTs = now - 365 * 24 * 60 * 60
      toTs = now
    }
  }
  console.log('fetchCandlesForTicker:', ticker, resolution, 'from:', new Date(fromTs * 1000), 'to:', new Date(toTs * 1000))
  const data = await fetchCandlesRaw(ticker, resolution, fromTs, toTs)
  console.log('Raw candle response:', data)
  return data
}

// Provide a TRUE named export exactly called `fetchCandles`
export async function fetchCandles(ticker, resolution = 'D', fromTs, toTs) {
  return fetchCandlesForTicker(ticker, resolution, fromTs, toTs)
}

// Symbol search (for autocomplete or opening any ticker)
export async function searchSymbol(query) {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const url = `${FINNHUB_BASE}/search?q=${encodeURIComponent(query)}&token=${TOKEN}`
  const res = await axios.get(url)
  // Finnhub returns { count, result: [ { description, displaySymbol, symbol, type }, ... ] }
  return res.data
}
// Some imports might request a lowercase name by mistake; export an alias to be robust
export { searchSymbol as searchsymbol }

// List all symbols for an exchange (e.g., 'US'). CAUTION: this can be large.
export async function listSymbols(exchange = 'US') {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const url = `${FINNHUB_BASE}/stock/symbol?exchange=${encodeURIComponent(exchange)}&token=${TOKEN}`
  const res = await axios.get(url)
  return res.data // array of { description, displaySymbol, symbol, type, currency }
}

// Fetch market news from Finnhub
export async function fetchMarketNews(category = 'general', minId = 0) {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const url = `${FINNHUB_BASE}/news?category=${encodeURIComponent(category)}&minId=${minId}&token=${TOKEN}`
  const res = await axios.get(url)
  return res.data // array of news articles
}

// Fetch social sentiment for a ticker from Finnhub
export async function fetchSocialSentiment(ticker, from, to) {
  if (!TOKEN) throw new Error('No Finnhub API key')
  const fromDate = from || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const toDate = to || new Date().toISOString().split('T')[0]
  const url = `${FINNHUB_BASE}/stock/social-sentiment?symbol=${encodeURIComponent(ticker)}&from=${fromDate}&to=${toDate}&token=${TOKEN}`
  const res = await axios.get(url)
  return res.data
}

// Fetch top gainers/losers from market movers
export async function fetchTopGainers(type = 'gainers') {
  if (!TOKEN) throw new Error('No Finnhub API key')
  
  try {
    // Fetch major US tickers first (S&P 500 companies)
    const majorTickers = [
      'AAPL', 'MSFT', 'AMZN', 'NVDA', 'GOOGL', 'TSLA', 'META', 'GOOG', 'BRK.B', 'UNH',
      'XOM', 'JNJ', 'JPM', 'V', 'PG', 'AVGO', 'HD', 'CVX', 'MA', 'ABBV',
      'PFE', 'LLY', 'BAC', 'KO', 'PEP', 'TMO', 'WMT', 'COST', 'MRK', 'ADBE',
      'DIS', 'ABT', 'ACN', 'DHR', 'VZ', 'NFLX', 'CRM', 'NKE', 'TXN', 'CMCSA',
      'INTC', 'NEE', 'RTX', 'QCOM', 'AMD', 'PM', 'UPS', 'LOW', 'T', 'BMY'
    ]
    
    // Fetch quotes for all major tickers
    const quotes = await fetchQuotes(majorTickers)
    
    // Convert to array with calculated metrics
    const stocksWithMetrics = Object.entries(quotes).map(([ticker, data]) => ({
      ticker,
      companyName: getCompanyName(ticker),
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume || 0,
      marketCap: data.marketCap || 0,
      previousClose: data.previousClose || (data.price - data.change),
      dayHigh: data.dayHigh || data.price,
      dayLow: data.dayLow || data.price,
      lastUpdated: Date.now()
    })).filter(stock => stock.price > 0 && Math.abs(stock.changePercent) > 0.1) // Filter out invalid data
    
    // Sort by change percentage
    const sorted = stocksWithMetrics.sort((a, b) => {
      return type === 'gainers' 
        ? b.changePercent - a.changePercent 
        : a.changePercent - b.changePercent
    })
    
    return sorted.slice(0, 10) // Top 10
    
  } catch (error) {
    console.error('Error fetching top gainers:', error)
    throw error
  }
}

// Helper function to get company names
function getCompanyName(ticker) {
  const names = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'AMZN': 'Amazon.com Inc.',
    'NVDA': 'NVIDIA Corporation',
    'GOOGL': 'Alphabet Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'GOOG': 'Alphabet Inc.',
    'BRK.B': 'Berkshire Hathaway',
    'UNH': 'UnitedHealth Group',
    'XOM': 'Exxon Mobil Corporation',
    'JNJ': 'Johnson & Johnson',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'PG': 'Procter & Gamble',
    'AVGO': 'Broadcom Inc.',
    'HD': 'Home Depot Inc.',
    'CVX': 'Chevron Corporation',
    'MA': 'Mastercard Inc.',
    'ABBV': 'AbbVie Inc.',
    'PFE': 'Pfizer Inc.',
    'LLY': 'Eli Lilly and Company',
    'BAC': 'Bank of America',
    'KO': 'Coca-Cola Company',
    'PEP': 'PepsiCo Inc.',
    'TMO': 'Thermo Fisher Scientific',
    'WMT': 'Walmart Inc.',
    'COST': 'Costco Wholesale',
    'MRK': 'Merck & Co.',
    'ADBE': 'Adobe Inc.',
    'DIS': 'Walt Disney Company',
    'ABT': 'Abbott Laboratories',
    'ACN': 'Accenture plc',
    'DHR': 'Danaher Corporation',
    'VZ': 'Verizon Communications',
    'NFLX': 'Netflix Inc.',
    'CRM': 'Salesforce Inc.',
    'NKE': 'Nike Inc.',
    'TXN': 'Texas Instruments',
    'CMCSA': 'Comcast Corporation',
    'INTC': 'Intel Corporation',
    'NEE': 'NextEra Energy',
    'RTX': 'Raytheon Technologies',
    'QCOM': 'Qualcomm Inc.',
    'AMD': 'Advanced Micro Devices',
    'PM': 'Philip Morris International',
    'UPS': 'United Parcel Service',
    'LOW': 'Lowe\'s Companies',
    'T': 'AT&T Inc.',
    'BMY': 'Bristol Myers Squibb'
  }
  return names[ticker] || ticker
}

// Note: fetchTopGainers is already a named export via its function declaration above.
// Avoid re-exporting to prevent "Duplicate export" syntax errors.

export default {
  fetchQuotes,
  fetchCandles: fetchCandlesForTicker,
  searchSymbol,
  listSymbols,
  fetchMarketNews,
  fetchSocialSentiment,
  fetchTopGainers
}
