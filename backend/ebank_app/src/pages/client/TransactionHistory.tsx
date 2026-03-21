import React, { useMemo, useState } from 'react';
import { Download, Filter, Search } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { activityFeed } from '../../data/brokerageMockData';

const categories = ['All activity', 'Trade Fill', 'Dividend', 'Funding', 'Fee'];

const ActivityPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All activity');

  const filteredActivity = useMemo(() => {
    return activityFeed.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.detail.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All activity' || item.type === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <DashboardLayout title="Activity" subtitle="Cash ledger, executions, income events, and operational fees">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search activity"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="relative min-w-52">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
              <Download className="h-4 w-4" />
              Export ledger
            </button>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent account activity</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredActivity.length} item(s) match your current filters</p>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredActivity.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{item.type}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-400">{item.timestamp}</span>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className={`text-lg font-semibold ${item.tone === 'positive' ? 'text-emerald-600' : item.tone === 'negative' ? 'text-rose-600' : 'text-slate-900'}`}>
                    {item.amount}
                  </p>
                  <p className="text-sm text-slate-500">Booked to brokerage cash ledger</p>
                </div>
              </div>
            ))}

            {filteredActivity.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-base font-medium text-slate-900">No matching activity</p>
                <p className="mt-2 text-sm text-slate-500">Try broadening your filters or search phrase.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityPage;