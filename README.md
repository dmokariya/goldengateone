# GoldenGate Terminal - Quant & Zerodha Algo Trading Terminal

An institutional-grade algorithmic trading terminal and quant engine tailored for the Indian Equity and F&O markets (NSE / NFO / BSE / BFO). Built with real-time Zerodha Kite Connect integration, Black-Scholes Delta options pricing, statistical Moneyness & Theta decay filtering, and an automated profit-mandate execution engine.

---

## Key Capabilities

1. **Zerodha Kite Connect Integration**:
   - One-click OAuth login & manual session token authentication.
   - Real-time live quotes (`LTP`, `netChange`, `changePct`, bid/ask orderbook depth).
   - Direct order execution with MIS intraday / CNC product routing, Market / Limit orders, and exchange-mandated freeze limit slicing.
   - Multi-lot sizing calibrated to official Indian exchange lot sizes (NIFTY: 65, BANKNIFTY: 15, FINNIFTY: 40, SENSEX: 10).

2. **Rigorous Quantitative & Risk Engine**:
   - **Moneyness & Black-Scholes Delta**: Computes true contract Delta (ITM: +0.62–0.72, ATM: +0.48, OTM: +0.22–0.36, Equities: 1.00).
   - **Relative Theta Decay Metric**: Measures daily percentage of premium destroyed (`% of premium lost per day`).
   - **Expected Value (EV in ₹/lot)**: Monte Carlo drift-diffusion + Bayesian likelihood model.
   - **Bad Trade & Theta Trap Filter**: Out-of-the-money options and counter-trend setups with negative EV are automatically flagged and secluded under a separate **"⚠️ High Risk / Rejected Trades"** tab.
   - **Must-Take A+ Setups**: Only high-probability setups with ≥85% calibrated win rate and positive EV qualify.

3. **Selective Profit-Only Auto-Trader**:
   - **Strict Confidence Gate**: Executes trades **ONLY** if Win Probability ≥ 85% with positive Expected Value.
   - **Zero Bad-Trade Immunity**: Completely ignores low-delta OTM theta traps and counter-trend signals.
   - **Dynamic Trailing Stop Loss**:
     - At +5% profit: Automatically moves SL to Break-Even.
     - At +10% profit: Locks in guaranteed +5% profit floor.
   - **12-Min Theta Exit Rule**: Protects capital if an option consolidates flat.
   - **Emergency Kill Switch**: Instantly pauses auto-trading and squares off all open positions in 1 click.

4. **Slippage Guard & Exchange Slicing**:
   - Converts market orders into buffered limit orders (0.25%, 0.50%, 1.00%) to protect against market depth gaps.
   - Auto-slices orders exceeding NSE contract freeze limits (e.g. NIFTY 1800 qty).

---

## Tech Stack & Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion
- **Backend / API Proxy**: Node.js + Express + TypeScript (`server.ts`) + `@google/genai`
- **Build System**: Vite (SPA client build) + esbuild (CJS bundle for `server.ts`)

---

## 📜 Version History & Push Log

For a detailed chronological record of every update, quantitative upgrade, and GitHub release, refer to [CHANGELOG.md](./CHANGELOG.md).

---

## Project Structure

```
├── .env.example              # Environment variables template
├── metadata.json             # Applet metadata and permissions
├── package.json              # NPM dependencies and run scripts
├── server.ts                 # Express backend server & Zerodha proxy
├── tsconfig.json             # TypeScript compiler settings
├── vite.config.ts            # Vite build configuration
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Master terminal layout, state & AutoTrader loop
│   ├── index.css             # Tailwind CSS entry
│   ├── types.ts              # Strong TypeScript models & interfaces
│   ├── components/
│   │   ├── Header.tsx                 # Top navigation, status ticker & Zerodha login modal trigger
│   │   ├── TickerBar.tsx              # Dynamic real-time market indices ticker
│   │   ├── QuickSelectRibbon.tsx      # Quick strike selector ribbon (ITM/ATM/OTM/Equities)
│   │   ├── LiveSignalsView.tsx        # Signal cards, Actionable vs Rejected tab filter, spot editor
│   │   ├── ActivePositionsView.tsx    # Live P&L monitor, TSL visualizer, manual exit & freeze slice
│   │   ├── TradeDetailsModal.tsx      # Deep quant analytics, Monte Carlo breakdown & Greeks
│   │   ├── AutoTraderConfirmModal.tsx # Disciplined Auto-Trader confirmation modal
│   │   ├── OrderExecutionModal.tsx    # One-click order confirmation dialog
│   │   ├── ExecutionLogDrawer.tsx     # Terminal logs & audit trail
│   │   └── PerformanceDashboard.tsx   # Win rate stats, cumulative PnL, risk-reward metrics
│   └── utils/
│       └── quantEngine.ts             # Black-Scholes Greeks, Moneyness, Freeze Limits & EV Engine
```

---

## Getting Started / Local Development

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or bun

### 2. Installation
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The terminal dev server runs at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
```
Generates the static client assets in `dist/` and bundles `dist/server.cjs`.

### 5. Production Start
```bash
npm start
```

---

## Environment Configuration

Create a `.env` file in the root directory if running with external AI / custom credentials:

```env
GEMINI_API_KEY="your-gemini-api-key"
APP_URL="http://localhost:3000"
```
