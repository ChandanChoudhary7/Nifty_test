export default async function handler(req, res) {
  try {
    const symbol = '^NSEI';
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const j = await r.json();
    const q = j?.quoteResponse?.result?. || {};
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.status(200).json({
      symbol,
      regularMarketPrice: q.regularMarketPrice ?? null,
      regularMarketOpen: q.regularMarketOpen ?? null,
      previousClose: q.regularMarketPreviousClose ?? null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null
    });
  } catch (e) {
    res.status(200).json({
      symbol: '^NSEI',
      regularMarketPrice: null,
      regularMarketOpen: null,
      previousClose: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null
    });
  }
}
