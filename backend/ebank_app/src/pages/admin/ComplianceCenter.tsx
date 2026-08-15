import React, { useMemo, useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, Search, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import { useFirestore } from '../../hooks/useFirestore';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

type ComplianceData = {
  kycStatus?: string;
  amlCompliance?: boolean;
  riskProfile?: string;
};

type ComplianceAccount = Record<string, unknown> & { id: string };

type ComplianceUpdate = {
  kycStatus?: string;
  amlCompliance?: boolean;
  riskProfile?: string;
};

const ComplianceCenter: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'review'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const {
    data: accounts,
    loading: accountsLoading,
    refetch: refetchAccounts
  } = useFirestore('accounts', (query) => query.orderByField('createdAt', 'desc'));

  const {
    data: transactions,
    loading: transactionsLoading,
    refetch: refetchTransactions
  } = useFirestore('transactions', (query) => query.orderByField('createdAt', 'desc').limitTo(50));

  const getKycStatus = (account: ComplianceAccount) => {
    const compliance = account.compliance as ComplianceData | undefined;
    const kycStatus = account.kycStatus as string | undefined;
    const amlCompliance = account.amlCompliance as boolean | string | undefined;

    return compliance?.kycStatus || kycStatus || (amlCompliance === true ? 'approved' : 'pending');
  };

  const getAmlStatus = (account: ComplianceAccount) => {
    const compliance = account.compliance as ComplianceData | undefined;
    const amlCompliance = account.amlCompliance as boolean | string | undefined;

    if (compliance?.amlCompliance !== undefined) {
      return compliance.amlCompliance === true ? 'verified' : 'pending';
    }
    if (typeof amlCompliance === 'boolean') {
      return amlCompliance ? 'verified' : 'pending';
    }
    if (typeof amlCompliance === 'string') {
      return amlCompliance;
    }
    return 'pending';
  };

  const getRiskRating = (account: ComplianceAccount) => {
    const compliance = account.compliance as ComplianceData | undefined;
    const riskRating = account.riskRating as string | undefined;
    const riskProfile = account.riskProfile as string | undefined;

    return riskRating || riskProfile || compliance?.riskProfile || 'low';
  };

  const filteredAccounts = useMemo(() => {
    const normalized = accounts as ComplianceAccount[];
    return normalized.filter((account) => {
      const kycStatus = getKycStatus(account);
      const riskRating = getRiskRating(account);
      const accountHolderName = (account.accountHolderName as string | undefined) ||
        (account.userName as string | undefined) ||
        '';
      const userEmail = (account.userEmail as string | undefined) || '';
      const accountNumber = (account.accountNumber as string | undefined) || '';

      const matchesSearch =
        accountHolderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && kycStatus === 'pending') ||
        (statusFilter === 'approved' && kycStatus === 'approved') ||
        (statusFilter === 'review' && kycStatus === 'needs_review');

      const matchesRisk = riskFilter === 'all' || riskRating === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [accounts, searchTerm, statusFilter, riskFilter]);

  const kycPendingCount = filteredAccounts.filter((account) => getKycStatus(account) === 'pending').length;
  const kycReviewCount = filteredAccounts.filter((account) => getKycStatus(account) === 'needs_review').length;
  const amlPendingCount = filteredAccounts.filter((account) => getAmlStatus(account) !== 'verified').length;
  const highRiskCount = filteredAccounts.filter((account) => getRiskRating(account) === 'high').length;

  const suspiciousTransactions = useMemo(() => {
    const normalized = transactions as Array<Record<string, unknown>>;
    return normalized
      .filter((txn) => txn.riskScore === 'high' || txn.status === 'flagged')
      .slice(0, 10);
  }, [transactions]);

  const buildComplianceUpdatePayload = (account: ComplianceAccount, update: ComplianceUpdate) => {
    const payload: Record<string, unknown> = {
      'compliance.kycStatus': update.kycStatus ?? getKycStatus(account),
      'compliance.amlCompliance': update.amlCompliance ?? (getAmlStatus(account) === 'verified'),
      'compliance.riskProfile': update.riskProfile ?? getRiskRating(account),
      'compliance.lastReviewedAt': serverTimestamp(),
      'compliance.lastReviewedBy': user?.uid || 'admin'
    };

    if (update.kycStatus) {
      payload.kycStatus = update.kycStatus;
    }

    if (typeof account.amlCompliance === 'boolean' && update.amlCompliance !== undefined) {
      payload.amlCompliance = update.amlCompliance;
    }

    return payload;
  };

  const updateCompliance = async (account: ComplianceAccount, update: ComplianceUpdate) => {
    try {
      const accountRef = doc(db, 'accounts', account.id);
      const payload = buildComplianceUpdatePayload(account, update);
      await updateDoc(accountRef, payload);
      toast.success('Compliance updated');
      await refetchAccounts();
      await refetchTransactions();
    } catch (error) {
      console.error('Compliance update error:', error);
      toast.error('Failed to update compliance');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'needs_review':
        return 'bg-amber-100 text-amber-800';
      case 'pending':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <AdminLayout title="KYC & AML Center" subtitle="Review compliance, risk, and suspicious activity">
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">KYC Pending</p>
                <p className="text-2xl font-bold text-gray-900">{kycPendingCount}</p>
              </div>
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">KYC Review</p>
                <p className="text-2xl font-bold text-gray-900">{kycReviewCount}</p>
              </div>
              <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AML Pending</p>
                <p className="text-2xl font-bold text-gray-900">{amlPendingCount}</p>
              </div>
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-gray-900">{highRiskCount}</p>
              </div>
              <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search account holder, email, or number"
                  className="pl-10"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All KYC Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="review">Needs Review</option>
              </select>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as typeof riskFilter)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">KYC Review Queue</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AML Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accountsLoading ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={5}>
                      Loading compliance queue...
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={5}>
                      No accounts matched your filters.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {(account.accountHolderName as string | undefined) ||
                            (account.userName as string | undefined) ||
                            'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(account.userEmail as string | undefined) || 'No email'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getKycStatus(account))}`}>
                          {getKycStatus(account)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getAmlStatus(account))}`}>
                          {getAmlStatus(account)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(getRiskRating(account))}`}>
                          {getRiskRating(account)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateCompliance(account, { kycStatus: 'approved', amlCompliance: true })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCompliance(account, { kycStatus: 'needs_review' })}
                          >
                            Flag Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Suspicious Transactions</h3>
            <span className="text-xs text-gray-500">Last 50 transactions scanned</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactionsLoading ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={4}>
                      Loading transactions...
                    </td>
                  </tr>
                ) : suspiciousTransactions.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-sm text-gray-500" colSpan={4}>
                      No suspicious transactions flagged.
                    </td>
                  </tr>
                ) : (
                  suspiciousTransactions.map((txn, index) => {
                    const txnKey =
                      (txn.id as string | undefined) ||
                      (txn.reference as string | undefined) ||
                      `txn-${index}`;
                    return (
                      <tr key={txnKey}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {(txn.reference as string | undefined) || (txn.id as string | undefined)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${Number(txn.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor((txn.status as string | undefined) || 'pending')}`}>
                          {(txn.status as string | undefined) || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor((txn.riskScore as string | undefined) || 'medium')}`}>
                          {(txn.riskScore as string | undefined) || 'medium'}
                        </span>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ComplianceCenter;
