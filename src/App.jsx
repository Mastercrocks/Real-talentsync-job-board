import React, { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Navbar from './components/Navbar'
import { fetchQuotes, searchSymbol, fetchCandles } from './api/fetchFinnhub'

export default function App () {
  const [live, setLive] = useState(false)
  const [search, setSearch] = useState('')
  const [externalStock, setExternalStock] = useState(null)

  async function handleSearchSubmit(q) {
    if (!q) return
    // clear previous external stock
    setExternalStock(null)
    // Check local demo lists by letting Dashboard handle filtering via search prop.
    setSearch(q)

    // If not in demo data, try fetching a live quote (will throw if no API key).
    try {
      // try to resolve a symbol/name
      const match = await searchSymbol(q)
      const symbol = match && match.symbol ? match.symbol : q
      const name = match && match.description ? match.description : symbol
      const quotes = await fetchQuotes([symbol])
      const res = quotes[symbol]
      let history = []
      // attempt to fetch a month of daily candles as initial history
      try {
        const to = Math.floor(Date.now() / 1000)
        const from = to - 60 * 60 * 24 * 30
        history = await fetchCandles(symbol, 'D', from, to)
      } catch (e) {
        history = []
      }
      if (res && res.price) {
        // create a minimal stock object for display
        const s = { ticker: symbol, name, price: res.price, changePercent: res.changePercent || 0, history }
        setExternalStock(s)
        setLive(true)
      }
    } catch (err) {
      // ignore; Dashboard will continue showing demo filtered results
      console.warn('Search live fetch failed:', err && err.message ? err.message : err)
    }
  }

  return (
    <>
      <Navbar live={live} onSearch={setSearch} onSubmit={handleSearchSubmit} />
      <Dashboard onLiveChange={setLive} search={search} externalStock={externalStock} />
    </>
  )
}
