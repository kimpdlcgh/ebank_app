import React, { useState } from 'react';
import { ArrowRight, Shield, Wallet } from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { activityFeed, fundingMethods } from '../../data/brokerageMockData';

const FundingPage: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState(fundingMethods[0].id);

  const selectedFundingMethod = fundingMethods.find((method) => method.id === selectedMethod) || fundingMethods[0];
  const recentFunding = activityFeed.filter((item) => item.type === 'Funding');

  return (
    <DashboardLayout title="Funding" subtitle="Move cash and digital assets into the brokerage account and settlement wallet">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-blue-700" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Funding rails</h2>
                <p className="text-sm text-slate-500">Brokerage cash is now designed around investment funding, not retail banking deposits only.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {fundingMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethod(method.id)}
                  className={`rounded-2xl border p-5 text-left transition ${selectedMethod === method.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400'}`}
                >
                  <p className="text-sm font-semibold">{method.name}</p>
                  <p className={`mt-2 text-sm ${selectedMethod === method.id ? 'text-slate-300' : 'text-slate-500'}`}>{method.description}</p>
                  <div className={`mt-4 space-y-1 text-xs ${selectedMethod === method.id ? 'text-slate-300' : 'text-slate-500'}`}>
                    <p>Timing: {method.timing}</p>
                    <p>Fee: {method.fee}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Selected method</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedFundingMethod.name}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{selectedFundingMethod.description}</p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 text-slate-400" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Settlement timeline</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedFundingMethod.timing}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Expected cost</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedFundingMethod.fee}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button>Start funding request</Button>
                <Button variant="outline">View transfer instructions</Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900">Funding controls</h3>
              </div>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Source-of-funds review should be enforced server-side before large credits are released for trading.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Crypto deposits should wait for configurable block confirmations before settling to available balance.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3">Withdrawal whitelists and velocity checks belong in the next backend hardening pass.</li>
              </ul>
            </Card>

            <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Recent funding events</h3>
              <div className="mt-4 space-y-3">
                {recentFunding.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <span className="text-sm font-semibold text-emerald-600">{item.amount}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{item.timestamp}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FundingPage;