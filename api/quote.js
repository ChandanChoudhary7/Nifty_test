export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const symbol = '^NSEI';
    
    // Try multiple Yahoo Finance endpoints
    let quote = null;
    
    // Method 1: Direct quote endpoint
    try {
      const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const data = await response.json();
      quote = data?.quoteResponse?.result?.[0];
    } catch (e) {
      console.error('Quote method 1 failed:', e);
    }
    
    // Method 2: Chart endpoint as fallback
    if (!quote) {
      try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (result) {
          quote = {
            regularMarketPrice: result.meta?.regularMarketPrice,
            regularMarketOpen: result.meta?.regularMarketOpen,
            regularMarketPreviousClose: result.meta?.previousClose,
            fiftyTwoWeekHigh: result.meta?.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: result.meta?.fiftyTwoWeekLow
          };
        }
      } catch (e) {
        console.error('Quote method 2 failed:', e);
      }
    }
    
    // Return data or fallback
    if (quote) {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
      res.status(200).json({
        symbol,
        regularMarketPrice: quote.regularMarketPrice || quote.regularMarketPreviousClose || 24741.00,
        regularMarketOpen: quote.regularMarketOpen || quote.regularMarketPreviousClose || 24818.85,
        previousClose: quote.regularMarketPreviousClose || quote.previousClose || 24734.30,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 26277.35,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 21743.65,
        timestamp: new Date().toISOString(),
        source: 'yahoo'
      });
    } else {
      throw new Error('All methods failed');
    }
    
  } catch (error) {
    console.error('Quote API Error:', error);
    // Return fallback data
    res.status(200).json({
      symbol: '^NSEI',
      regularMarketPrice: 24741.00,
      regularMarketOpen: 24818.85,
      previousClose: 24734.30,
      fiftyTwoWeekHigh: 26277.35,
      fiftyTwoWeekLow: 21743.65,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
}
