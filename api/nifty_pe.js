// api/nifty_pe.js
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  try {
    // Prepare Chromium path/args for serverless
    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();
    // Helpful headers for NSE pages
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-GB,en;q=0.9'
    });

    // Warm-up to set cookies/domains NSE often expects
    await page.goto('https://www.nseindia.com/', { waitUntil: 'networkidle2', timeout: 60000 });

    // Navigate to indices data page
    await page.goto('https://www.nseindia.com/market-data/indices-data', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for a table to render (the page structure can change over time)
    await page.waitForSelector('table', { timeout: 45000 });

    // Try to find the row for NIFTY 50 and locate the PE column
    const pe = await page.evaluate(() => {
      // Find any table that contains a header with PE/P-E and a row with NIFTY 50
      const tables = Array.from(document.querySelectorAll('table'));
      for (const table of tables) {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim().toUpperCase());
        let peIndex = headers.findIndex(h => h.includes('P/E') || h === 'PE' || h.includes('P E'));
        if (peIndex === -1) peIndex = 2; // fallback guess if header text unavailable

        const rows = Array.from(table.querySelectorAll('tbody tr'));
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length && /NIFTY\s*50/i.test(cells.innerText)) {
            const txt = cells[peIndex]?.innerText?.trim() || '';
            const num = parseFloat(txt.replace(/[^\d.]/g, ''));
            if (!Number.isNaN(num)) return num;
          }
        }
      }
      return null;
    });

    await browser.close();

    if (Number.isFinite(pe)) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
      return res.status(200).json({
        symbol: 'NIFTY 50',
        peRatio: pe,
        source: 'nseindia',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(502).json({ error: 'PE not found on NSE page' });
  } catch (err) {
    return res.status(500).json({ error: `Scraper failed: ${err.message}` });
  }
}
