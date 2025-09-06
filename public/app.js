const $ = (id) => document.getElementById(id);
const state = { };

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '--';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(url + ' failed');
  return r.json();
}

async function loadQuote() {
  const q = await getJSON('/api/quote');
  state.price = q.regularMarketPrice;
  state.prevClose = q.previousClose;
  state.open = q.regularMarketOpen;
  state.hi52 = q.fiftyTwoWeekHigh;
  state.lo52 = q.fiftyTwoWeekLow;
}

async function loadYahooAverages() {
  const y = await getJSON('/api/yahoo');
  state.dma50 = y.fiftyDayAverage;
  state.dma200 = y.twoHundredDayAverage;
}

async function loadEMAs() {
  const [e20, e50] = await Promise.all([
    getJSON('/api/ema?period=20'),
    getJSON('/api/ema?period=50'),
  ]);
  state.ema20 = e20.ema;
  state.ema50 = e50.ema;
  state.emaTrend = (state.ema20 != null && state.ema50 != null)
    ? (state.ema20 > state.ema50 ? 'BULLISH' : 'BEARISH')
    : 'N/A';
}

function render() {
  // market
  $('price').textContent = '₹' + fmt(state.price);
  $('prevClose').textContent = '₹' + fmt(state.prevClose);
  $('open').textContent = '₹' + fmt(state.open);
  $('hi52').textContent = '₹' + fmt(state.hi52);
  $('lo52').textContent = '₹' + fmt(state.lo52);
  // averages
  $('dma50').textContent = '₹' + fmt(state.dma50);
  $('dma200').textContent = '₹' + fmt(state.dma200);
  $('ema20').textContent = state.ema20 == null ? 'N/A' : '₹' + fmt(state.ema20);
  $('ema50').textContent = state.ema50 == null ? 'N/A' : '₹' + fmt(state.ema50);
  // crossover
  const trendEl = $('emaTrend');
  trendEl.textContent = state.emaTrend;
  trendEl.className = 'card-value ' + (state.emaTrend === 'BULLISH' ? 'positive' :
                                       state.emaTrend === 'BEARISH' ? 'negative' : '');
  // signal
  const sig = $('signal');
  if (state.ema20 != null && state.ema50 != null) {
    const buy = state.ema20 > state.ema50;
    sig.className = 'signal-card ' + (buy ? 'buy' : 'avoid');
    $('signal').querySelector('.signal-status').textContent = buy ? 'BUY' : 'AVOID';
    $('signal').querySelector('.signal-description').textContent =
      buy ? 'EMA momentum is bullish (20 > 50)' : 'EMA momentum is bearish (20 < 50)';
  } else {
    sig.className = 'signal-card wait';
    $('signal').querySelector('.signal-status').textContent = 'WAIT';
    $('signal').querySelector('.signal-description').textContent =
      'Waiting for EMA provider data';
  }
  $('lastUpdated').textContent = 'Last updated: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
}

async function bootstrap() {
  try {
    $('loading').classList.remove('hidden');
    await Promise.all([loadQuote(), loadYahooAverages(), loadEMAs()]);
    render();
  } catch (e) {
    console.error(e);
    alert('Network error while loading data.');
  } finally {
    $('loading').classList.add('hidden');
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.addEventListener('load', () => {
  $('refreshBtn').addEventListener('click', bootstrap);
  $('connectionStatus').textContent = navigator.onLine ? 'Online' : 'Offline';
  window.addEventListener('online', ()=> $('connectionStatus').textContent = 'Online');
  window.addEventListener('offline', ()=> $('connectionStatus').textContent = 'Offline');
  bootstrap();
});
