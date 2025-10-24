import React, { useEffect, useState } from 'react'
import { fetchMarketNews } from '../api/fetchFinnhub'

export default function NewsSection ({ refreshInterval = 300000 }) { // 5 minutes default
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  async function loadNews() {
    setLoading(true)
    try {
      const data = await fetchMarketNews('general')
      // Mix live news with explosive penny stock alerts
      const liveNews = data
        .filter(article => 
          article.headline && 
          (article.headline.toLowerCase().includes('power') ||
           article.headline.toLowerCase().includes('energy') ||
           article.headline.toLowerCase().includes('electric') ||
           article.headline.toLowerCase().includes('renewable') ||
           article.headline.toLowerCase().includes('penny') ||
           article.headline.toLowerCase().includes('stock'))
        )
        .slice(0, 2)
        .map(article => ({
          id: article.id,
          title: article.headline,
          summary: article.summary || 'Market news update',
          url: article.url,
          time: formatTime(article.datetime),
          category: 'power'
        }))

      // Add explosive penny stock alerts
      const pennyAlerts = [
        { id: 'p1', title: 'yo SNDL bout to go CRAZY!! 🌿💨', summary: 'bro this weed stock been building up pressure, bout to EXPLODE any day now!', category: 'penny', time: '45m', url: 'https://example.com/sndl-rocket' },
        { id: 'p2', title: 'BB looking sus... in a GOOD way 👀', summary: 'BlackBerry been too quiet, something BIG cooking behind scenes trust me', category: 'penny', time: '2h', url: 'https://example.com/bb-mystery' },
        { id: 'p3', title: 'NOK gonna make some MOVES!! 📱⚡', summary: 'Nokia got that underdog energy, heard whispers of massive deals coming', category: 'penny', time: '4h', url: 'https://example.com/nok-moves' }
      ]

      const powerNews = [...liveNews, ...pennyAlerts].slice(0, 4)
      
      setNews(powerNews)
      setLastUpdate(new Date())
    } catch (error) {
      console.warn('Failed to fetch live news, using demo data:', error)
      // Explosive penny stock alerts written like a kid
      const explosivePennyNews = [
        { id: 1, title: 'OMG SNDL is bout to MOON!! 🚀', summary: 'yo this penny stock been moving crazy lately, heard some big news coming soon!', category: 'penny', time: '1h', url: 'https://example.com/sndl-alert' },
        { id: 2, title: 'BB gonna explode any day now 💥', summary: 'dude seriously watch BlackBerry, something big happening behind the scenes', category: 'penny', time: '3h', url: 'https://example.com/bb-explosion' },
        { id: 3, title: 'NOK looking SUS in a good way 👀', summary: 'Nokia been quiet but insiders saying get ready... could be HUGE', category: 'penny', time: '5h', url: 'https://example.com/nok-insider' },
        { id: 4, title: 'SIRI bout to make some NOISE!! 📢', summary: 'SiriusXM looking spicy, heard they got some secret deal cooking', category: 'penny', time: '8h', url: 'https://example.com/siri-noise' },
        { id: 5, title: 'Holy moly ZNGA might go BRRRR 🎮', summary: 'gaming stocks are hot and Zynga looking ready to blast off to the moon!', category: 'penny', time: '12h', url: 'https://example.com/znga-gaming' },
        { id: 6, title: 'Power stocks be wildin lately ⚡', summary: 'renewable energy penny stocks heating up, some gonna 10x soon trust me bro', category: 'power', time: '2h', url: 'https://example.com/power-wildin' }
      ]
      setNews(explosivePennyNews)
    } finally {
      setLoading(false)
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return 'now'
    const diff = Date.now() - timestamp * 1000
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return 'now'
  }

  // Load news on mount and set up refresh interval
  useEffect(() => {
    loadNews()
    const interval = setInterval(loadNews, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  if (!news || news.length === 0) return null

  return (
    <div className="bg-gray-800 rounded-xl p-4 shadow-card border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">🚀 Penny Stock Alerts 🔥</h3>
        <div className="flex items-center gap-2">
          {loading && <div className="text-xs text-gray-400">Updating...</div>}
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Updated {formatTime(Math.floor(lastUpdate.getTime() / 1000))}
            </div>
          )}
          <button 
            onClick={loadNews} 
            disabled={loading}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>
      <ul className="space-y-3 text-sm">
        {news.map(it => (
          <li key={it.id} className="border-b border-gray-700 pb-2">
            <a className="font-medium hover:underline" href={it.url} target="_blank" rel="noopener noreferrer">{it.title}</a>
            <div className="text-gray-400 text-xs">{it.summary} · {it.time}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
