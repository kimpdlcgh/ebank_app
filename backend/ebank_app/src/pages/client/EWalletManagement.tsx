import React, { useMemo, useState } from 'react';
import { BarChart3, Search, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { holdings, marketMovers } from '../../data/brokerageMockData';

const assetFilters = ['All', 'Stocks', 'Bonds', 'ETFs', 'Commodities', 'Crypto'];

const MarketsPage: React.FC = () => {
  const [assetFilter, setAssetFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMarkets = useMemo(() => {
    return marketMovers.filter((item) => {
      const matchesAsset = assetFilter === 'All' || item.assetClass === assetFilter;
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesAsset && matchesSearch;
    });
  }, [assetFilter, searchTerm]);

  const assetCounts = useMemo(() => {
    return assetFilters.slice(1).map((assetClass) => ({
      assetClass,
      count: holdings.filter((item) => item.assetClass === assetClass).length,
    }));
  }, []);

  return (
    <DashboardLayout title="Markets" subtitle="Browse opportunities across stocks, bonds, ETFs, commodities, and crypto">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {assetCounts.map((item) => (
            <Card key={item.assetClass} className="rounded-2xl border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{item.assetClass}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{item.count}</p>
              <p className="mt-2 text-sm text-slate-500">Held in current sample portfolio</p>
            </Card>
          ))}
        </section>

        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search symbols or instruments"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {assetFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAssetFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${assetFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-semibold text-slate-900">Cross-asset movers</h2>
            </div>
            <div className="space-y-3">
              {filteredMarkets.map((item) => (
                <div key={item.symbol} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-slate-900">{item.symbol}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.assetClass}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{item.price}</p>
                      <p className={item.change.startsWith('+') ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>{item.change}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Volume {item.volume}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-900">Market board notes</h3>
            </div>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-4">
                Watchlist, quote depth, and chart widgets should be the next market-data layer.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Bonds need yield, duration, and coupon-aware instrument cards, not only last-trade pricing.
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                Crypto instruments should expose wallet transfer eligibility and network support alongside price data.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketsPage;