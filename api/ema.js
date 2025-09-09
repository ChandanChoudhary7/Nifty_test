const FINNHUB_TOKEN = process.env.FINNHUB_TOKEN;
const ALPHA_VANTAGE = process.env.ALPHA_VANTAGE;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const period = parseInt(req.query.period) || 20;

  try {
    let emaValue = null;

    // Try Finnhub first if token is available
    if (FINNHUB_TOKEN) {
      try {
        const now = Math.floor(Date.now() / 1000);
        const from = now - (400 * 24 * 60 * 60); // 400 days back

        // Try different symbol formats for Nifty
        const symbols = ['NSE:NIFTY', '^NSEI', 'NSEI'];

        for (const symbol of symbols) {
          const url = `https://finnhub.io/api/v1/indicator?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}&indicator=ema&timeperiod=${period}&token=${FINNHUB_TOKEN}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.ema && data.ema.length > 0) {
            emaValue = data.ema[data.ema.length - 1];
            break;
          }
        }
      } catch (error) {
        console.error('Finnhub EMA Error:', error);
      }
    }

    // Try Alpha Vantage if Finnhub failed and token is available
    if (!emaValue && ALPHA_VANTAGE) {
      try {
        const url = `https://www.alphavantage.co/query?function=EMA&symbol=^NSEI&interval=daily&time_period=${period}&series_type=close&apikey=${ALPHA_VANTAGE}`;
        const response = await fetch(url);
        const data = await response.json();

        const technicalAnalysis = data['Technical Analysis: EMA'];
        if (technicalAnalysis) {
          const dates = Object.keys(technicalAnalysis);
          if (dates.length > 0) {
            const latestDate = dates[0];
            emaValue = parseFloat(technicalAnalysis[latestDate]['EMA']);
          }
        }
      } catch (error) {
        console.error('Alpha Vantage EMA Error:', error);
      }
    }

    // If no external API worked, use fallback values
    if (!emaValue) {
      const fallbackValues = {
        20: 24734.31,
        50: 24788.64
      };
      emaValue = fallbackValues[period] || null;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({
      period,
      ema: emaValue,
      timestamp: new Date().toISOString(),
      source: emaValue ? (FINNHUB_TOKEN ? 'finnhub' : ALPHA_VANTAGE ? 'alphavantage' : 'fallback') : 'fallback'
    });

  } catch (error) {
    console.error('EMA API Error:', error);
    // Return fallback data
    const fallbackValues = {
      20: 24734.31,
      50: 24788.64
    };

    res.status(200).json({
      period,
      ema: fallbackValues[period] || null,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
}
