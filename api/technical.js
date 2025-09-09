// api/technical.js
const FINNHUB_API_KEY = 'd3081ipr01qnmrsdd240d3081ipr01qnmrsdd24g';

export default async function handler(req, res) {
  try {
    console.log('Starting technical analysis calculation...');
    
    const symbol = 'NIFTY';
    
    // Fetch price data from Yahoo Finance
    console.log('Fetching Yahoo Finance data...');
    const priceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const priceResponse = await fetch(priceUrl);
    
    if (!priceResponse.ok) {
      throw new Error(`Yahoo Finance API error: ${priceResponse.status}`);
    }
    
    const priceData = await priceResponse.json();
    
    if (!priceData.chart?.result?.[0]) {
      throw new Error('Invalid Yahoo Finance response structure');
    }
    
    const result = priceData.chart.result[0];
    const meta = result.meta;
    const prices = result.indicators.quote[0].close.filter(p => p !== null);
    const highs = result.indicators.quote[0].high.filter(h => h !== null);
    const lows = result.indicators.quote[0].low.filter(l => l !== null);
    
    console.log('Yahoo Finance data fetched successfully');
    
    // Calculate technical indicators
    function calculateSMA(data, period) {
      if (data.length < period) return null;
      return data.slice(-period).reduce((a, b) => a + b, 0) / period;
    }
    
    function calculateEMA(data, period) {
      if (data.length < period) return null;
      const k = 2 / (period + 1);
      let ema = data[0];
      for (let i = 1; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
      }
      return ema;
    }
    
    function calculateRSI(prices, period = 14) {
      if (prices.length < period + 1) return null;
      
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
    
    // Calculate ATH and current metrics
    const allTimeHigh = Math.max(...highs);
    const currentPrice = meta.regularMarketPrice;
    const correctionFromATH = ((allTimeHigh - currentPrice) / allTimeHigh * 100);
    
    // Calculate moving averages
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const ema20 = calculateEMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    
    // Calculate RSI
    const rsi = calculateRSI(prices);
    
    console.log('Technical indicators calculated');
    
    // Fetch PE ratio directly from Finnhub API (embedded)
    let peRatio = null;
    let peSource = 'offline';
    
    try {
      console.log('Fetching PE ratio from Finnhub...');
      
      // Try different symbol variations for Nifty 50
      const niftySymbols = [
        '^NSEI',      // Yahoo Finance style
        'NSEI',       // Direct NSE index
        'NSE:NIFTY50', // Finnhub NSE format
        'NSE:NIFTY',  // Alternative format
        'IN:NIFTY50', // India prefix
        'NIFTY50.NSE' // NSE suffix
      ];
      
      // Try each symbol format
      for (const niftySymbol of niftySymbols) {
        console.log(`Trying Finnhub symbol: ${niftySymbol}`);
        
        try {
          // Method 1: Company Profile endpoint
          const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(niftySymbol)}&token=${FINNHUB_API_KEY}`;
          const profileResponse = await fetch(profileUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log(`Profile data for ${niftySymbol}:`, Object.keys(profileData));
            
            if (profileData && (profileData.peRatio || profileData.pe)) {
              peRatio = profileData.peRatio || profileData.pe;
              peSource = 'finnhub-profile';
              console.log(`Found PE in profile: ${peRatio}`);
              break;
            }
          }

          // Method 2: Stock metrics endpoint
          const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(niftySymbol)}&metric=all&token=${FINNHUB_API_KEY}`;
          const metricsResponse = await fetch(metricsUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            console.log(`Metrics data for ${niftySymbol}:`, Object.keys(metricsData));
            
            if (metricsData && metricsData.metric) {
              // Try different PE ratio field names
              const peFields = [
                'peBasicExclExtraTTM',
                'peNormalizedAnnual', 
                'peTTM',
                'pe',
                'peRatio',
                'peBasicIncludingExtraordinaryItemsTTM'
              ];
              
              for (const field of peFields) {
                if (metricsData.metric[field] && !isNaN(parseFloat(metricsData.metric[field]))) {
                  peRatio = parseFloat(metricsData.metric[field]);
                  peSource = 'finnhub-metrics';
                  console.log(`Found PE in metrics ${field}: ${peRatio}`);
                  break;
                }
              }
              
              if (peRatio) break;
            }
          }

          // Method 3: Quote endpoint
          const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(niftySymbol)}&token=${FINNHUB_API_KEY}`;
          const quoteResponse = await fetch(quoteUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            console.log(`Quote data for ${niftySymbol}:`, Object.keys(quoteData));
            
            if (quoteData && quoteData.pe && !isNaN(parseFloat(quoteData.pe))) {
              peRatio = parseFloat(quoteData.pe);
              peSource = 'finnhub-quote';
              console.log(`Found PE in quote: ${peRatio}`);
              break;
            }
          }

        } catch (symbolError) {
          console.error(`Error with Finnhub symbol ${niftySymbol}:`, symbolError.message);
          continue;
        }
      }
      
      // If no PE found with regular symbols, try ETF symbols
      if (!peRatio) {
        console.log('Trying Nifty 50 ETF symbols...');
        
        const etfSymbols = [
          'NIFTYBEES.NS',  // Nippon India ETF Nifty BeES
          'JUNIORBEES.NS', // Nippon India ETF Junior BeES  
          'GOLDNIFTY.NS'   // Other Nifty tracking ETFs
        ];

        for (const etfSymbol of etfSymbols) {
          try {
            const etfMetricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(etfSymbol)}&metric=all&token=${FINNHUB_API_KEY}`;
            const etfMetricsResponse = await fetch(etfMetricsUrl, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (etfMetricsResponse.ok) {
              const etfMetricsData = await etfMetricsResponse.json();
              console.log(`ETF metrics for ${etfSymbol}:`, Object.keys(etfMetricsData));
              
              if (etfMetricsData && etfMetricsData.metric) {
                const peFields = ['peBasicExclExtraTTM', 'peNormalizedAnnual', 'peTTM'];
                
                for (const field of peFields) {
                  if (etfMetricsData.metric[field] && !isNaN(parseFloat(etfMetricsData.metric[field]))) {
                    peRatio = parseFloat(etfMetricsData.metric[field]);
                    peSource = 'finnhub-etf';
                    console.log(`Found PE in ETF ${field}: ${peRatio}`);
                    break;
                  }
                }
                
                if (peRatio) break;
              }
            }
          } catch (etfError) {
            console.error(`Error with ETF symbol ${etfSymbol}:`, etfError.message);
            continue;
          }
        }
      }
      
      if (peRatio) {
        console.log(`Successfully fetched PE ratio: ${peRatio} from ${peSource}`);
      } else {
        console.log('No PE ratio found from Finnhub');
      }
      
    } catch (peError) {
      console.error('Error fetching PE ratio from Finnhub:', peError.message);
      peRatio = null;
      peSource = 'error';
    }
    
    // EMA Crossover Analysis
    const ema20AboveEma50 = ema20 && ema50 ? ema20 > ema50 : null;
    const trend = ema20AboveEma50 === null ? 'unknown' : (ema20AboveEma50 ? 'bullish' : 'bearish');
    
    // Set cache headers
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    
    console.log('Technical analysis completed successfully');
    
    return res.status(200).json({
      symbol: 'NIFTY 50',
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      timestamp: new Date().toISOString(),
      
      // Price levels
      allTimeHigh: parseFloat(allTimeHigh.toFixed(2)),
      correctionFromATH: parseFloat(correctionFromATH.toFixed(2)),
      status: correctionFromATH > 20 ? 'bear_market' : correctionFromATH > 10 ? 'correction' : 'near_ath',
      
      // Moving averages  
      movingAverages: {
        sma50: sma50 ? parseFloat(sma50.toFixed(2)) : null,
        sma200: sma200 ? parseFloat(sma200.toFixed(2)) : null,
        ema20: ema20 ? parseFloat(ema20.toFixed(2)) : null,
        ema50: ema50 ? parseFloat(ema50.toFixed(2)) : null
      },
      
      // Technical indicators
      technicalIndicators: {
        rsi: rsi ? parseFloat(rsi.toFixed(2)) : null,
        peRatio: peRatio ? parseFloat(peRatio.toFixed(2)) : null,
        peSource: peSource
      },
      
      // Trend analysis
      trendAnalysis: {
        ema20AboveEma50: ema20AboveEma50,
        trend: trend,
        signal: ema20AboveEma50 === null ? 'insufficient_data' : (ema20AboveEma50 ? 'bullish_crossover' : 'bearish_crossover')
      }
    });
    
  } catch (error) {
    console.error('Technical analysis error:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate technical indicators',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
