export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const symbol = '^NSEI';
    let averages = { fiftyDayAverage: null, twoHundredDayAverage: null };
    
    // Method 1: Try quoteSummary
    try {
      const summaryResponse = await fetch(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const summaryDetail = summaryData?.quoteSummary?.result?.[0]?.summaryDetail;
        
        if (summaryDetail) {
          averages.fiftyDayAverage = summaryDetail.fiftyDayAverage?.raw;
          averages.twoHundredDayAverage = summaryDetail.twoHundredDayAverage?.raw;
        }
      }
    } catch (e) {
      console.error('Summary method failed:', e);
    }
    
    // Method 2: Try chart with indicators
    if (!averages.fiftyDayAverage || !averages.twoHundredDayAverage) {
      try {
        const chartResponse = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d&indicators=quote&includeAdjustedClose=true`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );
        
        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          const result = chartData?.chart?.result?.[0];
          
          if (result?.indicators?.quote?.[0]?.close) {
            const closes = result.indicators.quote[0].close.filter(c => c !== null);
            
            // Calculate simple moving averages as approximation
            if (closes.length >= 50 && !averages.fiftyDayAverage) {
              const recent50 = closes.slice(-50);
              averages.fiftyDayAverage = recent50.reduce((a, b) => a + b, 0) / recent50.length;
            }
            
            if (closes.length >= 200 && !averages.twoHundredDayAverage) {
              const recent200 = closes.slice(-200);
              averages.twoHundredDayAverage = recent200.reduce((a, b) => a + b, 0) / recent200.length;
            }
          }
        }
      } catch (e) {
        console.error('Chart method failed:', e);
      }
    }
    
    // Use fallback if still null
    if (!averages.fiftyDayAverage) averages.fiftyDayAverage = 24734.31;
    if (!averages.twoHundredDayAverage) averages.twoHundredDayAverage = 24788.64;
    
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({
      symbol,
      fiftyDayAverage: averages.fiftyDayAverage,
      twoHundredDayAverage: averages.twoHundredDayAverage,
      timestamp: new Date().toISOString(),
      source: (averages.fiftyDayAverage === 24734.31) ? 'fallback' : 'yahoo'
    });
    
  } catch (error) {
    console.error('Averages API Error:', error);
    res.status(200).json({
      symbol: '^NSEI',
      fiftyDayAverage: 24734.31,
      twoHundredDayAverage: 24788.64,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
}
