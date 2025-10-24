import axios from 'axios'

// News aggregation for real-time financial news
const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_KEY
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// Major stock tickers to filter for
const MAJOR_TICKERS = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'META', 'GOOG', 'GOOGL', 'SPY', 'QQQ']
const PENNY_TICKERS = ['SNDL', 'SIRI', 'BB', 'NOK', 'ZNGA', 'BNGO', 'SNTG', 'PROG', 'AVGR', 'CLVS', 'SENS', 'NNDM', 'OCGN', 'GNUS', 'XELA']

// Fetch real news from Finnhub API
async function fetchRealNews(category = 'major', count = 20) {
  try {
    if (!FINNHUB_API_KEY) {
      throw new Error('Finnhub API key not configured')
    }

    const targetTickers = category === 'major' ? MAJOR_TICKERS : PENNY_TICKERS
    const allNews = []

    // Fetch general market news
    const generalNewsResponse = await axios.get(`${FINNHUB_BASE_URL}/news`, {
      params: {
        category: 'general',
        token: FINNHUB_API_KEY
      }
    })

    // Fetch company-specific news for each ticker
    for (const ticker of targetTickers.slice(0, 5)) { // Limit to prevent rate limiting
      try {
        const companyNewsResponse = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
          params: {
            symbol: ticker,
            from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
            to: new Date().toISOString().split('T')[0],
            token: FINNHUB_API_KEY
          }
        })

        // Process company news
        const companyNews = companyNewsResponse.data.slice(0, 3).map(article => ({
          id: `${ticker}_${article.id || Date.now()}_${Math.random()}`,
          ticker: ticker,
          headline: article.headline,
          summary: article.summary || article.headline,
          source: article.source,
          timestamp: article.datetime * 1000, // Convert to milliseconds
          sentiment: analyzeSentiment(article.headline + ' ' + (article.summary || '')),
          url: article.url,
          thumbnail: article.image || null
        }))

        allNews.push(...companyNews)
      } catch (error) {
        console.warn(`Failed to fetch news for ${ticker}:`, error.message)
      }
    }

    // Process general news
    const generalNews = generalNewsResponse.data.slice(0, 10).map(article => ({
      id: `general_${article.id || Date.now()}_${Math.random()}`,
      ticker: 'MARKET',
      headline: article.headline,
      summary: article.summary || article.headline,
      source: article.source,
      timestamp: article.datetime * 1000,
      sentiment: analyzeSentiment(article.headline + ' ' + (article.summary || '')),
      url: article.url,
      thumbnail: article.image || null
    }))

    allNews.push(...generalNews)

    // Sort by timestamp (newest first) and return requested count
    return allNews
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)

  } catch (error) {
    console.error('Error fetching real news:', error)
    throw new Error(`Failed to fetch real news: ${error.message}`)
  }
}

// Main news fetching function
export async function fetchStockNews(category = 'major', limit = 20) {
  try {
    const news = await fetchRealNews(category, limit)
    return news
  } catch (error) {
    console.error('Error fetching stock news:', error)
    throw error // No fallback to fake data - real data only
  }
}

// Get breaking news (high impact articles)
export async function fetchBreakingNews(category = 'major') {
  try {
    const allNews = await fetchStockNews(category, 50)
    // Filter for "breaking" news (last 4 hours with high engagement keywords)
    const breakingKeywords = ['earnings', 'merger', 'acquisition', 'breakthrough', 'partnership', 'record', 'surge', 'jump', 'announces', 'reports', 'launches']
    const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000)
    
    return allNews.filter(article => 
      article.timestamp > fourHoursAgo &&
      breakingKeywords.some(keyword => 
        article.headline.toLowerCase().includes(keyword) ||
        (article.summary && article.summary.toLowerCase().includes(keyword))
      )
    ).slice(0, 10)
  } catch (error) {
    console.error('Error fetching breaking news:', error)
    throw error // No fallback - real data only
  }
}

// AI-powered sentiment analysis (mock implementation)
export function analyzeSentiment(text) {
  const bullishKeywords = ['surge', 'record', 'growth', 'partnership', 'breakthrough', 'exceeds', 'beats', 'strong', 'positive', 'gains']
  const bearishKeywords = ['decline', 'drop', 'loss', 'weak', 'disappoints', 'falls', 'cuts', 'reduces', 'challenges', 'concerns']
  
  const lowerText = text.toLowerCase()
  const bullishCount = bullishKeywords.filter(word => lowerText.includes(word)).length
  const bearishCount = bearishKeywords.filter(word => lowerText.includes(word)).length
  
  if (bullishCount > bearishCount) return 'bullish'
  if (bearishCount > bullishCount) return 'bearish'
  return 'neutral'
}

export default {
  fetchStockNews,
  fetchBreakingNews,
  analyzeSentiment
}