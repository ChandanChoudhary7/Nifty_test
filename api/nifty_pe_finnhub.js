// api/nifty_pe_finnhub.js
const FINNHUB_API_KEY = 'd3081ipr01qnmrsdd240d3081ipr01qnmrsdd24g';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    console.log('Attempting to fetch Nifty 50 data from Finnhub...');

    // Try different symbol formats for Nifty 50 on Finnhub
    const symbols = ['^NSEI', 'NSEI', 'NSE:NIFTY50', 'NSE:NIFTY'];
    
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
