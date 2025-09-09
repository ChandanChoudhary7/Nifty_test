export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const symbol = '^NSEI';
  let peRatio = null;
  let peFallback = false;
  let rsi = null;
  let rsiFallback = false;

  try {
    // Fetch PE ratio from Yahoo Finance
    const summaryResponse = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const summaryDetail = summaryData?.quoteSummary?.result?.[0]?.summaryDetail;
      const keyStats = summaryData?.quoteSummary?.result?.[0]?.defaultKeyStatistics;
      peRatio = summaryDetail?.trailingPE?.raw || keyStats?.trailingPE?.raw;
      if (peRatio == null) peFallback = true;
    } else {
      peFallback = true;
    }

    // Fetch price history & calculate RSI
    try {
      const chartResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        const result = chartData?.chart?.result?.[0];
        if (result?.indicators?.quote?.[0]?.close) {
          const closes = result.indicators.quote[0].close.filter(c => c != null);
          if (closes.length > 15) {
            rsi = calculateRSI(closes);
            rsiFallback = false;
          } else {
            rsiFallback = true;
          }
        } else {
          rsiFallback = true;
        }
      } else {
        rsiFallback = true;
      }
    } catch (error) {
      rsiFallback = true;
    }

    // Provide fallback values only for missing data
    if (peRatio == null) {
      peRatio = 21.73;
      peFallback = true;
    }
    if (rsi == null) {
      rsi = 53.21;
      rsiFallback = true;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({
      symbol,
      peRatio,
      rsi,
      fallback: {
        pe: peFallback,
        rsi: rsiFallback
      },
      timestamp: new Date().toISOString(),
      source: (!peFallback && !rsiFallback) ? 'yahoo' : 'partial-fallback'
    });
  } catch (error) {
    res.status(200).json({
      symbol: '^NSEI',
      peRatio: 21.73,
      rsi: 53.21,
      fallback: {
        pe: true,
        rsi: true
      },
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
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
  return Math.round((100 - (100 / (1 + rs))) * 100) / 100;
}
