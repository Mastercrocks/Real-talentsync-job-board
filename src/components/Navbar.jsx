import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { searchSymbol } from '../api/fetchFinnhub'

export default function Navbar ({ live = false, onSearch = () => {}, onSubmit = () => {} }) {
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  // Debounced searchSymbol calls
  useEffect(() => {
    if (!q || q.trim().length < 2) { setSuggestions([]); setOpen(false); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await searchSymbol(q.trim())
        // show top 8 matches with symbol + description
        const items = Array.isArray(res?.result) ? res.result.slice(0, 8) : []
        setSuggestions(items)
        setOpen(true)
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  function choose(sym) {
    setOpen(false)
    setSuggestions([])
    setQ(sym)
    onSearch(sym)
    onSubmit(sym)
  }
  return (
    <motion.header className="bg-gray-850/60 backdrop-blur sticky top-0 z-30 border-b border-gray-800" initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.3}}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-600 shadow">SV</div>
          <div className="text-lg font-semibold flex items-center gap-3">
            <span>StockView</span>
            {live && (
              <span className="text-xs px-2 py-0.5 bg-emerald-400 text-black rounded-md">LIVE</span>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-xl mx-4 relative">
          <input
            placeholder="Search any ticker (AAPL, TSLA, AMZN)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-robinGreen"
            value={q}
            onChange={(e) => { setQ(e.target.value); onSearch(e.target.value) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const sym = e.target.value.trim().toUpperCase()
                if (sym) choose(sym)
              }
            }}
            onFocus={() => { if (suggestions.length) setOpen(true) }}
          />
          {open && (
            <div className="absolute left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg z-40">
              {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
              {!loading && suggestions.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No matches</div>
              )}
              <ul className="max-h-72 overflow-auto text-sm">
                {suggestions.map((it) => (
                  <li key={it.symbol} className="px-3 py-2 hover:bg-gray-800 cursor-pointer" onMouseDown={() => choose(it.symbol)}>
                    <div className="font-medium">{it.symbol}</div>
                    <div className="text-xs text-gray-400 truncate">{it.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm text-gray-300 bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded">Buy</button>
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center">JD</div>
        </div>
      </div>
    </motion.header>
  )
}
