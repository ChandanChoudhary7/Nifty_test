const FINNHUB = process.env.FINNHUB_TOKEN;     // optional
const AV = process.env.ALPHA_VANTAGE;          // optional

export default async function handler(req, res) {
  const p = Number(req.query.period || '20');
  const rawSym = req.query.sym || '^NSEI';

  // Finnhub expects an exchange-qualified symbol for some indices; try common formats.
  const finnhubCandidates = [
    'NSE:NIFTY',     // common alias on Finnhub
    '^NSEI',         // sometimes supported
    rawSym
  ];

  try {
    let ema = null;
    // 1) Finnhub Technical Indicator: EMA
    if (FINNHUB) {
      const now = Math.floor(Date.now() / 1000);
      const from = now - 400 * 24 * 60 * 60;
      for (const s of finnhubCandidates) {
        const url = `https://finnhub.io/api/v1/indicator?symbol=${encodeURIComponent(s)}&resolution=D&from=${from}&to=${now}&indicator=ema&timeperiod=${p}&token=${FINNHUB}`;
        const r = await fetch(url);
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j?.ema) && j.ema.length) { ema = j.ema[j.ema.length - 1]; break; }
        }
      }
    }

    // 2) Alpha Vantage Technical Indicator: EMA (interval=daily)
    if (!ema && AV) {
      const url = `https://www.alphavantage.co/query?function=EMA&symbol=${encodeURIComponent('^NSEI')}&interval=daily&time_period=${p}&series_type=close&apikey=${AV}`;
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        const ta = j?.['Technical Analysis: EMA'];
        if (ta) {
          const latest = Object.keys(ta);
          ema = Number(ta[latest]?.EMA ?? null);
        }
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).json({ period: p, ema });
  } catch (e) {
    res.status(200).json({ period: p, ema: null });
  }
}
