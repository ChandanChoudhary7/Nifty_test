// api/technical.js
export default async function handler(req, res) {
  try {
    const symbol = 'NIFTY';
    
    // Fetch price data from Yahoo Finance
    const priceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const priceResponse = await fetch(priceUrl);
    const priceData = await priceResponse.json();
    
    if (!priceData.chart?.result?.[0]) {
      return res.status(502).json({ error: 'Failed to fetch price data' });
    }
    
    const result = priceData.chart.result[0];
    const meta = result.meta;
    const prices = result.indicators.quote[0].close;
    const highs = result.indicators.quote[0].high;
    const lows = result.indicators.quote[0].low;
    
    // Calculate technical indicators
    function calculateSMA(data, period) {
      return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    }
    
    function calculateEMA(data, period) {
      const k = 2 / (period + 1);
      let ema = data[0];
      for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
      }
      return ema;
    }
    
    function calculateRSI(prices, period = 14) {
      const changes = [];
      for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
      }
      
      const gains = changes.slice(-period).map(change => change > 0 ? change : 0);
      const losses = changes.slice(-period).map(change => change < 0 ? -change : 0);
      
      const avgGain = gains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    }
    
    // Calculate ATH
    const allTimeHigh = Math.max(...highs.filter(h => h !== null));
    const currentPrice = meta.regularMarketPrice;
    const correctionFromATH = ((allTimeHigh - currentPrice) / allTimeHigh * 100);
    
    // Calculate moving averages
    const sma50 = calculateSMA(prices.filter(p => p !== null), 50);
    const sma200 = calculateSMA(prices.filter(p => p !== null), 200);
    const ema20 = calculateEMA(prices.filter(p => p !== null), 20);
    const ema50 = calculateEMA(prices.filter(p => p !== null), 50);
    
    // Calculate RSI
    const rsi = calculateRSI(prices.filter(p => p !== null));
    
    // Fetch PE ratio from our Finnhub endpoint
    let peRatio = null;
    let peSource = 'offline';
    
    try {
      const peResponse = await fetch(`${req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000'}/api/nifty_pe_finnhub`);
      if (peResponse.ok) {
        const peData = await peResponse.json();
        if (peData.peRatio) {
          peRatio = peData.peRatio;
          peSource = peData.source || 'finnhub';
        }
      }
    } catch (peError) {
      console.error('Error fetching PE ratio:', peError.message);
    }
    
    // EMA Crossover Analysis
    const ema20AboveEma50 = ema20 > ema50;
    const trend = ema20AboveEma50 ? 'bullish' : 'bearish';
    
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    
    return res.status(200).json({
      symbol: 'NIFTY 50',
      currentPrice,
      timestamp: new Date().toISOString(),
      
      // Price levels
      allTimeHigh,
      correctionFromATH: parseFloat(correctionFromATH.toFixed(2)),
      status: correctionFromATH > 10 ? 'correction' : correctionFromATH > 20 ? 'bear_market' : 'near_ath',
      
      // Moving averages  
      movingAverages: {
        sma50: parseFloat(sma50.toFixed(2)),
        sma200: parseFloat(sma200.toFixed(2)),
        ema20: parseFloat(ema20.toFixed(2)),
        ema50: parseFloat(ema50.toFixed(2))
      },
      
      // Technical indicators
      technicalIndicators: {
        rsi: parseFloat(rsi.toFixed(2)),
        peRatio: peRatio ? parseFloat(peRatio.toFixed(2)) : null,
        peSource
      },
      
      // Trend analysis
      trendAnalysis: {
        ema20AboveEma50,
        trend,
        signal: ema20AboveEma50 ? 'bullish crossover' : 'bearish crossover'
      }
    });
    
  } catch (error) {
    console.error('Technical analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate technical indicators',
      message: error.message 
    });
  }
}
