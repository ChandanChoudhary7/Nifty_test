export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const symbol = '^NSEI';
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = await response.json();
    const quote = data?.quoteResponse?.result?.[0] || {};
    
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.status(200).json({
      symbol,
      regularMarketPrice: quote.regularMarketPrice || null,
      regularMarketOpen: quote.regularMarketOpen || null,
      previousClose: quote.regularMarketPreviousClose || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Quote API Error:', error);
    res.status(200).json({
      symbol: '^NSEI',
      regularMarketPrice: 24741.00,
      regularMarketOpen: 24818.85,
      previousClose: 24734.30,
      fiftyTwoWeekHigh: 26277.35,
      fiftyTwoWeekLow: 21743.65,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
}
