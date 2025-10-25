import React, { useEffect, useState } from 'react'
import { fetchQuotes, fetchMarketNews } from '../api/fetchFinnhub'

export default function DataStatus() {
  const [status, setStatus] = useState({
    keyPresent: !!(import.meta?.env?.VITE_FINNHUB_KEY),
    quoteOk: null,
    newsOk: null,
    lastError: null,
    lastChecked: null
  })

  const ping = async () => {
    const upd = { keyPresent: !!(import.meta?.env?.VITE_FINNHUB_KEY), quoteOk: null, newsOk: null, lastError: null, lastChecked: new Date() }
    try {
      const q = await fetchQuotes(['AAPL'])
      upd.quoteOk = !!(q && q.AAPL && typeof q.AAPL.price === 'number')
    } catch (e) {
      upd.quoteOk = false
      upd.lastError = e?.message || 'quote failed'
    }
    try {
      const news = await fetchMarketNews('general', 0)
      upd.newsOk = Array.isArray(news)
    } catch (e) {
      upd.newsOk = false
      upd.lastError = upd.lastError || e?.message || 'news failed'
    }
    setStatus(upd)
  }

  useEffect(() => { ping() }, [])

  const badge = (ok) => ok === null ? 'text-gray-400' : ok ? 'text-emerald-400' : 'text-red-400'

  return (
    <div className="mt-4 p-3 text-xs bg-gray-900/60 border border-gray-700 rounded">
      <div className="font-medium mb-2">Data Status (debug)</div>
      <div className="space-y-1">
        <div className={badge(status.keyPresent)}>
          API key: {status.keyPresent ? 'present' : 'missing'}
        </div>
        <div className={badge(status.quoteOk)}>
          Quotes: {status.quoteOk === null ? '—' : status.quoteOk ? 'OK' : 'FAILED'}
        </div>
        <div className={badge(status.newsOk)}>
          News: {status.newsOk === null ? '—' : status.newsOk ? 'OK' : 'FAILED'}
        </div>
        {status.lastError && (
          <div className="text-amber-400">Last error: {status.lastError}</div>
        )}
        {status.lastChecked && (
          <div className="text-gray-500">Checked: {status.lastChecked.toLocaleTimeString()}</div>
        )}
      </div>
      <div className="mt-2">
        <button onClick={ping} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">Ping</button>
      </div>
    </div>
  )
}
