import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { fetchQuotes, fetchCandles } from '../api/fetchFinnhub'

export default function TopGainers({ onStockClick, refreshInterval = 120000 }) {
  const [activeTab, setActiveTab] = useState('gainers')
  const [gainers, setGainers] = useState([])
  const [losers, setLosers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [sparklineData, setSparklineData] = useState({})
  const [hoveredStock, setHoveredStock] = useState(null)

  // Helper function to get company names
  const getCompanyName = (ticker) => {
    const names = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'NVDA': 'NVIDIA Corporation',
      'GOOGL': 'Alphabet Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'GOOG': 'Alphabet Inc.',
      'UNH': 'UnitedHealth Group',
      'XOM': 'Exxon Mobil Corporation',
      'JNJ': 'Johnson & Johnson',
      'JPM': 'JPMorgan Chase & Co.',
      'V': 'Visa Inc.',
      'PG': 'Procter & Gamble',
      'HD': 'Home Depot Inc.',
      'CVX': 'Chevron Corporation',
      'MA': 'Mastercard Inc.',
      'ABBV': 'AbbVie Inc.',
      'PFE': 'Pfizer Inc.',
      'LLY': 'Eli Lilly and Company',
      'BAC': 'Bank of America',
      'KO': 'Coca-Cola Company',
      'PEP': 'PepsiCo Inc.',
      'WMT': 'Walmart Inc.',
      'COST': 'Costco Wholesale',
      'MRK': 'Merck & Co.',
      'ADBE': 'Adobe Inc.',
      'DIS': 'Walt Disney Company',
      'VZ': 'Verizon Communications',
      'NFLX': 'Netflix Inc.',
      'CRM': 'Salesforce Inc.',
      'NKE': 'Nike Inc.',
      'INTC': 'Intel Corporation',
      'QCOM': 'Qualcomm Inc.',
      'AMD': 'Advanced Micro Devices',
    }
    return names[ticker] || ticker
  }

  // Local implementation of fetchTopGainers using the working fetchQuotes
  const fetchTopMoversData = async (type = 'gainers') => {
    // Keep this list reasonably small to respect free-tier rate limits
    const majorTickers = [
      'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'GOOG',
      'UNH', 'XOM', 'JNJ', 'JPM', 'V', 'PG', 'HD', 'CVX',
      'MA', 'ABBV', 'WMT', 'COST', 'MRK', 'NFLX', 'CRM', 'NKE',
      'INTC', 'QCOM', 'AMD'
    ]
    
    // Fetch quotes for all major tickers
    const quotes = await fetchQuotes(majorTickers)
    
    // Convert to array with calculated metrics (guard against nulls)
    const stocksWithMetrics = Object.entries(quotes)
      .filter(([, data]) => data && typeof data.price === 'number' && !isNaN(data.price))
      .map(([ticker, data]) => {
        const change = typeof data.change === 'number' && !isNaN(data.change) ? data.change : 0
        const changePercent = typeof data.changePercent === 'number' && !isNaN(data.changePercent) ? data.changePercent : 0
        const price = data.price
        const previousClose = (typeof price === 'number' && typeof change === 'number') ? price - change : price
        return {
          ticker,
          companyName: getCompanyName(ticker),
          price,
          change,
          changePercent,
          volume: data.volume || 0,
          marketCap: data.marketCap || 0,
          previousClose,
          dayHigh: data.dayHigh || price,
          dayLow: data.dayLow || price,
          lastUpdated: Date.now()
        }
      })
      .filter(stock => stock.price > 0)
    
    // Sort by change percentage
    const sorted = stocksWithMetrics.sort((a, b) => {
      return type === 'gainers' 
        ? b.changePercent - a.changePercent 
        : a.changePercent - b.changePercent
    })
    
    return sorted.slice(0, 10) // Top 10
  }

  const loadTopMovers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading top movers data...')
      
  const gainerData = await fetchTopMoversData('gainers')
  const loserData = await fetchTopMoversData('losers')
      
      console.log('Gainers data:', gainerData)
      console.log('Losers data:', loserData)
      
      // If no data, show empty state instead of error; avoid tripping the red error box
      
      setGainers(gainerData)
      setLosers(loserData)
      setLastUpdate(new Date())
      
      // Load sparkline data for all stocks
      await loadSparklines([...gainerData, ...loserData])
      
    } catch (error) {
      console.error('Failed to load top movers:', error)
      setError(`Unable to load real market data: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadSparklines = async (stocks) => {
    const sparklines = {}
    const now = Math.floor(Date.now() / 1000)
    const from = now - 24 * 60 * 60 // last 24 hours

    for (const stock of stocks.slice(0, 5)) { // Further limit API calls to reduce 429s
      try {
        const data = await fetchCandles(stock.ticker, '5', from, now)
        if (data && Array.isArray(data.c) && data.c.length > 0 && Array.isArray(data.t)) {
          // Build last 20 points
          const len = data.c.length
          const start = Math.max(0, len - 20)
          sparklines[stock.ticker] = data.c.slice(start).map((close, i) => ({
            time: data.t[start + i] * 1000,
            price: close
          }))
          continue
        }
        // Fallback minimal trend if no candle data returned
        sparklines[stock.ticker] = Array.from({ length: 20 }, (_, i) => ({
          time: Date.now() - (20 - i) * 5 * 60 * 1000,
          price: stock.previousClose + (stock.change * (i / 19))
        }))
      } catch (error) {
        console.warn(`Failed to load sparkline for ${stock.ticker}:`, error.message)
        sparklines[stock.ticker] = Array.from({ length: 20 }, (_, i) => ({
          time: Date.now() - (20 - i) * 5 * 60 * 1000,
          price: stock.previousClose + (stock.change * (i / 19))
        }))
      }
    }
    setSparklineData(sparklines)
  }

  useEffect(() => {
    loadTopMovers()
    const interval = setInterval(loadTopMovers, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const getCurrentStocks = () => activeTab === 'gainers' ? gainers : losers

  const formatPrice = (price) => {
    if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`
    if (price >= 100) return `$${price.toFixed(0)}`
    if (price >= 10) return `$${price.toFixed(2)}`
    return `$${price.toFixed(3)}`
  }

  const formatVolume = (volume) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`
    return volume.toString()
  }

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-card border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          📈 Top Movers Today
          {loading && <div className="w-2 h-2 bg-robinGreen rounded-full animate-pulse"></div>}
        </h2>
        
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Updated {formatTimeAgo(lastUpdate.getTime())}
            </span>
          )}
          <button
            onClick={loadTopMovers}
            disabled={loading}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setActiveTab('gainers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'gainers'
              ? 'bg-robinGreen text-black'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Top Gainers ({gainers.length})
        </button>
        <button
          onClick={() => setActiveTab('losers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'losers'
              ? 'bg-red-500 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Top Losers ({losers.length})
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center text-red-400 py-8">
          <div className="text-3xl mb-2">⚠️</div>
          <div className="font-medium mb-2">Real Data Error</div>
          <div className="text-sm text-gray-300 mb-3">{error}</div>
          <button 
            onClick={loadTopMovers}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
          >
            Retry Real Data
          </button>
        </div>
      )}

      {/* Stock Grid */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {getCurrentStocks().map((stock, index) => (
              <motion.div
                key={stock.ticker}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="relative bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-900/70 transition-all cursor-pointer group"
                onClick={() => onStockClick && onStockClick(stock)}
                onMouseEnter={() => setHoveredStock(stock)}
                onMouseLeave={() => setHoveredStock(null)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-white text-sm">{stock.ticker}</div>
                    <div className="text-xs text-gray-400 truncate max-w-24">
                      {stock.companyName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white text-sm">
                      {formatPrice(stock.price)}
                    </div>
                    <div className={`text-xs font-medium ${
                      stock.changePercent >= 0 ? 'text-robinGreen' : 'text-red-400'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}
                      {stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="h-12 mb-3">
                  {sparklineData[stock.ticker] ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData[stock.ticker]}>
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={stock.changePercent >= 0 ? '#00C805' : '#EF4444'}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded animate-pulse"></div>
                  )}
                </div>

                {/* Change Amount */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Change</span>
                  <span className={`font-medium ${
                    stock.changePercent >= 0 ? 'text-robinGreen' : 'text-red-400'
                  }`}>
                    {stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}
                  </span>
                </div>

                {/* Hover Details */}
                {hoveredStock?.ticker === stock.ticker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 z-10 shadow-lg"
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Open:</span>
                        <span className="text-white">{formatPrice(stock.previousClose)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">High:</span>
                        <span className="text-white">{formatPrice(stock.dayHigh)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Low:</span>
                        <span className="text-white">{formatPrice(stock.dayLow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Volume:</span>
                        <span className="text-white">{formatVolume(stock.volume)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Click indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-6 h-6 bg-robinGreen/20 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-robinGreen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!error && !loading && getCurrentStocks().length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <div className="text-3xl mb-2">📊</div>
          <div>No market movers data available</div>
          <div className="text-xs mt-1">Waiting for real market data...</div>
        </div>
      )}
    </div>
  )
}