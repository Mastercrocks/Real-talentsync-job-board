import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { listSymbols, fetchQuotes } from '../api/fetchFinnhub'

// Helper sleep
const wait = (ms) => new Promise(r => setTimeout(r, ms))

export default function AllStocks({ pageSize = 100, exchange = 'US' }) {
  const [loading, setLoading] = useState(false)
  const [symbols, setSymbols] = useState([]) // full list
  const [page, setPage] = useState(0) // 0-based page index
  const [quotes, setQuotes] = useState({}) // { TICKER: { price, change, changePercent } }
  const [error, setError] = useState('')

  const loadedCount = (page + 1) * pageSize
  const visibleSymbols = useMemo(() => symbols.slice(0, loadedCount), [symbols, loadedCount])

  async function loadSymbols() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await listSymbols(exchange)
      // Keep only common stocks and valid symbols
      const filtered = res.filter(x => x && x.symbol && x.description && /Common Stock|ADR|ETP|ETF|EQS/i.test(x.type || '') )
      // De-duplicate by symbol and sort alphabetically
      const uniqueMap = new Map()
      for (const x of filtered) if (!uniqueMap.has(x.symbol)) uniqueMap.set(x.symbol, x)
      const uniq = Array.from(uniqueMap.values()).sort((a,b)=> a.symbol.localeCompare(b.symbol))
      setSymbols(uniq)
      setPage(0)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  // When page or symbols change, fetch quotes for the current page (throttled)
  useEffect(() => {
    let cancelled = false
    async function loadPageQuotes() {
      if (symbols.length === 0) return
      const start = page * pageSize
      const end = Math.min(symbols.length, (page + 1) * pageSize)
      const slice = symbols.slice(start, end)
      for (const s of slice) {
        if (cancelled) break
        try {
          const map = await fetchQuotes([s.symbol])
          const q = map[s.symbol]
          if (q) {
            setQuotes(prev => ({ ...prev, [s.symbol]: q }))
          }
        } catch (e) {
          // ignore; continue
        }
        // Throttle a bit to respect free-tier rate limits
        await wait(250)
      }
    }
    loadPageQuotes()
    return () => { cancelled = true }
  }, [page, pageSize, symbols])

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-card border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">All Stocks ({symbols.length || 0})</h3>
        <div className="flex items-center gap-2">
          <button className="text-xs bg-robinGreen text-black px-2 py-1 rounded disabled:opacity-60" onClick={loadSymbols} disabled={loading}>{loading ? 'Loading…' : (symbols.length ? 'Reload symbols' : 'Load symbols')}</button>
          {symbols.length > visibleSymbols.length && (
            <button className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded" onClick={() => setPage(p => p + 1)}>Load {pageSize} more</button>
          )}
        </div>
      </div>
      {error && <div className="text-xs text-rose-400 mb-2">{error}</div>}
      {symbols.length === 0 ? (
        <div className="text-sm text-gray-400">Press "Load symbols" to fetch the exchange list, then quotes will populate as they load.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleSymbols.map(s => {
            const q = quotes[s.symbol]
            const up = (q?.changePercent || 0) >= 0
            return (
              <motion.div key={s.symbol} whileHover={{ y:-2 }} className="bg-gray-900/30 border border-gray-700 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.symbol}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[12rem]" title={s.description}>{s.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{q?.price ? `$${q.price.toFixed(2)}` : '—'}</div>
                    {q && (
                      <div className={`text-xs ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{up?'+':''}{(q.changePercent ?? 0).toFixed(2)}%</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
