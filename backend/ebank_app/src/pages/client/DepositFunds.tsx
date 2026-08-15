import React, { useState } from 'react';
import { ArrowRight, Shield, Wallet } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAccounts, useUserTransactions } from '../../hooks/useFirestore';
import { db } from '../../config/firebase';
import { TransactionType, TransactionStatus } from '../../types';

interface FundingMethod {
  id: string;
  name: string;
  description: string;
  timing: string;
  fee: string;
}

const fundingMethods: FundingMethod[] = [
  { id: 'bank-wire', name: 'Bank Wire', description: 'Same-day brokerage funding for larger allocations.', timing: 'Same day', fee: '$15 outbound / inbound varies' },
  { id: 'ach', name: 'ACH Transfer', description: 'Link your bank and move cash into your trading account.', timing: '1-3 business days', fee: 'Free' },
  { id: 'stablecoin', name: 'Stablecoin Transfer', description: 'Move supported stablecoins into your digital asset wallet.', timing: 'Network dependent', fee: 'Network fee only' }
];

const FundingPage: React.FC = () => {
  const { user } = useAuth();

  const { data: userAccounts, loading: accountsLoading } = useUserAccounts(user?.uid || '');
  const { data: transactions, loading: transactionsLoading } = useUserTransactions(user?.uid || '');

  const [selectedMethod, setSelectedMethod] = useState(fundingMethods[0].id);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeAccounts = (userAccounts || []).filter((account: any) => account.isActive !== false);

  React.useEffect(() => {
    const stillValid = activeAccounts.some((account: any) => account.id === selectedAccountId);
    if (activeAccounts.length > 0 && (!selectedAccountId || !stillValid)) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, selectedAccountId]);

  const selectedFundingMethod = fundingMethods.find((method) => method.id === selectedMethod) || fundingMethods[0];
  const selectedAccount = activeAccounts.find((account: any) => account.id === selectedAccountId);

  const recentFunding = (transactions || [])
    .filter((item: any) => item.type === 'deposit' || item.type === 'withdrawal')
    .slice()
    .sort((a: any, b: any) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return bTime - aTime;
    })
    .slice(0, 10);

  const formatCurrency = (value: number, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
    } catch {
      return `$${value.toFixed(2)}`;
    }
  };

  const formatTimestamp = (createdAt: any) => {
    const millis = createdAt?.toMillis ? createdAt.toMillis() : (createdAt?.seconds ? createdAt.seconds * 1000 : null);
    if (!millis) return '';
    return new Date(millis).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-slate-200 text-slate-600';
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  const handleStartFunding = async () => {
    if (!user?.uid) {
      toast.error('You must be signed in to submit a funding request');
      return;
    }

    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Enter a valid amount greater than zero');
      return;
    }

    if (!selectedAccount) {
      toast.error('Select an account to fund');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: numericAmount,
        currency: selectedAccount.currency || 'USD',
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        description: `Deposit via ${selectedFundingMethod.name}`,
        reference: `DEP-${Date.now()}`,
        metadata: {
          method: selectedMethod,
          accountId: selectedAccount.id,
        },
        createdAt: serverTimestamp(),
      });

      toast.success('Deposit request submitted — pending admin review');
      setAmount('');
    } catch (error) {
      console.error('Failed to submit deposit request:', error);
      toast.error('Failed to submit deposit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400" htmlFor="funding-account">
                    Account to fund
                  </label>
                  <select
                    id="funding-account"
                    value={selectedAccountId}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                    disabled={accountsLoading || activeAccounts.length === 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  >
                    {activeAccounts.length === 0 && <option value="">No active accounts</option>}
                    {activeAccounts.map((account: any) => (
                      <option key={account.id} value={account.id}>
                        {account.accountType} ****{String(account.accountNumber || '').slice(-4)} — {formatCurrency(account.balance || 0, account.currency)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400" htmlFor="funding-amount">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      id="funding-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-7 pr-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={handleStartFunding} disabled={submitting || accountsLoading || activeAccounts.length === 0}>
                  {submitting ? 'Submitting…' : 'Start funding request'}
                </Button>
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
                {transactionsLoading ? (
                  <p className="text-sm text-slate-500">Loading recent activity…</p>
                ) : recentFunding.length === 0 ? (
                  <p className="text-sm text-slate-500">No funding activity yet.</p>
                ) : (
                  recentFunding.map((item: any) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium capitalize text-slate-900">{item.type}</p>
                        <span className={`text-sm font-semibold ${item.type === 'deposit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {formatCurrency(Math.abs(item.amount || 0), item.currency)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">{formatTimestamp(item.createdAt)}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(item.status)}`}>{item.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FundingPage;
