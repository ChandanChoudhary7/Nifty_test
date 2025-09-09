// api/nifty_pe_api.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    console.log('Attempting to fetch NSE API data...');

    // First, call NSE home page to get cookies (some NSE APIs require cookies)
    const homeResponse = await fetch('https://www.nseindia.com', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36' 
      }
    });

    console.log('Home page response status:', homeResponse.status);

    // Get cookies from home page response
    const cookies = homeResponse.headers.get('set-cookie') || '';

    // Then fetch Nifty 50 index data JSON
    const apiUrl = 'https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050';
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.nseindia.com/market-data/live-equity-market',
        'Cookie': cookies
      }
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      throw new Error(`NSE API returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('API data received, keys:', Object.keys(data));

    // Extract PE ratio from data structure
    let peRatio = null;
    
    // Try different possible data structures
    if (data.data && Array.isArray(data.data)) {
      const nifty = data.data.find(item => 
        item.indexName === 'NIFTY 50' || 
        item.indexName === 'NIFTY50' ||
        item.index === 'NIFTY 50'
      );
      
      if (nifty) {
        // Try different possible PE field names
        peRatio = nifty.pe || nifty.p_e || nifty.PE || nifty.peRatio || null;
        console.log('Found Nifty data:', nifty);
      }
    }

    // If direct structure doesn't work, try alternative parsing
    if (!peRatio && data.advance && data.advance.declines) {
      // Sometimes PE is in a different part of the response
      console.log('Trying alternative data structure...');
    }

    if (peRatio && !isNaN(parseFloat(peRatio))) {
      peRatio = parseFloat(peRatio);
      
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
      return res.status(200).json({
        symbol: 'NIFTY 50',
        peRatio,
        source: 'nseindia-api',
        timestamp: new Date().toISOString()
      });
    }

    // If PE not found, return the raw data for inspection
    return res.status(502).json({ 
      error: 'PE not found in API response', 
      rawData: data,
      message: 'Check logs and raw data to understand API structure'
    });

  } catch (error) {
    console.error('NSE_API_ERROR:', error);
    return res.status(500).json({ 
      error: `NSE API failed: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
}
