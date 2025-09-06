// Nifty 50 Investment Tracker App
class NiftyTracker {
    constructor() {
        this.data = {
            symbol: "^NSEI",
            current_price: 24741.00,
            previous_close: 24734.30,
            open: 24818.85,
            high_52w: 26277.35,
            low_52w: 21743.65,
            change: 6.70,
            change_percent: 0.027,
            dma_50: 24734.31,
            dma_200: 24788.64,
            ema_20: 24734.31,
            ema_50: 24788.64,
            trend: "BEARISH",
            signal: "AVOID",
            last_updated: "2025-09-06T22:37:00+05:30"
        };
        
        this.isLoading = false;
        this.isConnected = true;
        
        this.init();
    }
    
    init() {
        this.showLoadingScreen();
        this.bindEvents();
        this.updateConnectionStatus();
        
        // Simulate initial data load
        setTimeout(() => {
            this.hideLoadingScreen();
            this.updateAllData();
            this.startDataSimulation();
        }, 2000);
    }
    
    bindEvents() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', () => this.refreshData());
        
        // Touch events for mobile
        refreshBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            refreshBtn.style.transform = 'scale(0.95)';
        });
        
        refreshBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            refreshBtn.style.transform = 'scale(1)';
        });
        
        // PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('PWA install prompt available');
        });
    }
    
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        loadingScreen.style.display = 'flex';
        app.classList.add('hidden');
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            app.classList.remove('hidden');
        }, 600);
    }
    
    updateConnectionStatus() {
        const connectionDot = document.getElementById('connection-dot');
        const connectionText = document.getElementById('connection-text');
        
        if (this.isConnected) {
            connectionDot.classList.add('connected');
            connectionText.textContent = 'Connected';
        } else {
            connectionDot.classList.remove('connected');
            connectionText.textContent = 'Disconnected';
        }
    }
    
    formatCurrency(value) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value).replace('₹', '₹');
    }
    
    formatNumber(value, decimals = 2) {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    }
    
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        }).format(date);
    }
    
    calculateSignal() {
        const { ema_20, ema_50, current_price, previous_close } = this.data;
        
        // EMA Crossover Analysis
        const isBullish = ema_20 > ema_50;
        const priceUp = current_price > previous_close;
        
        if (isBullish && priceUp) {
            return {
                signal: 'BUY',
                icon: '🚀',
                trend: 'BULLISH',
                momentum: 'POSITIVE',
                description: 'Technical indicators show bullish momentum. The 20 EMA is above the 50 EMA with positive price action. Consider entering positions with proper risk management.'
            };
        } else if (!isBullish && !priceUp) {
            return {
                signal: 'AVOID',
                icon: '⚠️',
                trend: 'BEARISH',
                momentum: 'NEGATIVE',
                description: 'Current technical indicators suggest a bearish trend. The 20 EMA is below the 50 EMA, indicating downward momentum. Consider waiting for better entry points.'
            };
        } else {
            return {
                signal: 'WAIT',
                icon: '⏳',
                trend: 'NEUTRAL',
                momentum: 'MIXED',
                description: 'Mixed signals detected. Some indicators show conflicting trends. Consider waiting for clearer technical confirmation before making investment decisions.'
            };
        }
    }
    
    updatePriceData() {
        // Current Price
        document.getElementById('current-price').textContent = this.formatNumber(this.data.current_price);
        
        // Price Change
        const changeElement = document.getElementById('price-change');
        const changePercentElement = document.getElementById('price-change-percent');
        const trendIndicator = document.getElementById('trend-indicator');
        
        const change = this.data.change;
        const changePercent = this.data.change_percent;
        
        changeElement.textContent = change >= 0 ? `+${this.formatNumber(change)}` : this.formatNumber(change);
        changePercentElement.textContent = `(${change >= 0 ? '+' : ''}${this.formatNumber(changePercent, 3)}%)`;
        
        // Apply color classes
        changeElement.className = `change-value ${change >= 0 ? 'positive' : 'negative'}`;
        trendIndicator.textContent = change >= 0 ? '📈' : '📉';
        
        // Other price data
        document.getElementById('prev-close').textContent = this.formatCurrency(this.data.previous_close);
        document.getElementById('open-price').textContent = this.formatCurrency(this.data.open);
        document.getElementById('high-52w').textContent = this.formatCurrency(this.data.high_52w);
        document.getElementById('low-52w').textContent = this.formatCurrency(this.data.low_52w);
    }
    
    updateTechnicalData() {
        document.getElementById('dma-50').textContent = this.formatCurrency(this.data.dma_50);
        document.getElementById('dma-200').textContent = this.formatCurrency(this.data.dma_200);
        document.getElementById('ema-20').textContent = this.formatCurrency(this.data.ema_20);
        document.getElementById('ema-50').textContent = this.formatCurrency(this.data.ema_50);
        
        // Crossover Analysis
        const isBullish = this.data.ema_20 > this.data.ema_50;
        const crossoverIcon = document.getElementById('crossover-icon');
        const crossoverStatus = document.getElementById('crossover-status');
        
        if (isBullish) {
            crossoverIcon.textContent = '📈';
            crossoverStatus.textContent = 'BULLISH';
            crossoverStatus.className = 'crossover-label bullish';
        } else {
            crossoverIcon.textContent = '📉';
            crossoverStatus.textContent = 'BEARISH';
            crossoverStatus.className = 'crossover-label';
        }
    }
    
    updateInvestmentSignal() {
        const signalData = this.calculateSignal();
        
        document.getElementById('signal-icon').textContent = signalData.icon;
        document.getElementById('signal-text').textContent = signalData.signal;
        document.getElementById('signal-description').textContent = signalData.description;
        document.getElementById('trend-status').textContent = signalData.trend;
        document.getElementById('momentum-status').textContent = signalData.momentum;
        
        // Apply signal classes
        const signalText = document.getElementById('signal-text');
        const trendStatus = document.getElementById('trend-status');
        const momentumStatus = document.getElementById('momentum-status');
        
        signalText.className = `signal-text ${signalData.signal.toLowerCase()}`;
        
        if (signalData.trend === 'BULLISH') {
            trendStatus.className = 'detail-value bullish';
            momentumStatus.className = 'detail-value bullish';
        } else if (signalData.trend === 'BEARISH') {
            trendStatus.className = 'detail-value bearish';
            momentumStatus.className = 'detail-value bearish';
        } else {
            trendStatus.className = 'detail-value neutral';
            momentumStatus.className = 'detail-value neutral';
        }
    }
    
    updateLastUpdated() {
        document.getElementById('last-updated').textContent = this.formatDateTime(this.data.last_updated);
    }
    
    updateAllData() {
        this.updatePriceData();
        this.updateTechnicalData();
        this.updateInvestmentSignal();
        this.updateLastUpdated();
    }
    
    simulateMarketData() {
        // Simulate realistic market fluctuations
        const basePrice = 24741.00;
        const volatility = 0.002; // 0.2% volatility
        const randomChange = (Math.random() - 0.5) * 2 * volatility;
        
        this.data.current_price = basePrice + (basePrice * randomChange);
        this.data.change = this.data.current_price - this.data.previous_close;
        this.data.change_percent = (this.data.change / this.data.previous_close) * 100;
        
        // Slightly adjust EMAs (they move slower)
        const emaVolatility = 0.0005;
        const emaChange = (Math.random() - 0.5) * 2 * emaVolatility;
        
        this.data.ema_20 += this.data.ema_20 * emaChange;
        this.data.ema_50 += this.data.ema_50 * (emaChange * 0.5);
        
        // Update timestamp
        this.data.last_updated = new Date().toISOString();
    }
    
    startDataSimulation() {
        // Simulate data updates every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.simulateMarketData();
                this.updateAllData();
            }
        }, 30000);
        
        // Simulate connection status changes
        setInterval(() => {
            if (Math.random() < 0.05) { // 5% chance
                this.isConnected = !this.isConnected;
                this.updateConnectionStatus();
                
                if (this.isConnected) {
                    setTimeout(() => {
                        this.isConnected = true;
                        this.updateConnectionStatus();
                    }, 3000);
                }
            }
        }, 60000);
    }
    
    async refreshData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const refreshBtn = document.getElementById('refresh-btn');
        
        // Update UI to show loading state
        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');
        
        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate new data
            this.simulateMarketData();
            this.updateAllData();
            
            // Show success feedback
            this.showToast('Data refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Refresh failed:', error);
            this.showToast('Failed to refresh data', 'error');
        } finally {
            this.isLoading = false;
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        // Add toast styles
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--color-surface);
            color: var(--color-text);
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid var(--color-card-border);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            backdrop-filter: blur(10px);
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        
        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    // Handle visibility change (for PWA behavior)
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('App went to background');
        } else {
            console.log('App came to foreground');
            // Refresh data when app comes back to foreground
            setTimeout(() => this.refreshData(), 500);
        }
    }
}

// Utility functions
function addTouchFeedback(element) {
    element.addEventListener('touchstart', () => {
        element.style.opacity = '0.7';
    });
    
    element.addEventListener('touchend', () => {
        element.style.opacity = '1';
    });
    
    element.addEventListener('touchcancel', () => {
        element.style.opacity = '1';
    });
}

// Handle page visibility for PWA-like behavior
document.addEventListener('visibilitychange', () => {
    if (window.niftyTracker) {
        window.niftyTracker.handleVisibilityChange();
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    if (window.niftyTracker) {
        window.niftyTracker.isConnected = true;
        window.niftyTracker.updateConnectionStatus();
        window.niftyTracker.showToast('Connection restored', 'success');
    }
});

window.addEventListener('offline', () => {
    if (window.niftyTracker) {
        window.niftyTracker.isConnected = false;
        window.niftyTracker.updateConnectionStatus();
        window.niftyTracker.showToast('Connection lost', 'error');
    }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.niftyTracker = new NiftyTracker();
    
    // Add touch feedback to interactive elements
    const interactiveElements = document.querySelectorAll('.btn, .card');
    interactiveElements.forEach(addTouchFeedback);
    
    // Handle iOS viewport height issue
    function updateVH() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    updateVH();
    window.addEventListener('resize', updateVH);
    window.addEventListener('orientationchange', () => {
        setTimeout(updateVH, 100);
    });
});

// Service Worker registration for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Create a minimal service worker inline
        const swCode = `
            self.addEventListener('fetch', event => {
                if (event.request.mode === 'navigate') {
                    event.respondWith(
                        fetch(event.request).catch(() => {
                            return new Response('Offline - Please check your connection', {
                                status: 200,
                                headers: { 'Content-Type': 'text/html' }
                            });
                        })
                    );
                }
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Export for debugging
window.NiftyTracker = NiftyTracker;
