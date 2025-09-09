// File: api/nifty_pe.js

import puppeteer from 'puppeteer';

export default async function handler(req, res) {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to NSE indices page
    await page.goto('https://www.nseindia.com/market-data/live-equity-market', {
      waitUntil: 'networkidle2',
    });

    // Wait for the relevant data table to load — adjust selector as NSE page updates
    await page.waitForSelector('table');

    // Evaluate page content to extract Nifty 50 PE
    const peData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      for (const row of rows) {
        const symbolCell = row.querySelector('td:nth-child(1)');
        if (symbolCell && symbolCell.textContent.includes('NIFTY 50')) {
          const peCell = row.querySelector('td:nth-child(3)');
          if (peCell) {
            return peCell.textContent.trim();
          }
        }
      }
      return null;
    });

    await browser.close();

    if (peData) {
      res.status(200).json({
        symbol: 'NIFTY 50',
        peRatio: parseFloat(peData),
        source: 'NSE India',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: 'Failed to extract PE data',
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Scraping error: ' + error.message,
    });
  }
}
