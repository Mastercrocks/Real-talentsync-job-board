import React from 'react'
import Chart from './Chart'
import { motion } from 'framer-motion'

export default function StockCard ({ stock, inWatchlist, onClick }) {
  const up = stock.changePercent >= 0
  return (
    <motion.article whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }} className="bg-gray-800 rounded-xl p-4 shadow-card border border-gray-700 cursor-pointer" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400">{stock.name}</div>
          <div className="font-semibold text-lg">{stock.ticker}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">${stock.price.toFixed(2)}</div>
          <div className={`text-sm ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{up ? '+' : ''}{stock.changePercent.toFixed(2)}%</div>
        </div>
      </div>

      <div className="mt-3 h-24">
        <Chart data={stock.history} color={up ? '#34D399' : '#FB7185'} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div>{inWatchlist ? 'In Watchlist' : '—'}</div>
        <div>Market Cap: {stock.marketCap ? `$${(stock.marketCap/1e9).toFixed(1)}B` : '—'}</div>
      </div>
    </motion.article>
  )
}
