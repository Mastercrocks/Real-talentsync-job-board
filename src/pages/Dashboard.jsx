import React, { useMemo, useState } from 'react'
import TopGainers from '../components/TopGainers'
import TrendingPennyScanner from '../components/TrendingPennyScanner'
import RealTimeStockNews from '../components/RealTimeStockNews'
import DataStatus from '../components/DataStatus'
import Modal from '../components/Modal'
import Chart from '../components/Chart'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { fetchCandles } from '../api/fetchFinnhub'

export default function Dashboard (props) {
  const { onLiveChange } = props || {}
  const [liveDataLoaded, setLiveDataLoaded] = useState(false)

  // Notify parent about live data availability
  useEffect(() => {
    if (typeof onLiveChange === 'function') onLiveChange(true)
  }, [onLiveChange])

  const [selected, setSelected] = useState(null)
  const [chartData, setChartData] = useState([])
  const [chartTimeframe, setChartTimeframe] = useState('D')
  const [chartLoading, setChartLoading] = useState(false)

  function openStock(stock) {
    console.log('Opening stock:', stock)
    setSelected(stock)
    setChartData(stock.history || [])
    setChartTimeframe('D') // Reset to daily
    loadChartData(stock.ticker, 'D')
  }
  
  function closeModal() {
    setSelected(null)
    setChartData([])
  }

  async function loadChartData(ticker, resolution) {
    if (!ticker) return
    setChartLoading(true)
    try {
      console.log('Fetching chart data for:', ticker, 'resolution:', resolution)
      const data = await fetchCandles(ticker, resolution)
      console.log('Raw chart data received:', data)
      
      if (data && data.c && data.c.length > 0) {
        // Transform Finnhub candle data to chart format
        const chartPoints = data.c.map((close, i) => ({
          name: `${i}`,
          value: Number(close.toFixed(2))
        }))
        console.log('Transformed chart points:', chartPoints.slice(0, 5), '... total:', chartPoints.length)
        setChartData(chartPoints)
      } else if (data && data.s === 'no_data') {
        console.warn('No data available for', ticker, 'at resolution', resolution)
        setChartData([])
      } else {
        console.warn('Unexpected data format:', data)
        setChartData([])
      }
    } catch (err) {
      console.error('Chart data fetch failed:', err)
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }

  function changeTimeframe(resolution) {
    setChartTimeframe(resolution)
    if (selected) {
      loadChartData(selected.ticker, resolution)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug panel toggle via ?debug=1 */}
        {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1' && (
          <DataStatus />
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.section initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.4}} className="lg:col-span-2">
            {/* Top Gainers/Losers Section */}
            <TopGainers onStockClick={openStock} refreshInterval={120000} />

            {/* Show external stock if searched */}
            {props && props.externalStock && (
              <div className="mt-6 p-4 bg-gray-800 rounded-xl border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-white">Search Result</h3>
                <div 
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-900/70 transition-colors"
                  onClick={() => openStock(props.externalStock)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-white">{props.externalStock.ticker}</div>
                      <div className="text-sm text-gray-400">{props.externalStock.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-white">${props.externalStock.price?.toFixed(2) || 'N/A'}</div>
                      <div className={`text-sm ${(props.externalStock.changePercent || 0) >= 0 ? 'text-robinGreen' : 'text-red-400'}`}>
                        {(props.externalStock.changePercent || 0) >= 0 ? '+' : ''}{(props.externalStock.changePercent || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          <motion.aside initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.5}} className="lg:col-span-1">
            <div className="space-y-4">
              {/* Real-time sentiment scanner */}
              <TrendingPennyScanner refreshInterval={120000} />
              
              {/* Real-time stock news feed (slow down to avoid API rate limits) */}
              <RealTimeStockNews refreshInterval={120000} />
            </div>
          </motion.aside>
        </div>
      </div>

      <footer className="border-t border-gray-800 mt-8 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-gray-400 flex items-center justify-between">
          <div>© {new Date().getFullYear()} StockView</div>
          <div className="flex gap-3">
            <a className="hover:underline" href="#">Twitter</a>
            <a className="hover:underline" href="#">GitHub</a>
            <a className="hover:underline" href="#">Docs</a>
          </div>
        </div>
      </footer>
      {selected && (
        <Modal onClose={closeModal}>
          <div className="h-96">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-lg">{selected.name} · {selected.ticker}</div>
              <div className="flex items-center gap-2">
                {['60', 'D', 'W', 'M'].map(res => (
                  <button
                    key={res}
                    onClick={() => changeTimeframe(res)}
                    className={`px-2 py-1 text-xs rounded ${
                      chartTimeframe === res 
                        ? 'bg-robinGreen text-black' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {res === '60' ? '1H' : res === 'D' ? 'Daily' : res === 'W' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72 relative">
              {chartLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded">
                  <div className="text-sm text-gray-400">Loading chart data...</div>
                </div>
              )}
              <Chart data={chartData} color={selected.changePercent >= 0 ? '#34D399' : '#FB7185'} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
