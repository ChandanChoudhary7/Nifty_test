export default async function handler(req, res) {
  try {
    const symbol = '^NSEI';
    // summaryDetail module commonly exposes fiftyDayAverage & twoHundredDayAverage
    const qs = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryDetail`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const j = await qs.json();
    const sd = j?.quoteSummary?.result?.?.summaryDetail || {};
    let fiftyDayAverage = sd.fiftyDayAverage?.raw ?? null;
    let twoHundredDayAverage = sd.twoHundredDayAverage?.raw ?? null;

    // Fallback to quote if summaryDetail didn’t include the fields
    if (!fiftyDayAverage || !twoHundredDayAverage) {
      const q = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const qj = await q.json();
      const r = qj?.quoteResponse?.result?. || {};
      if (!fiftyDayAverage && r.fiftyDayAverage) fiftyDayAverage = r.fiftyDayAverage;
      if (!twoHundredDayAverage && r.twoHundredDayAverage) twoHundredDayAverage = r.twoHundredDayAverage;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({ symbol, fiftyDayAverage, twoHundredDayAverage });
  } catch (e) {
    res.status(200).json({ symbol: '^NSEI', fiftyDayAverage: null, twoHundredDayAverage: null });
  }
}
