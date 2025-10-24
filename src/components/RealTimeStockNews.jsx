import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchStockNews, fetchBreakingNews, analyzeSentiment } from '../api/newsAggregator'

export default function RealTimeStockNews({ refreshInterval = 10000 }) {
  const [activeTab, setActiveTab] = useState('major')
  const [majorNews, setMajorNews] = useState([])
  const [pennyNews, setPennyNews] = useState([])
  const [loading, setLoading] = useState(false)
  const [showBreakingOnly, setShowBreakingOnly] = useState(false)
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [lastUpdate, setLastUpdate] = useState(null)

  const [error, setError] = useState(null)

  // Backoff and caching to handle rate limits gracefully
  const defaultIntervalRef = useRef(refreshInterval)
  const backoffRef = useRef(refreshInterval)
  const timerRef = useRef(null)
  const nextRetryAtRef = useRef(null)
  const lastGoodMajorRef = useRef([])
  const lastGoodPennyRef = useRef([])

  const scheduleNext = (delay) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    nextRetryAtRef.current = Date.now() + delay
    timerRef.current = setTimeout(() => {
      // Trigger a full refresh for both categories
      loadNews('major', true)
      loadNews('penny', true)
    }, delay)
  }

  const loadNews = async (category = activeTab, isAuto = false) => {
    setLoading(true)
    setError(null)
    try {
      const news = showBreakingOnly
        ? await fetchBreakingNews(category)
        : await fetchStockNews(category, 20)
      
      if (category === 'major') {
        setMajorNews(news)
        lastGoodMajorRef.current = news
      } else {
        setPennyNews(news)
        lastGoodPennyRef.current = news
      }
      setLastUpdate(new Date())
      // Success: reset backoff
      backoffRef.current = defaultIntervalRef.current
      if (isAuto) {
        scheduleNext(backoffRef.current)
      }
    } catch (error) {
      console.error('Failed to load real news:', error)
      const status = error?.response?.status
      if (status === 429) {
        // Exponential backoff on rate limit
        const nextDelay = Math.min(backoffRef.current * 2, 10 * 60 * 1000)
        backoffRef.current = nextDelay
        const seconds = Math.ceil(nextDelay / 1000)
        setError(`Rate limit from data provider (429). Backing off for ~${seconds}s before retrying.`)
        if (isAuto) {
          scheduleNext(nextDelay)
        }
      } else {
        setError(`Unable to load real news data: ${error.message}`)
        if (isAuto) {
          scheduleNext(backoffRef.current)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initialize timing refs
    defaultIntervalRef.current = refreshInterval
    backoffRef.current = refreshInterval

    // Immediate load
    loadNews('major', false)
    loadNews('penny', false)
    // Start auto polling loop with backoff support
    scheduleNext(backoffRef.current)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [refreshInterval, showBreakingOnly])

  const getCurrentNews = () => {
    const news = activeTab === 'major' ? majorNews : pennyNews
    if (sentimentFilter === 'all') return news
    return news.filter(article => article.sentiment === sentimentFilter)
  }

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'bullish': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      case 'bearish': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'bullish': return '📈'
      case 'bearish': return '📉'
      default: return '😐'
    }
  }

  const currentNews = getCurrentNews()

  return (
    <div className="bg-gray-800 rounded-xl shadow-card border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📰 Real-Time Stock News
            {loading && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {lastUpdate && <span>Updated {formatTimeAgo(lastUpdate.getTime())}</span>}
            {nextRetryAtRef.current && (
              <span className="text-gray-500">
                Next refresh in {Math.max(0, Math.ceil((nextRetryAtRef.current - Date.now()) / 1000))}s
              </span>
            )}
            <button 
              onClick={() => {
                // Manual refresh resets backoff and triggers immediate fetch
                backoffRef.current = defaultIntervalRef.current
                if (timerRef.current) {
                  clearTimeout(timerRef.current)
                  timerRef.current = null
                }
                loadNews(activeTab, false)
                scheduleNext(backoffRef.current)
              }}
              disabled={loading}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setActiveTab('major')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'major' 
                ? 'bg-robinGreen text-black' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Major Stocks ({majorNews.length})
          </button>
          <button
            onClick={() => setActiveTab('penny')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'penny' 
                ? 'bg-robinGreen text-black' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Penny Stocks ({pennyNews.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showBreakingOnly}
              onChange={(e) => setShowBreakingOnly(e.target.checked)}
              className="rounded"
            />
            <span>Breaking Only</span>
          </label>
          
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1"
          >
            <option value="all">All Sentiment</option>
            <option value="bullish">📈 Bullish</option>
            <option value="neutral">😐 Neutral</option>
            <option value="bearish">📉 Bearish</option>
          </select>
        </div>
      </div>

      {/* News Feed */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {currentNews.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border-b border-gray-700/50 hover:bg-gray-900/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-robinGreen/20 text-robinGreen text-xs font-medium rounded">
                      ${article.ticker}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded border ${getSentimentColor(article.sentiment)}`}>
                      {getSentimentIcon(article.sentiment)} {article.sentiment}
                    </span>
                    <span className="text-xs text-gray-500">{article.source}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{formatTimeAgo(article.timestamp)}</span>
                  </div>

                  {/* Headline */}
                  <h4 className="font-medium text-white mb-2 leading-tight">
                    {article.headline}
                  </h4>

                  {/* Summary */}
                  <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                    {article.summary}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded transition-colors"
                    >
                      Read Full Article →
                    </a>
                  </div>
                </div>

                {/* Thumbnail placeholder */}
                {article.thumbnail && (
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex-shrink-0">
                    <img 
                      src={article.thumbnail} 
                      alt="" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {error && (
          <div className="text-center text-red-400 py-8">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="font-medium mb-2">Real Data Error</div>
            <div className="text-sm text-gray-300">{error}</div>
            <button 
              onClick={() => {
                // Manual retry: reset backoff and try now
                backoffRef.current = defaultIntervalRef.current
                if (timerRef.current) {
                  clearTimeout(timerRef.current)
                  timerRef.current = null
                }
                loadNews(activeTab, false)
                scheduleNext(backoffRef.current)
              }}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
            >
              Retry Real Data
            </button>
            {(activeTab === 'major' ? lastGoodMajorRef.current : lastGoodPennyRef.current).length > 0 && (
              <div className="text-xs text-gray-400 mt-3">
                Showing last good results while we retry in the background.
              </div>
            )}
          </div>
        )}

        {currentNews.length === 0 && !loading && !error && (
          <div className="text-center text-gray-400 py-8">
            <div className="text-3xl mb-2">📰</div>
            <div>No real news articles available</div>
            <div className="text-xs mt-1">
              {sentimentFilter !== 'all' ? 'Try adjusting sentiment filter' : 'Waiting for real news data...'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}