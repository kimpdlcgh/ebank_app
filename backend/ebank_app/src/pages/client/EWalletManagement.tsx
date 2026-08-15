import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Search, Star, TrendingUp } from 'lucide-react';
import { doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { useInstruments, useUserWatchlist } from '../../hooks/useFirestore';
import { AssetClass, Instrument, WatchlistItem } from '../../types';
import { cn, formatCurrency } from '../../utils/helpers';

const assetFilters: { label: string; value: AssetClass | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Stocks', value: AssetClass.STOCK },
  { label: 'Bonds', value: AssetClass.BOND },
  { label: 'ETFs', value: AssetClass.ETF },
  { label: 'Commodities', value: AssetClass.COMMODITY },
  { label: 'Crypto', value: AssetClass.CRYPTO },
];

const MarketsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assetFilter, setAssetFilter] = useState<AssetClass | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSymbol, setPendingSymbol] = useState<string | null>(null);

  const { data: instrumentsData, loading: instrumentsLoading } = useInstruments();
  const { data: watchlistData, loading: watchlistLoading } = useUserWatchlist(user?.uid || '');

  const instruments = instrumentsData as unknown as Instrument[];
  const watchlist = watchlistData as unknown as WatchlistItem[];

  const watchlistSymbols = useMemo(() => new Set(watchlist.map((item) => item.symbol)), [watchlist]);

  const filteredInstruments = useMemo(() => {
    return instruments.filter((item) => {
      const matchesAsset = assetFilter === 'All' || item.assetClass === assetFilter;
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesAsset && matchesSearch;
    });
  }, [instruments, assetFilter, searchTerm]);

  const assetCounts = useMemo(() => {
    return assetFilters.slice(1).map((filter) => ({
      label: filter.label,
      count: instruments.filter((item) => item.assetClass === filter.value).length,
    }));
  }, [instruments]);

  const isLoading = instrumentsLoading || watchlistLoading;

  const handleToggleWatchlist = async (instrument: Instrument) => {
    if (!user?.uid) {
      toast.error('You must be signed in to manage your watchlist');
      return;
    }

    const watchlistId = `${user.uid}_${instrument.symbol}`;
    setPendingSymbol(instrument.symbol);

    try {
      if (watchlistSymbols.has(instrument.symbol)) {
        await deleteDoc(doc(db, 'watchlist', watchlistId));
        toast.success(`${instrument.symbol} removed from watchlist`);
      } else {
        await setDoc(doc(db, 'watchlist', watchlistId), {
          userId: user.uid,
          symbol: instrument.symbol,
          name: instrument.name,
          assetClass: instrument.assetClass,
          lastPrice: instrument.lastPrice,
          dayChangePercent: instrument.dayChangePercent,
          addedAt: serverTimestamp(),
        });
        toast.success(`${instrument.symbol} added to watchlist`);
      }
    } catch (error) {
      toast.error('Unable to update watchlist. Please try again.');
    } finally {
      setPendingSymbol(null);
    }
  };

  return (
    <DashboardLayout title="Markets" subtitle="Browse opportunities across stocks, bonds, ETFs, commodities, and crypto">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {assetCounts.map((item) => (
            <Card key={item.label} className="rounded-2xl border-slate-200 p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{item.count}</p>
              <p className="mt-2 text-sm text-slate-500">Tradable instruments available</p>
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
                  key={filter.label}
                  type="button"
                  onClick={() => setAssetFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${assetFilter === filter.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-700" />
              <h2 className="text-lg font-semibold text-slate-900">Instruments</h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
                ))}
              </div>
            ) : instruments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-base font-semibold text-slate-900">No instruments available yet</p>
                <p className="mt-1 text-sm text-slate-500">Check back soon.</p>
              </div>
            ) : filteredInstruments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <p className="text-base font-semibold text-slate-900">No matching instruments</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search term or filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInstruments.map((item) => {
                  const isPositive = item.dayChangePercent >= 0;
                  const isWatched = watchlistSymbols.has(item.symbol);
                  return (
                    <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-slate-900">{item.symbol}</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.assetClass}</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{item.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(item.lastPrice)}</p>
                          <p className={cn('text-sm font-medium', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                            {isPositive ? '+' : ''}
                            {item.dayChange.toFixed(2)} ({isPositive ? '+' : ''}
                            {item.dayChangePercent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleWatchlist(item)}
                          disabled={pendingSymbol === item.symbol}
                          aria-pressed={isWatched}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60',
                            isWatched
                              ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          <Star className={cn('h-3.5 w-3.5', isWatched ? 'fill-amber-500 text-amber-500' : 'text-slate-400')} />
                          {isWatched ? 'On watchlist' : 'Watch'}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/orders?symbol=${item.symbol}`)}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                        >
                          Trade
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-900">My watchlist</h3>
            </div>
            {watchlistLoading ? (
              <div className="space-y-3">
                {[0, 1].map((index) => (
                  <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-50" />
                ))}
              </div>
            ) : watchlist.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                You haven&apos;t added any instruments to your watchlist yet. Use the star button on any instrument to track it here.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-600">
                {watchlist.map((item) => {
                  const isPositive = item.dayChangePercent >= 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.symbol}</p>
                        <p className="text-xs text-slate-500">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(item.lastPrice)}</p>
                        <p className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                          {isPositive ? '+' : ''}
                          {item.dayChangePercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MarketsPage;