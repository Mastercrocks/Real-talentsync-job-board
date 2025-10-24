export const stocksDemo = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    price: 172.42,
    changePercent: 0.72,
    marketCap: 2.7e12,
    history: generateHistory(30, 165, 174)
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    price: 380.12,
    changePercent: -0.31,
    marketCap: 2.3e12,
    history: generateHistory(30, 370, 385)
  },
  {
    ticker: 'TSLA',
    name: 'Tesla, Inc.',
    price: 263.59,
    changePercent: 2.98,
    marketCap: 820e9,
    history: generateHistory(30, 230, 270)
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp.',
    price: 770.11,
    changePercent: -1.23,
    marketCap: 1.1e12,
    history: generateHistory(30, 700, 820)
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 146.87,
    changePercent: 1.1,
    marketCap: 1.5e12,
    history: generateHistory(30, 135, 150)
  },
  {
    ticker: 'META',
    name: 'Meta Platforms, Inc.',
    price: 360.22,
    changePercent: -0.8,
    marketCap: 900e9,
    history: generateHistory(30, 340, 380)
  },
  {
    ticker: 'GOOG',
    name: 'Alphabet Inc.',
    price: 144.33,
    changePercent: 0.45,
    marketCap: 1.8e12,
    history: generateHistory(30, 136, 148)
  }
]

// Use legitimate, real-world tickers for demo penny stocks. Prices are demo-only and will be replaced
// by live data if you provide a Finnhub API key (see README).
export const pennyDemo = [
  { ticker: 'SNDL', price: 0.95, changePercent: 4.2, history: generateHistory(15, 0.6, 1.1) }, // Sundial Growers
  { ticker: 'SIRI', price: 4.12, changePercent: -1.3, history: generateHistory(15, 3.8, 4.4) }, // Sirius XM
  { ticker: 'BB', price: 4.85, changePercent: 2.1, history: generateHistory(15, 4.0, 5.1) }, // BlackBerry
  { ticker: 'NOK', price: 3.22, changePercent: 0.5, history: generateHistory(15, 2.8, 3.6) }, // Nokia
  { ticker: 'ZNGA', price: 3.05, changePercent: 6.8, history: generateHistory(15, 2.2, 3.1) }  // Zynga
]

function randBetween(a,b){ return a + Math.random()*(b-a) }

export function generateHistory(points=20, low=1, high=10){
  const arr = []
  for(let i=0;i<points;i++){
    const v = randBetween(low, high)
    arr.push({ name: `${i}`, value: Number(v.toFixed(2)) })
  }
  return arr
}
