import { fetchQuotes, fetchSocialSentiment } from './fetchFinnhub'

// Expanded real penny stock universe; we'll rotate a subset each scan to respect rate limits
const PENNY_TICKERS = [
  'SNDL','SIRI','BB','NOK','ZNGA','BNGO','SNTG','PROG','AVGR','CLVS','SENS','NNDM','OCGN','GNUS','XELA',
  'ATER','IDEX','HCMC','HYLN','BBIG','WKHS','CLOV','MVIS','SOS','HUT','RIOT','MARA','PLTR','PTON','TLRY','NIO',
  'FUBO','CANO','GME','AMC','UWMC','SRNE','AGRI','VRM','TRKA','MULN','CEI','NAKD','SPCE','SPRT','KOSS','CENN'
]

const WINDOW_DAYS = 14
const SCAN_BATCH_SIZE = 12 // keep API usage modest per cycle

function rotatedBatch(list, batchSize) {
  if (!list.length) return []
  const rotation = Math.floor(Date.now() / (2 * 60 * 1000)) // rotate every 2 minutes
  const start = (rotation * batchSize) % list.length
  const end = start + batchSize
  return end <= list.length
    ? list.slice(start, end)
    : list.slice(start).concat(list.slice(0, end - list.length))
}

// Fetch real social sentiment data from Finnhub (aggregate last WINDOW_DAYS days)
async function fetchRealSentimentData() {
  const sentimentData = []
  const toDate = new Date()
  const fromDate = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const fromStr = fromDate.toISOString().split('T')[0]
  const toStr = toDate.toISOString().split('T')[0]

  // Rotate a subset each scan to reduce rate limits while widening coverage
  const scanTickers = rotatedBatch(PENNY_TICKERS, SCAN_BATCH_SIZE)

  for (const ticker of scanTickers) {
    try {
      const socialData = await fetchSocialSentiment(ticker, fromStr, toStr)

      const redditArr = Array.isArray(socialData?.reddit) ? socialData.reddit : []
      const twitterArr = Array.isArray(socialData?.twitter) ? socialData.twitter : []

      const sumFields = (arr) => arr.reduce((acc, d) => ({
        mention: acc.mention + (d.mention || 0),
        positiveMention: acc.positiveMention + (d.positiveMention || 0),
        negativeMention: acc.negativeMention + (d.negativeMention || 0),
      }), { mention: 0, positiveMention: 0, negativeMention: 0 })

      const r = sumFields(redditArr)
      const t = sumFields(twitterArr)

      const totalMentions = r.mention + t.mention
      if (totalMentions <= 0) continue

      const positiveMentions = r.positiveMention + t.positiveMention
      const negativeMentions = r.negativeMention + t.negativeMention
      const neutralMentions = Math.max(0, totalMentions - positiveMentions - negativeMentions)

      const positiveRatio = positiveMentions / totalMentions
      const negativeRatio = negativeMentions / totalMentions
      const neutralRatio = neutralMentions / totalMentions

      const sentimentScore = (positiveRatio * 1 + neutralRatio * 0 + negativeRatio * -1)
      const hypeScore = totalMentions * (1 + Math.abs(sentimentScore))

      // Build daily mention history by date
      const dayMap = new Map()
      for (const d of redditArr) {
        const key = d.atTime || d.date || d.time || ''
        if (!key) continue
        const cur = dayMap.get(key) || 0
        dayMap.set(key, cur + (d.mention || 0))
      }
      for (const d of twitterArr) {
        const key = d.atTime || d.date || d.time || ''
        if (!key) continue
        const cur = dayMap.get(key) || 0
        dayMap.set(key, cur + (d.mention || 0))
      }
      const history = Array.from(dayMap.entries())
        .map(([k, v]) => ({ time: new Date(k).getTime() || Date.now(), mentions: v }))
        .sort((a, b) => a.time - b.time)
  const trimmedHistory = history.length > 0 ? history.slice(-20) : [] // no synthetic history; real-only

      sentimentData.push({
        ticker,
        mentions: totalMentions,
        sentiment: {
          positive: Math.round(positiveRatio * 100),
          neutral: Math.round(neutralRatio * 100),
          negative: Math.round(negativeRatio * 100),
          score: sentimentScore
        },
        volumeChange: 1,
        hypeScore: Math.round(hypeScore),
        trending: hypeScore > 50,
        sources: {
          reddit: r.mention,
          twitter: t.mention,
          stocktwits: 0
        },
        mentionHistory: trimmedHistory
      })
    } catch (error) {
      console.warn(`Failed to fetch sentiment for ${ticker}:`, error.message)
      // Skip on error and continue
    }
  }

  return sentimentData
}

function generateMentionHistory(currentMentions, points = 20) {
  const history = []
  // We no longer generate synthetic mention history to keep data strictly real
  return history
}

// Scan for trending penny stocks with sentiment analysis
export async function scanTrendingPennyStocks() {
  try {
    // Fetch real sentiment data
    const sentimentData = await fetchRealSentimentData()
    // If no sentiment data, we'll fallback to price-based real movers for the rotated batch
    
    // Fetch real price data for tickers with sentiment data
    const tickers = sentimentData.map(s => s.ticker)
    const quotes = await fetchQuotes(tickers)
    
    // Combine real sentiment with real price data
    const trendingStocks = sentimentData.map(stock => {
      const quote = quotes[stock.ticker]
      if (!quote) {
        return null // Skip if no price data available
      }
      
      return {
        ...stock,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        lastUpdated: Date.now()
      }
    }).filter(stock => stock !== null && stock.price < 5) // Only penny stocks with real data
    
    let result = trendingStocks.sort((a, b) => b.hypeScore - a.hypeScore).slice(0, 10)

    // Price-based real fallback when sentiment is empty
    if (result.length === 0) {
      const batch = rotatedBatch(PENNY_TICKERS, SCAN_BATCH_SIZE)
      try {
        const batchQuotes = await fetchQuotes(batch)
        const movers = Object.entries(batchQuotes)
          .map(([ticker, q]) => ({ ticker, ...q }))
          .filter(q => q && typeof q.price === 'number' && q.price > 0 && q.price < 5 && typeof q.changePercent === 'number')
          .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
          .slice(0, 10)
          .map(q => ({
            ticker: q.ticker,
            mentions: 0,
            sentiment: { positive: 0, neutral: 0, negative: 0, score: 0 },
            volumeChange: 0,
            hypeScore: Math.round(Math.abs(q.changePercent) * 10),
            trending: Math.abs(q.changePercent) >= 2,
            sources: { reddit: 0, twitter: 0, stocktwits: 0 },
            mentionHistory: [], // keep real-only: no synthetic mentions
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            lastUpdated: Date.now(),
            fallback: 'price'
          }))
        result = movers
      } catch (e) {
        // ignore, return empty
      }
    }

    return result
      
  } catch (error) {
    console.error('Error scanning trending penny stocks:', error)
    // Do not throw here to avoid red error box; let UI show empty state and retry
    return []
  }
}

// Get detailed sentiment analysis for a specific ticker
export async function getDetailedSentiment(ticker) {
  try {
    const social = await fetchSocialSentiment(ticker)
    return social
  } catch (error) {
    console.warn('Could not fetch detailed sentiment for', ticker, error)
    return null
  }
}

export default {
  scanTrendingPennyStocks,
  getDetailedSentiment
}