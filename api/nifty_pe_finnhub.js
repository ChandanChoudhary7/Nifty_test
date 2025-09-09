// api/nifty_pe_finnhub.js
const FINNHUB_API_KEY = 'd3081ipr01qnmrsdd240d3081ipr01qnmrsdd24g';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    console.log('Attempting to fetch Nifty 50 data from Finnhub...');

    // Try different symbol formats for Nifty 50 on Finnhub
    const symbols = ['^NSEI', 'NSEI', 'NSE:NIFTY50', 'NSE:NIFTY'];
    // api/nifty_pe_finnhub.js
const FINNHUB_API_KEY = 'd3081ipr01qnmrsdd240d3081ipr01qnmrsdd24g';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    console.log('Fetching Nifty 50 PE ratio from Finnhub...');

    // Try different symbol variations for Nifty 50
    const niftySymbols = [
      '^NSEI',      // Yahoo Finance style
      'NSEI',       // Direct NSE index
      'NSE:NIFTY50', // Finnhub NSE format
      'NSE:NIFTY',  // Alternative format
      'IN:NIFTY50', // India prefix
      'NIFTY50.NSE' // NSE suffix
    ];
    
    let peRatio = null;
    let workingSymbol = null;
    let responseData = {};

    // Try each symbol format
    for (const symbol of niftySymbols) {
      console.log(`Trying symbol: ${symbol}`);
      
      try {
        // Method 1: Company Profile endpoint (most likely to have PE)
        const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
        const profileResponse = await fetch(profileUrl);
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log(`Profile data for ${symbol}:`, profileData);
          
          if (profileData && Object.keys(profileData).length > 0) {
            responseData.profile = profileData;
            
            // Check for PE ratio in profile data
            if (profileData.peRatio || profileData.pe) {
              peRatio = profileData.peRatio || profileData.pe;
              workingSymbol = symbol;
              break;
            }
          }
        }

        // Method 2: Stock metrics endpoint
        const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_API_KEY}`;
        const metricsResponse = await fetch(metricsUrl);
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          console.log(`Metrics data for ${symbol}:`, metricsData);
          
          if (metricsData && metricsData.metric) {
            responseData.metrics = metricsData.metric;
            
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
                workingSymbol = symbol;
                console.log(`Found PE in ${field}: ${peRatio}`);
                break;
              }
            }
            
            if (peRatio) break;
          }
        }

        // Method 3: Quote endpoint
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          console.log(`Quote data for ${symbol}:`, quoteData);
          
          if (quoteData && Object.keys(quoteData).length > 0) {
            responseData.quote = quoteData;
            
            if (quoteData.pe && !isNaN(parseFloat(quoteData.pe))) {
              peRatio = parseFloat(quoteData.pe);
              workingSymbol = symbol;
              break;
            }
          }
        }

      } catch (symbolError) {
        console.error(`Error with symbol ${symbol}:`, symbolError.message);
        continue;
      }
    }

    // If we found a PE ratio, return success
    if (peRatio && !isNaN(peRatio)) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
      return res.status(200).json({
        symbol: 'NIFTY 50',
        peRatio: parseFloat(peRatio.toFixed(2)),
        source: 'finnhub',
        workingSymbol,
        timestamp: new Date().toISOString()
      });
    }

    // If no PE found, try alternative approach with ETF or index funds that track Nifty 50
    console.log('Trying Nifty 50 ETF symbols...');
    
    const etfSymbols = [
      'NIFTYBEES.NS',  // Nippon India ETF Nifty BeES
      'JUNIORBEES.NS', // Nippon India ETF Junior BeES  
      'GOLDNIFTY.NS'   // Other Nifty tracking ETFs
    ];

    for (const etfSymbol of etfSymbols) {
      try {
        const etfMetricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(etfSymbol)}&metric=all&token=${FINNHUB_API_KEY}`;
        const etfMetricsResponse = await fetch(etfMetricsUrl);
        
        if (etfMetricsResponse.ok) {
          const etfMetricsData = await etfMetricsResponse.json();
          console.log(`ETF metrics for ${etfSymbol}:`, etfMetricsData);
          
          if (etfMetricsData && etfMetricsData.metric) {
            const peFields = ['peBasicExclExtraTTM', 'peNormalizedAnnual', 'peTTM'];
            
            for (const field of peFields) {
              if (etfMetricsData.metric[field] && !isNaN(parseFloat(etfMetricsData.metric[field]))) {
                peRatio = parseFloat(etfMetricsData.metric[field]);
                workingSymbol = etfSymbol;
                
                res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
                return res.status(200).json({
                  symbol: 'NIFTY 50',
                  peRatio: parseFloat(peRatio.toFixed(2)),
                  source: 'finnhub-etf',
                  workingSymbol,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
      } catch (etfError) {
        console.error(`Error with ETF symbol ${etfSymbol}:`, etfError.message);
        continue;
      }
    }

    // If still no PE found, return detailed debug information
    return res.status(502).json({ 
      error: 'PE ratio not found in Finnhub',
      message: 'Finnhub may not have PE ratio data for Nifty 50 index directly',
      debugInfo: {
        symbolsTried: niftySymbols,
        etfSymbolsTried: etfSymbols,
        responseData: Object.keys(responseData).length > 0 ? responseData : 'No data received'
      },
      suggestion: 'Consider using alternative data sources or manual PE calculation',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('FINNHUB_API_ERROR:', error);
    return res.status(500).json({ 
      error: `Finnhub API failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}

    let peRatio = null;
    let workingSymbol = null;

    for (const symbol of symbols) {
      try {
        console.log(`Trying symbol: ${symbol}`);
        
        // Get basic quote data which might include PE
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (quoteResponse.ok) {
          const quoteData = await quoteResponse.json();
          console.log(`Quote data for ${symbol}:`, quoteData);
          
          // If quote data doesn't have PE, try company profile
          if (!quoteData.pe && quoteData.c) {
            const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
            const profileResponse = await fetch(profileUrl);
            
            if (profileResponse.ok) {
              const profileData = await profileResponse.json();
              console.log(`Profile data for ${symbol}:`, profileData);
              
              if (profileData.peRatio || profileData.pe) {
                peRatio = profileData.peRatio || profileData.pe;
                workingSymbol = symbol;
                break;
              }
            }
          } else if (quoteData.pe) {
            peRatio = quoteData.pe;
            workingSymbol = symbol;
            break;
          }
        }
        
        // Try metrics endpoint as alternative
        const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_API_KEY}`;
        const metricsResponse = await fetch(metricsUrl);
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          console.log(`Metrics data for ${symbol}:`, metricsData);
          
          if (metricsData.metric && (metricsData.metric.peBasicExclExtraTTM || metricsData.metric.peNormalizedAnnual)) {
            peRatio = metricsData.metric.peBasicExclExtraTTM || metricsData.metric.peNormalizedAnnual;
            workingSymbol = symbol;
            break;
          }
        }
        
      } catch (symbolError) {
        console.error(`Error with symbol ${symbol}:`, symbolError.message);
        continue;
      }
    }

    if (peRatio && !isNaN(parseFloat(peRatio))) {
      peRatio = parseFloat(peRatio);
      
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
      return res.status(200).json({
        symbol: 'NIFTY 50',
        peRatio,
        source: 'finnhub',
        workingSymbol,
        timestamp: new Date().toISOString()
      });
    }

    // If no PE found, try alternative approach with index data
    console.log('Trying alternative Finnhub endpoints...');
    
    // Try economic calendar or forex endpoints for index data
    const forexUrl = `https://finnhub.io/api/v1/forex/rates?base=INR&token=${FINNHUB_API_KEY}`;
    const forexResponse = await fetch(forexUrl);
    
    if (forexResponse.ok) {
      const forexData = await forexResponse.json();
      console.log('Forex data (checking for Indian market data):', forexData);
    }

    return res.status(502).json({ 
      error: 'PE ratio not found in Finnhub data',
      message: 'Finnhub may not have PE ratio data for Nifty 50 index',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('FINNHUB_API_ERROR:', error);
    return res.status(500).json({ 
      error: `Finnhub API failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}
