export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const symbol = '^NSEI';
    
    // Try quoteSummary first for detailed data
    const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail`;
    
    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const summaryData = await summaryResponse.json();
    const summaryDetail = summaryData?.quoteSummary?.result?.[0]?.summaryDetail || {};
    
    let fiftyDayAverage = summaryDetail.fiftyDayAverage?.raw || null;
    let twoHundredDayAverage = summaryDetail.twoHundredDayAverage?.raw || null;
    
    // Fallback to quote endpoint
    if (!fiftyDayAverage || !twoHundredDayAverage) {
      const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
      const quoteResponse = await fetch(quoteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const quoteData = await quoteResponse.json();
      const quote = quoteData?.quoteResponse?.result?.[0] || {};
      
      if (!fiftyDayAverage) fiftyDayAverage = quote.fiftyDayAverage || null;
      if (!twoHundredDayAverage) twoHundredDayAverage = quote.twoHundredDayAverage || null;
    }
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({
      symbol,
      fiftyDayAverage,
      twoHundredDayAverage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Averages API Error:', error);
    res.status(200).json({
      symbol: '^NSEI',
      fiftyDayAverage: 24734.31,
      twoHundredDayAverage: 24788.64,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
}
