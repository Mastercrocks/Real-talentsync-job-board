import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { scanTrendingPennyStocks } from '../api/sentimentScanner'

export default function TrendingPennyScanner({ refreshInterval = 5000 }) {
  const [trendingStocks, setTrendingStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredStock, setHoveredStock] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const [stale, setStale] = useState(false)

  async function scanStocks() {
    try {
      setLoading(true)
      setError(null)
      const stocks = await scanTrendingPennyStocks()
      if (Array.isArray(stocks) && stocks.length > 0) {
        setTrendingStocks(stocks)
        setStale(false)
        try { localStorage.setItem('pennyScanner:lastGood', JSON.stringify({ t: Date.now(), items: stocks })) } catch {}
      } else {
        // Use last-good cache if available
        try {
          const raw = localStorage.getItem('pennyScanner:lastGood')
          if (raw) {
            const cache = JSON.parse(raw)
            if (Array.isArray(cache.items) && cache.items.length > 0) {
              setTrendingStocks(cache.items)
              setStale(true)
            } else {
              setTrendingStocks([])
              setStale(false)
            }
          } else {
            setTrendingStocks([])
            setStale(false)
          }
        } catch {
          setTrendingStocks([])
          setStale(false)
        }
      }
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to scan real sentiment data:', error)
      setError(`Unable to load real sentiment data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    scanStocks()
    const interval = setInterval(scanStocks, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const formatTime = (timestamp) => {
    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const getHypeColor = (score) => {
    if (score > 300) return 'text-red-400'
    if (score > 200) return 'text-orange-400'
    if (score > 100) return 'text-yellow-400'
    return 'text-gray-400'
  }

  const getHypeBarWidth = (score) => {
    return Math.min(100, (score / 500) * 100)
  }

  const sentimentColors = ['#10B981', '#6B7280', '#EF4444'] // green, gray, red

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-card border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🚀 Early Penny Stock Movers 
          {loading && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {lastUpdate && <span>Updated {formatTime(lastUpdate.getTime())}</span>}
          {stale && <span className="text-amber-400">Showing last good results</span>}
          <button 
            onClick={scanStocks}
            disabled={loading}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
          >
            Scan
          </button>
        </div>
      </div>

      {/* Info banners */}
      {trendingStocks.some(s => s.fallback === 'price') && (
        <div className="mb-3 text-xs text-gray-300 bg-gray-900/40 border border-gray-700 rounded p-2">
          Using price-based early movers because no recent social sentiment was found for the current rotation.
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {trendingStocks.map((stock, index) => (
            <motion.div
              key={stock.ticker}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="relative bg-gray-900/40 border border-gray-700 rounded-lg p-3 hover:bg-gray-900/60 transition-colors"
              onMouseEnter={() => setHoveredStock(stock)}
              onMouseLeave={() => setHoveredStock(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white">${stock.ticker}</span>
                    <span className="text-xs text-gray-400">#{index + 1}</span>
                    {stock.trending && <span className="text-xs bg-red-500 text-white px-1 rounded">🔥 HOT</span>}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-emerald-400">${stock.price.toFixed(3)}</span>
                    <span className={stock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(1)}%
                    </span>
                    <span className="text-gray-300">{stock.mentions} mentions</span>
                    {stock.fallback && (
                      <span className="text-[10px] text-gray-400 bg-gray-700/60 px-1 py-0.5 rounded">
                        {stock.fallback === 'price5' ? 'sub-$5 price' : stock.fallback === 'price10' ? 'sub-$10 price' : stock.fallback === 'price20' ? 'sub-$20 price' : 'price-based'}
                      </span>
                    )}
                  </div>

                  {/* Hype Score Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">Hype Score</span>
                      <span className={getHypeColor(stock.hypeScore)}>{stock.hypeScore}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-red-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${getHypeBarWidth(stock.hypeScore)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Mini mention trend chart */}
                <div className="w-24 h-12 ml-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stock.mentionHistory || []}>
                      <Line 
                        type="monotone" 
                        dataKey="mentions" 
                        stroke={stock.hypeScore > 200 ? '#EF4444' : '#10B981'} 
                        strokeWidth={1.5} 
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sentiment breakdown on hover */}
              {hoveredStock?.ticker === stock.ticker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg p-3 z-10 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Positive', value: stock.sentiment.positive },
                              { name: 'Neutral', value: stock.sentiment.neutral },
                              { name: 'Negative', value: stock.sentiment.negative }
                            ]}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={30}
                          >
                            {sentimentColors.map((color, index) => (
                              <Cell key={index} fill={color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-xs space-y-1">
                      <div>📈 Positive: {stock.sentiment.positive}%</div>
                      <div>😐 Neutral: {stock.sentiment.neutral}%</div>
                      <div>📉 Negative: {stock.sentiment.negative}%</div>
                      <div className="text-gray-400 mt-2">
                        Sources: r/{stock.sources.reddit} | 𝕏/{stock.sources.twitter} | ST/{stock.sources.stocktwits}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {error && (
        <div className="text-center text-red-400 py-8">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-medium mb-2">Real Data Error</div>
          <div className="text-sm text-gray-300 mb-3">{error}</div>
          <button 
            onClick={scanStocks}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
          >
            Retry Real Sentiment Scan
          </button>
        </div>
      )}

      {trendingStocks.length === 0 && !loading && !error && (
        <div className="text-center text-gray-400 py-8">
          <div className="text-2xl mb-2">🔍</div>
          <div>No real sentiment data available right now</div>
          <div className="text-xs mt-1">We rotate ticker sets every 2 minutes. Try Scan again shortly.</div>
        </div>
      )}
    </div>
  )
}