import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Download,
  LineChart,
  Save,
  X,
  Check,
  SortAsc,
  SortDesc,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../utils/auditLog';
import { Instrument, AssetClass } from '../../types';

type InstrumentRow = Instrument & {
  updatedAt?: any;
};

const ASSET_CLASS_OPTIONS: AssetClass[] = [
  AssetClass.STOCK,
  AssetClass.BOND,
  AssetClass.ETF,
  AssetClass.COMMODITY,
  AssetClass.CRYPTO
];

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  [AssetClass.STOCK]: 'Stock',
  [AssetClass.BOND]: 'Bond',
  [AssetClass.ETF]: 'ETF',
  [AssetClass.COMMODITY]: 'Commodity',
  [AssetClass.CRYPTO]: 'Crypto'
};

const DEFAULT_INSTRUMENTS: Array<Omit<Instrument, 'id' | 'updatedAt'>> = [
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: AssetClass.STOCK, exchange: 'NASDAQ', currency: 'USD', lastPrice: 195.12, dayChange: 1.42, dayChangePercent: 0.73, isTradable: true },
  { symbol: 'MSFT', name: 'Microsoft Corp.', assetClass: AssetClass.STOCK, exchange: 'NASDAQ', currency: 'USD', lastPrice: 430.55, dayChange: -2.15, dayChangePercent: -0.5, isTradable: true },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', assetClass: AssetClass.ETF, exchange: 'NYSEARCA', currency: 'USD', lastPrice: 510.34, dayChange: 3.21, dayChangePercent: 0.63, isTradable: true },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetClass: AssetClass.BOND, exchange: 'NASDAQ', currency: 'USD', lastPrice: 72.18, dayChange: 0.06, dayChangePercent: 0.08, isTradable: true },
  { symbol: 'GLD', name: 'SPDR Gold Shares', assetClass: AssetClass.COMMODITY, exchange: 'NYSEARCA', currency: 'USD', lastPrice: 245.67, dayChange: -1.03, dayChangePercent: -0.42, isTradable: true },
  { symbol: 'USO', name: 'United States Oil Fund', assetClass: AssetClass.COMMODITY, exchange: 'NYSEARCA', currency: 'USD', lastPrice: 78.29, dayChange: 0.85, dayChangePercent: 1.1, isTradable: true },
  { symbol: 'BTC', name: 'Bitcoin', assetClass: AssetClass.CRYPTO, exchange: 'CRYPTO', currency: 'USD', lastPrice: 64000, dayChange: 850.5, dayChangePercent: 1.35, isTradable: true },
  { symbol: 'ETH', name: 'Ethereum', assetClass: AssetClass.CRYPTO, exchange: 'CRYPTO', currency: 'USD', lastPrice: 3400, dayChange: -42.3, dayChangePercent: -1.23, isTradable: true },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetClass: AssetClass.BOND, exchange: 'NASDAQ', currency: 'USD', lastPrice: 95.11, dayChange: 0.34, dayChangePercent: 0.36, isTradable: true }
];

type SortField = 'symbol' | 'name' | 'assetClass' | 'lastPrice' | 'dayChangePercent' | 'isTradable';

const emptyFormData = {
  symbol: '',
  name: '',
  assetClass: AssetClass.STOCK as AssetClass,
  exchange: '',
  currency: 'USD',
  lastPrice: 0,
  isTradable: true
};

const ManageInstruments: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterAssetClass, setFilterAssetClass] = useState<'all' | AssetClass>('all');
  const [filterTradable, setFilterTradable] = useState<'all' | 'tradable' | 'not_tradable'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<InstrumentRow | null>(null);
  const [priceInstrument, setPriceInstrument] = useState<InstrumentRow | null>(null);
  const [newPriceInput, setNewPriceInput] = useState('');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);

  const [formData, setFormData] = useState(emptyFormData);

  // Load instruments from Firestore
  const loadInstruments = async () => {
    try {
      setLoading(true);
      const instrumentsRef = collection(db, 'instruments');
      const q = query(instrumentsRef, orderBy('symbol', 'asc'));
      const querySnapshot = await getDocs(q);

      const loaded = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as InstrumentRow[];

      setInstruments(loaded);
    } catch (error) {
      console.error('Error loading instruments:', error);
      toast.error('Failed to load instruments');
    } finally {
      setLoading(false);
    }
  };

  // Seed default instruments if the collection is empty
  const initializeInstruments = async () => {
    try {
      const instrumentsRef = collection(db, 'instruments');
      const querySnapshot = await getDocs(instrumentsRef);

      if (querySnapshot.empty) {
        const batch = writeBatch(db);

        DEFAULT_INSTRUMENTS.forEach((instrument) => {
          const instrumentRef = doc(instrumentsRef);
          batch.set(instrumentRef, {
            ...instrument,
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
        toast.success(`Initialized ${DEFAULT_INSTRUMENTS.length} instruments`);
        loadInstruments();
      } else {
        loadInstruments();
      }
    } catch (error) {
      console.error('Error initializing instruments:', error);
      toast.error('Failed to initialize instruments');
      loadInstruments();
    }
  };

  useEffect(() => {
    initializeInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort instruments
  const filteredInstruments = instruments
    .filter(instrument => {
      const haystack = `${instrument.symbol} ${instrument.name}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const matchesAssetClass = filterAssetClass === 'all' || instrument.assetClass === filterAssetClass;
      const matchesTradable =
        filterTradable === 'all' ||
        (filterTradable === 'tradable' && instrument.isTradable) ||
        (filterTradable === 'not_tradable' && !instrument.isTradable);
      return matchesSearch && matchesAssetClass && matchesTradable;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (aValue === bValue ? 0 : aValue ? 1 : -1) * direction;
      }
      return ((aValue as number) < (bValue as number) ? -1 : (aValue as number) > (bValue as number) ? 1 : 0) * direction;
    });

  // Add new instrument
  const handleAddInstrument = async () => {
    try {
      if (!formData.symbol || !formData.name || !formData.exchange || !formData.currency) {
        toast.error('Please fill in all required fields');
        return;
      }

      const existing = instruments.find(i => i.symbol.toUpperCase() === formData.symbol.toUpperCase());
      if (existing) {
        toast.error('An instrument with this symbol already exists');
        return;
      }

      const instrumentsRef = collection(db, 'instruments');
      const payload = {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        assetClass: formData.assetClass,
        exchange: formData.exchange,
        currency: formData.currency.toUpperCase(),
        lastPrice: Number(formData.lastPrice) || 0,
        dayChange: 0,
        dayChangePercent: 0,
        isTradable: formData.isTradable,
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(instrumentsRef, payload);

      await logAdminAction({
        action: 'instrument.created',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'instrument',
        targetId: docRef.id,
        targetLabel: payload.symbol,
        details: { ...payload, updatedAt: undefined }
      });

      toast.success('Instrument added successfully');
      setShowAddModal(false);
      setFormData(emptyFormData);
      loadInstruments();
    } catch (error) {
      console.error('Error adding instrument:', error);
      toast.error('Failed to add instrument');
    }
  };

  // Edit instrument
  const handleEditInstrument = async () => {
    try {
      if (!editingInstrument || !editingInstrument.id) return;

      const instrumentRef = doc(db, 'instruments', editingInstrument.id);
      const payload = {
        symbol: editingInstrument.symbol.toUpperCase(),
        name: editingInstrument.name,
        assetClass: editingInstrument.assetClass,
        exchange: editingInstrument.exchange,
        currency: editingInstrument.currency.toUpperCase(),
        lastPrice: Number(editingInstrument.lastPrice) || 0,
        isTradable: editingInstrument.isTradable,
        updatedAt: serverTimestamp()
      };
      await updateDoc(instrumentRef, payload);

      await logAdminAction({
        action: 'instrument.updated',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'instrument',
        targetId: editingInstrument.id,
        targetLabel: payload.symbol,
        details: { ...payload, updatedAt: undefined }
      });

      toast.success('Instrument updated successfully');
      setEditingInstrument(null);
      loadInstruments();
    } catch (error) {
      console.error('Error updating instrument:', error);
      toast.error('Failed to update instrument');
    }
  };

  // Delete instrument
  const handleDeleteInstrument = async (instrumentId: string, symbol: string) => {
    if (!confirm(`Are you sure you want to delete "${symbol}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const instrumentRef = doc(db, 'instruments', instrumentId);
      await deleteDoc(instrumentRef);

      await logAdminAction({
        action: 'instrument.deleted',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'instrument',
        targetId: instrumentId,
        targetLabel: symbol
      });

      toast.success('Instrument deleted successfully');
      loadInstruments();
    } catch (error) {
      console.error('Error deleting instrument:', error);
      toast.error('Failed to delete instrument');
    }
  };

  // Quick price update
  const openPriceModal = (instrument: InstrumentRow) => {
    setPriceInstrument(instrument);
    setNewPriceInput(String(instrument.lastPrice ?? ''));
  };

  const handleUpdatePrice = async () => {
    if (!priceInstrument || !priceInstrument.id) return;

    const newPrice = Number(newPriceInput);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      const oldPrice = priceInstrument.lastPrice || 0;
      const dayChange = newPrice - oldPrice;
      const dayChangePercent = oldPrice !== 0 ? (dayChange / oldPrice) * 100 : 0;

      const instrumentRef = doc(db, 'instruments', priceInstrument.id);
      await updateDoc(instrumentRef, {
        lastPrice: newPrice,
        dayChange,
        dayChangePercent,
        updatedAt: serverTimestamp()
      });

      await logAdminAction({
        action: 'instrument.price_updated',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'instrument',
        targetId: priceInstrument.id,
        targetLabel: priceInstrument.symbol,
        details: { oldPrice, newPrice, dayChange, dayChangePercent }
      });

      toast.success(`${priceInstrument.symbol} price updated`);
      setPriceInstrument(null);
      setNewPriceInput('');
      loadInstruments();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    }
  };

  // Bulk enable/disable trading
  const handleBulkToggleTradable = async (tradable: boolean) => {
    if (selectedInstruments.length === 0) {
      toast.error('No instruments selected');
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedInstruments.forEach(instrumentId => {
        const instrumentRef = doc(db, 'instruments', instrumentId);
        batch.update(instrumentRef, {
          isTradable: tradable,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast.success(`${selectedInstruments.length} instruments ${tradable ? 'marked tradable' : 'marked not tradable'}`);
      setSelectedInstruments([]);
      loadInstruments();
    } catch (error) {
      console.error('Error updating instruments:', error);
      toast.error('Failed to update instruments');
    }
  };

  // Export instruments
  const handleExport = () => {
    const dataStr = JSON.stringify(instruments, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `instruments_export_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Instruments exported successfully');
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const formatPrice = (value: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(value || 0);
    } catch {
      return `$${(value || 0).toFixed(2)}`;
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Manage Instruments" subtitle="Loading instruments...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Instruments" subtitle="Manage tradable securities available on the client Markets page">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            {/* Asset class filter */}
            <select
              value={filterAssetClass}
              onChange={(e) => setFilterAssetClass(e.target.value as 'all' | AssetClass)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Asset Classes</option>
              {ASSET_CLASS_OPTIONS.map(ac => (
                <option key={ac} value={ac}>{ASSET_CLASS_LABELS[ac]}</option>
              ))}
            </select>

            {/* Tradable filter */}
            <select
              value={filterTradable}
              onChange={(e) => setFilterTradable(e.target.value as 'all' | 'tradable' | 'not_tradable')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="tradable">Tradable Only</option>
              <option value="not_tradable">Not Tradable Only</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Instrument
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedInstruments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedInstruments.length} instruments selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkToggleTradable(true)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Mark Tradable
                </button>
                <button
                  onClick={() => handleBulkToggleTradable(false)}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Mark Not Tradable
                </button>
                <button
                  onClick={() => setSelectedInstruments([])}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruments Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedInstruments.length === filteredInstruments.length && filteredInstruments.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInstruments(filteredInstruments.map(i => i.id!));
                        } else {
                          setSelectedInstruments([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('symbol')}
                  >
                    <div className="flex items-center gap-1">
                      Symbol
                      {getSortIcon('symbol')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('assetClass')}
                  >
                    <div className="flex items-center gap-1">
                      Asset Class
                      {getSortIcon('assetClass')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exchange
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lastPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Last Price
                      {getSortIcon('lastPrice')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('dayChangePercent')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Day Change
                      {getSortIcon('dayChangePercent')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('isTradable')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('isTradable')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInstruments.map((instrument) => (
                  <tr key={instrument.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedInstruments.includes(instrument.id!)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInstruments([...selectedInstruments, instrument.id!]);
                          } else {
                            setSelectedInstruments(selectedInstruments.filter(id => id !== instrument.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {instrument.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{instrument.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {ASSET_CLASS_LABELS[instrument.assetClass] || instrument.assetClass}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {instrument.exchange}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatPrice(instrument.lastPrice, instrument.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`inline-flex items-center gap-1 ${
                        instrument.dayChange > 0
                          ? 'text-green-600'
                          : instrument.dayChange < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                      }`}>
                        {instrument.dayChange > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : instrument.dayChange < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {instrument.dayChange >= 0 ? '+' : ''}
                        {(instrument.dayChangePercent || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        instrument.isTradable
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {instrument.isTradable ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Tradable
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 mr-1" />
                            Halted
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openPriceModal(instrument)}
                          title="Update Price"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingInstrument(instrument)}
                          title="Edit"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInstrument(instrument.id!, instrument.symbol)}
                          title="Delete"
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInstruments.length === 0 && (
            <div className="text-center py-12">
              <LineChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No instruments found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding a new instrument.'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add First Instrument
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <LineChart className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Instruments</p>
                <p className="text-2xl font-semibold text-gray-900">{instruments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tradable</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {instruments.filter(i => i.isTradable).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <X className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Halted</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {instruments.filter(i => !i.isTradable).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Instrument Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Instrument</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="e.g., AAPL"
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Apple Inc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Class *
                </label>
                <select
                  value={formData.assetClass}
                  onChange={(e) => setFormData({ ...formData, assetClass: e.target.value as AssetClass })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ASSET_CLASS_OPTIONS.map(ac => (
                    <option key={ac} value={ac}>{ASSET_CLASS_LABELS[ac]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exchange *
                  </label>
                  <input
                    type="text"
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value.toUpperCase() })}
                    placeholder="e.g., NASDAQ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency *
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.lastPrice}
                  onChange={(e) => setFormData({ ...formData, lastPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isTradable"
                  checked={formData.isTradable}
                  onChange={(e) => setFormData({ ...formData, isTradable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isTradable" className="ml-2 text-sm text-gray-700">
                  Allow trading in this instrument
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddInstrument}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Instrument
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData(emptyFormData);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Instrument Modal */}
      {editingInstrument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Instrument</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={editingInstrument.symbol}
                  onChange={(e) => setEditingInstrument({ ...editingInstrument, symbol: e.target.value.toUpperCase() })}
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={editingInstrument.name}
                  onChange={(e) => setEditingInstrument({ ...editingInstrument, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset Class *
                </label>
                <select
                  value={editingInstrument.assetClass}
                  onChange={(e) => setEditingInstrument({ ...editingInstrument, assetClass: e.target.value as AssetClass })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ASSET_CLASS_OPTIONS.map(ac => (
                    <option key={ac} value={ac}>{ASSET_CLASS_LABELS[ac]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exchange *
                  </label>
                  <input
                    type="text"
                    value={editingInstrument.exchange}
                    onChange={(e) => setEditingInstrument({ ...editingInstrument, exchange: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency *
                  </label>
                  <input
                    type="text"
                    value={editingInstrument.currency}
                    onChange={(e) => setEditingInstrument({ ...editingInstrument, currency: e.target.value.toUpperCase() })}
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingInstrument.lastPrice}
                  onChange={(e) => setEditingInstrument({ ...editingInstrument, lastPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  To recompute day change automatically, use the price (
                  <DollarSign className="w-3 h-3 inline" />
                  ) action instead.
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsTradable"
                  checked={editingInstrument.isTradable}
                  onChange={(e) => setEditingInstrument({ ...editingInstrument, isTradable: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editIsTradable" className="ml-2 text-sm text-gray-700">
                  Allow trading in this instrument
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditInstrument}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => setEditingInstrument(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Price Modal */}
      {priceInstrument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Update Price</h3>
            <p className="text-sm text-gray-500 mb-4">
              {priceInstrument.symbol} &middot; {priceInstrument.name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Price
                </label>
                <div className="text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  {formatPrice(priceInstrument.lastPrice, priceInstrument.currency)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  autoFocus
                  value={newPriceInput}
                  onChange={(e) => setNewPriceInput(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdatePrice}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Update Price
              </button>
              <button
                onClick={() => {
                  setPriceInstrument(null);
                  setNewPriceInput('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageInstruments;
