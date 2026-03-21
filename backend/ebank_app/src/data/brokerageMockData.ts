export type BrokerageAssetClass = 'Stocks' | 'Bonds' | 'ETFs' | 'Commodities' | 'Crypto';

export interface OverviewMetric {
  label: string;
  value: string;
  change: string;
  tone: 'positive' | 'neutral' | 'negative';
}

export interface Holding {
  symbol: string;
  name: string;
  assetClass: BrokerageAssetClass;
  quantity: string;
  lastPrice: string;
  marketValue: string;
  dayChange: string;
  allocation: number;
}

export interface MarketMover {
  symbol: string;
  name: string;
  assetClass: BrokerageAssetClass;
  price: string;
  change: string;
  volume: string;
}

export interface OrderItem {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Stop';
  quantity: string;
  status: 'Open' | 'Partially Filled' | 'Filled';
  submittedAt: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  amount: string;
  timestamp: string;
  tone: 'positive' | 'neutral' | 'negative';
}

export interface ResearchTheme {
  title: string;
  description: string;
  focus: string;
  impact: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: string;
  period: string;
  generatedAt: string;
  status: 'Ready' | 'Processing';
}

export interface FundingMethod {
  id: string;
  name: string;
  description: string;
  timing: string;
  fee: string;
}

export const overviewMetrics: OverviewMetric[] = [
  { label: 'Net Liquidation Value', value: '$248,460.18', change: '+3.82% this month', tone: 'positive' },
  { label: 'Buying Power', value: '$62,300.00', change: 'Margin enabled', tone: 'neutral' },
  { label: 'Day P&L', value: '+$2,184.44', change: '+0.89% today', tone: 'positive' },
  { label: 'Income Pipeline', value: '$4,780.00', change: 'Dividends and coupons due', tone: 'neutral' }
];

export const holdings: Holding[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'Stocks', quantity: '180 shares', lastPrice: '$214.42', marketValue: '$38,595.60', dayChange: '+1.12%', allocation: 16 },
  { symbol: 'IEF', name: 'iShares 7-10Y Treasury Bond ETF', assetClass: 'ETFs', quantity: '420 units', lastPrice: '$94.03', marketValue: '$39,492.60', dayChange: '-0.28%', allocation: 16 },
  { symbol: 'US10Y-34', name: 'US Treasury Note 3.4% 2034', assetClass: 'Bonds', quantity: '$50,000 par', lastPrice: '$98.11', marketValue: '$49,055.00', dayChange: '+0.18%', allocation: 20 },
  { symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: 'Commodities', quantity: '125 units', lastPrice: '$221.38', marketValue: '$27,672.50', dayChange: '+0.73%', allocation: 11 },
  { symbol: 'BTC', name: 'Bitcoin', assetClass: 'Crypto', quantity: '0.62 BTC', lastPrice: '$81,540.00', marketValue: '$50,554.80', dayChange: '+2.94%', allocation: 21 }
];

export const marketMovers: MarketMover[] = [
  { symbol: 'NVDA', name: 'NVIDIA', assetClass: 'Stocks', price: '$946.88', change: '+4.25%', volume: '42.1M' },
  { symbol: 'LQD', name: 'iShares iBoxx $ Inv Grade Corp Bond ETF', assetClass: 'ETFs', price: '$109.21', change: '+0.31%', volume: '5.3M' },
  { symbol: 'XAUUSD', name: 'Spot Gold', assetClass: 'Commodities', price: '$2,184.10', change: '+1.07%', volume: 'Heavy' },
  { symbol: 'ETH', name: 'Ethereum', assetClass: 'Crypto', price: '$4,215.55', change: '+3.66%', volume: '$18.4B' }
];

export const openOrders: OrderItem[] = [
  { id: 'ord-1', symbol: 'MSFT', side: 'Buy', orderType: 'Limit', quantity: '40 shares @ $417.00', status: 'Open', submittedAt: 'Today, 09:41 AM' },
  { id: 'ord-2', symbol: 'BTC', side: 'Sell', orderType: 'Stop', quantity: '0.15 BTC @ $78,200', status: 'Open', submittedAt: 'Today, 10:12 AM' },
  { id: 'ord-3', symbol: 'TLT', side: 'Buy', orderType: 'Market', quantity: '120 units', status: 'Partially Filled', submittedAt: 'Yesterday, 03:18 PM' }
];

export const activityFeed: ActivityItem[] = [
  { id: 'act-1', type: 'Trade Fill', title: 'Buy execution completed for GLD', detail: '25 units filled at $220.96', amount: '-$5,524.00', timestamp: 'Today, 11:24 AM', tone: 'neutral' },
  { id: 'act-2', type: 'Dividend', title: 'Cash dividend posted', detail: 'AAPL quarterly distribution', amount: '+$172.80', timestamp: 'Today, 08:02 AM', tone: 'positive' },
  { id: 'act-3', type: 'Funding', title: 'Wire received into brokerage cash', detail: 'Bank of America ending 4452', amount: '+$15,000.00', timestamp: 'Yesterday, 04:44 PM', tone: 'positive' },
  { id: 'act-4', type: 'Fee', title: 'Exchange fee charged', detail: 'Crypto execution and routing', amount: '-$18.50', timestamp: 'Yesterday, 02:15 PM', tone: 'negative' }
];

export const researchThemes: ResearchTheme[] = [
  { title: 'Rates and Duration', description: 'Treasury curve repricing continues to favor selective intermediate duration.', focus: 'Bonds and bond ETFs', impact: 'Income and hedging allocations' },
  { title: 'AI Earnings Momentum', description: 'Semiconductor guidance remains strong, but valuation dispersion is widening.', focus: 'US large-cap equities', impact: 'Growth sleeve positioning' },
  { title: 'Commodity Inflation Hedge', description: 'Gold and energy continue to respond to macro uncertainty and supply discipline.', focus: 'Gold and commodity ETFs', impact: 'Real asset diversification' },
  { title: 'Crypto Beta Rotation', description: 'Spot ETF flows are improving risk appetite across major crypto assets.', focus: 'BTC and ETH', impact: 'Tactical satellite allocation' }
];

export const documents: DocumentItem[] = [
  { id: 'doc-1', title: 'March Account Statement', type: 'Statement', period: 'Mar 2026', generatedAt: 'Mar 20, 2026', status: 'Ready' },
  { id: 'doc-2', title: 'Trade Confirmation Bundle', type: 'Trade Confirmation', period: 'Week of Mar 18', generatedAt: 'Mar 21, 2026', status: 'Ready' },
  { id: 'doc-3', title: 'Funding Advice Notice', type: 'Funding Advice', period: 'Wire deposits', generatedAt: 'Mar 21, 2026', status: 'Processing' },
  { id: 'doc-4', title: '2025 Tax Package', type: 'Tax Document', period: 'Tax year 2025', generatedAt: 'Feb 11, 2026', status: 'Ready' }
];

export const fundingMethods: FundingMethod[] = [
  { id: 'bank-wire', name: 'Bank Wire', description: 'Same-day brokerage funding for larger allocations.', timing: 'Same day', fee: '$15 outbound / inbound varies' },
  { id: 'ach', name: 'ACH Transfer', description: 'Link your bank and move cash into your trading account.', timing: '1-3 business days', fee: 'Free' },
  { id: 'stablecoin', name: 'Stablecoin Transfer', description: 'Move supported stablecoins into your digital asset wallet.', timing: 'Network dependent', fee: 'Network fee only' }
];

export const watchlist = [
  { symbol: 'AMZN', trigger: 'Breakout above $189.50', assetClass: 'Stocks' },
  { symbol: 'HYG', trigger: 'Yield spread compression', assetClass: 'ETFs' },
  { symbol: 'CL1!', trigger: 'Crude momentum above $83', assetClass: 'Commodities' },
  { symbol: 'SOL', trigger: 'Relative strength vs ETH', assetClass: 'Crypto' }
];