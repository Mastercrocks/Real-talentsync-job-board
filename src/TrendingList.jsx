import React from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

export default function TrendingList ({ items = [], onAdd = () => {} }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-card border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">🔥 Trending Penny Stocks</h3>
        <div className="text-xs text-gray-400">Filtered: &lt;$5</div>
      </div>

      <div className="space-y-3">
        {items.map(item => (
          <motion.div key={item.ticker} whileHover={{ scale: 1.01 }} className="flex items-center justify-between bg-gray-900/20 rounded p-2">
            <div className="flex items-center gap-3">
              <div className="font-medium">{item.ticker}</div>
              <div className="text-xs text-gray-400">${item.price.toFixed(2)}</div>
              <div className={`text-xs ${item.changePercent>=0? 'text-emerald-400' : 'text-rose-400'}`}>{item.changePercent>=0? '+' : ''}{item.changePercent.toFixed(2)}%</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-28 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={item.history}>
                    <Line dataKey="value" stroke={item.changePercent>=0? '#34D399' : '#FB7185'} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <button onClick={() => onAdd(item.ticker)} className="text-xs bg-robinGreen text-black px-2 py-1 rounded">Add</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
