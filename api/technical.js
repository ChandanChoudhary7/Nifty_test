// api/technical.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const symbol = '^NSEI';
  let peRatio = null;
  let rsi = null;
  let peFallback = false;
  let rsiFallback = false;

  try {
    // Get PE from internal NSE scraper API
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const peResp = await fetch(`${baseUrl}/api/nifty_pe`);
      if (peResp.ok) {
        const peJson = await peResp.json();
        if (typeof peJson.peRatio === 'number') {
          peRatio = peJson.peRatio;
        } else {
          peFallback = true;
        }
      } else {
        peFallback = true;
      }
    } catch {
      peFallback = true;
    }

    // Calculate RSI using Yahoo Finance data
    try {
      const chartResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );

      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        const result = chartData?.chart?.result?.[0];
        const closes = result?.indicators?.quote?.[0]?.close?.filter(c => c != null) || [];

        if (closes.length > 15) {
          rsi = calculateRSI(closes);
          rsiFallback = false;
        } else {
          rsiFallback = true;
        }
      } else {
        rsiFallback = true;
      }
    } catch {
      rsiFallback = true;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    return res.status(200).json({
      symbol,
      peRatio,
      rsi,
      fallback: { pe: peFallback || peRatio === null, rsi: rsiFallback || rsi === null },
      source: (!peFallback && peRatio !== null && !rsiFallback && rsi !== null) ? 'live' : 'partial-fallback',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      symbol,
      peRatio: null,
      rsi: null,
      fallback: { pe: true, rsi: true },
      source: 'error',
      error: String(error),
      timestamp: new Date().toISOString()
    });
  }
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Math.round(rsi * 100) / 100;
}
