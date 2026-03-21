import React from 'react';
import { PieChart, Shield, TrendingUp, Wallet } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { holdings } from '../../data/brokerageMockData';

const Portfolio: React.FC = () => {
  return (
    <DashboardLayout title="Portfolio" subtitle="Asset allocation, cross-asset exposure, and income-producing positions">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <PieChart className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current holdings</h2>
                <p className="text-sm text-slate-500">Phase 1 portfolio view across stocks, bonds, ETFs, commodities, and crypto</p>
              </div>
            </div>

            <div className="space-y-4">
              {holdings.map((holding) => (
                <div key={holding.symbol} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="text-base font-semibold text-slate-900">{holding.symbol}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{holding.assetClass}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{holding.name}</p>
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-4 sm:gap-6 lg:text-right">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Quantity</p>
                        <p className="mt-1 font-semibold text-slate-900">{holding.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Last price</p>
                        <p className="mt-1 font-semibold text-slate-900">{holding.lastPrice}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Market value</p>
                        <p className="mt-1 font-semibold text-slate-900">{holding.marketValue}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Day change</p>
                        <p className={`mt-1 font-semibold ${holding.dayChange.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{holding.dayChange}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                      <span>Allocation</span>
                      <span>{holding.allocation}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-900" style={{ width: `${holding.allocation}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Allocation notes</h3>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">Growth sleeve</p>
                  <p className="mt-1">Technology and crypto holdings are driving upside beta. Review correlation before adding to both at once.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">Income sleeve</p>
                  <p className="mt-1">Treasury exposure and bond ETFs are stabilizing volatility while preserving yield participation.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">Real assets</p>
                  <p className="mt-1">Commodity exposure is functioning as an inflation hedge and macro uncertainty offset.</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Wallet className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Cash and income</h3>
              </div>
              <div className="space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span>Brokerage cash</span>
                  <span className="font-semibold text-slate-900">$62,300.00</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span>Pending dividends</span>
                  <span className="font-semibold text-slate-900">$1,180.40</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span>Pending coupons</span>
                  <span className="font-semibold text-slate-900">$3,599.60</span>
                </div>
              </div>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Risk controls</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Single-position concentration guardrails can be surfaced here next.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Margin utilization and stress testing should be added once live portfolio math is wired in.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Tax-lot aware performance reporting belongs in the next reporting phase.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;