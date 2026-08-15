import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Download,
  Layers,
  EyeOff,
  Save,
  X,
  Check,
  SortAsc,
  SortDesc
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../utils/auditLog';
import type { AccountCategory } from '../../types';

// Default categories mirroring what was previously hardcoded in ClientAccountOpening.tsx
const defaultCategories: Omit<AccountCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    code: 'checking',
    name: 'Checking Account',
    description: 'Everyday banking with unlimited transactions',
    features: ['Unlimited transactions', 'Debit card included', 'Online banking', 'Mobile deposit'],
    minimumDeposit: 100,
    enabled: true,
    order: 1
  },
  {
    code: 'savings',
    name: 'Savings Account',
    description: 'Earn interest on your deposits',
    features: ['Competitive interest rates', 'Limited transactions', 'Online banking', 'Goal tracking'],
    minimumDeposit: 500,
    enabled: true,
    order: 2
  },
  {
    code: 'business',
    name: 'Business Account',
    description: 'Banking solutions for businesses',
    features: ['Business debit card', 'Merchant services', 'Wire transfers', 'Account analysis'],
    minimumDeposit: 1000,
    enabled: true,
    order: 3
  }
];

interface CategoryFormData {
  code: string;
  name: string;
  description: string;
  features: string[];
  minimumDeposit: number;
  monthlyFee: number | '';
  interestRate: number | '';
  enabled: boolean;
  order: number;
}

const emptyFormData: CategoryFormData = {
  code: '',
  name: '',
  description: '',
  features: [],
  minimumDeposit: 0,
  monthlyFee: '',
  interestRate: '',
  enabled: true,
  order: 0
};

const ManageCategories: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [categories, setCategories] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'code' | 'order' | 'enabled'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AccountCategory | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState<CategoryFormData>(emptyFormData);
  const [featureDraft, setFeatureDraft] = useState('');

  // Load categories from Firestore
  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesRef = collection(db, 'account_categories');
      const q = query(categoriesRef, orderBy('order'));
      const querySnapshot = await getDocs(q);

      const loadedCategories = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate ? docSnap.data().createdAt.toDate() : docSnap.data().createdAt,
        updatedAt: docSnap.data().updatedAt?.toDate ? docSnap.data().updatedAt.toDate() : docSnap.data().updatedAt,
      })) as AccountCategory[];

      setCategories(loadedCategories);
    } catch (error) {
      console.error('Error loading account categories:', error);
      toast.error('Failed to load account categories');
    } finally {
      setLoading(false);
    }
  };

  // Initialize with default categories if none exist
  const initializeCategories = async () => {
    try {
      const categoriesRef = collection(db, 'account_categories');
      const querySnapshot = await getDocs(categoriesRef);

      if (querySnapshot.empty) {
        const batch = writeBatch(db);

        defaultCategories.forEach((category) => {
          const categoryRef = doc(categoriesRef);
          batch.set(categoryRef, {
            ...category,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        await batch.commit();
        toast.success(`Initialized ${defaultCategories.length} account categories`);
        loadCategories();
      } else {
        loadCategories();
      }
    } catch (error) {
      console.error('Error initializing account categories:', error);
      toast.error('Failed to initialize account categories');
      loadCategories();
    }
  };

  useEffect(() => {
    initializeCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and sort categories
  const filteredCategories = categories
    .filter(category => {
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          category.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterEnabled === 'all' ||
                          (filterEnabled === 'enabled' && category.enabled) ||
                          (filterEnabled === 'disabled' && !category.enabled);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * direction;
    });

  const resetFormData = () => {
    setFormData(emptyFormData);
    setFeatureDraft('');
  };

  const buildCategoryPayload = (data: CategoryFormData) => ({
    code: data.code.toLowerCase().trim(),
    name: data.name.trim(),
    description: data.description.trim(),
    features: data.features,
    minimumDeposit: Number(data.minimumDeposit) || 0,
    ...(data.monthlyFee === '' ? {} : { monthlyFee: Number(data.monthlyFee) }),
    ...(data.interestRate === '' ? {} : { interestRate: Number(data.interestRate) }),
    enabled: data.enabled,
    order: Number(data.order) || 0
  });

  // Add new category
  const handleAddCategory = async () => {
    try {
      if (!formData.code || !formData.name || !formData.description) {
        toast.error('Please fill in all required fields');
        return;
      }

      const existingCategory = categories.find(c => c.code.toLowerCase() === formData.code.toLowerCase());
      if (existingCategory) {
        toast.error('Category code already exists');
        return;
      }

      const categoriesRef = collection(db, 'account_categories');
      const payload = buildCategoryPayload(formData);
      const docRef = await addDoc(categoriesRef, {
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await logAdminAction({
        action: 'account_category.created',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'account_category',
        targetId: docRef.id,
        targetLabel: payload.name
      });

      toast.success('Account category added successfully');
      setShowAddModal(false);
      resetFormData();
      loadCategories();
    } catch (error) {
      console.error('Error adding account category:', error);
      toast.error('Failed to add account category');
    }
  };

  // Edit category
  const handleEditCategory = async () => {
    try {
      if (!editingCategory || !editingCategory.id) return;

      const categoryRef = doc(db, 'account_categories', editingCategory.id);
      await updateDoc(categoryRef, {
        code: editingCategory.code.toLowerCase(),
        name: editingCategory.name,
        description: editingCategory.description,
        features: editingCategory.features,
        minimumDeposit: editingCategory.minimumDeposit,
        monthlyFee: editingCategory.monthlyFee ?? null,
        interestRate: editingCategory.interestRate ?? null,
        enabled: editingCategory.enabled,
        order: editingCategory.order,
        updatedAt: new Date()
      });

      await logAdminAction({
        action: 'account_category.updated',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'account_category',
        targetId: editingCategory.id,
        targetLabel: editingCategory.name
      });

      toast.success('Account category updated successfully');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating account category:', error);
      toast.error('Failed to update account category');
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const categoryRef = doc(db, 'account_categories', categoryId);
      await deleteDoc(categoryRef);

      await logAdminAction({
        action: 'account_category.deleted',
        actor: { id: currentUser?.uid, email: currentUser?.email },
        targetType: 'account_category',
        targetId: categoryId,
        targetLabel: categoryName
      });

      toast.success('Account category deleted successfully');
      loadCategories();
    } catch (error) {
      console.error('Error deleting account category:', error);
      toast.error('Failed to delete account category');
    }
  };

  // Bulk enable/disable
  const handleBulkToggle = async (enable: boolean) => {
    if (selectedCategories.length === 0) {
      toast.error('No categories selected');
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedCategories.forEach(categoryId => {
        const categoryRef = doc(db, 'account_categories', categoryId);
        batch.update(categoryRef, {
          enabled: enable,
          updatedAt: new Date()
        });
      });

      await batch.commit();
      toast.success(`${selectedCategories.length} categories ${enable ? 'enabled' : 'disabled'}`);
      setSelectedCategories([]);
      loadCategories();
    } catch (error) {
      console.error('Error updating account categories:', error);
      toast.error('Failed to update account categories');
    }
  };

  // Export categories
  const handleExport = () => {
    const dataStr = JSON.stringify(categories, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `account_categories_export_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast.success('Account categories exported successfully');
  };

  // Handle sorting
  const handleSort = (field: 'name' | 'code' | 'order' | 'enabled') => {
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

  const addFeatureToForm = () => {
    const trimmed = featureDraft.trim();
    if (!trimmed) return;
    setFormData({ ...formData, features: [...formData.features, trimmed] });
    setFeatureDraft('');
  };

  const removeFeatureFromForm = (index: number) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  const addFeatureToEditing = (value: string) => {
    if (!editingCategory) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    setEditingCategory({ ...editingCategory, features: [...editingCategory.features, trimmed] });
  };

  const removeFeatureFromEditing = (index: number) => {
    if (!editingCategory) return;
    setEditingCategory({ ...editingCategory, features: editingCategory.features.filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <AdminLayout title="Account Categories" subtitle="Loading account categories...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Account Categories" subtitle="Manage the account/product types clients can be assigned">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            {/* Filter */}
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="enabled">Enabled Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                resetFormData();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Category
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
        {selectedCategories.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedCategories.length} categories selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkToggle(true)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Enable Selected
                </button>
                <button
                  onClick={() => handleBulkToggle(false)}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Disable Selected
                </button>
                <button
                  onClick={() => setSelectedCategories([])}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Categories Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCategories.length === filteredCategories.length && filteredCategories.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCategories(filteredCategories.map(c => c.id!));
                        } else {
                          setSelectedCategories([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('order')}
                  >
                    <div className="flex items-center gap-1">
                      Order
                      {getSortIcon('order')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      Code
                      {getSortIcon('code')}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min. Deposit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee / Rate
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('enabled')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('enabled')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id!)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories([...selectedCategories, category.id!]);
                          } else {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.id === category.id ? (
                        <input
                          type="number"
                          value={editingCategory?.order ?? 0}
                          onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, order: Number(e.target.value) })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-16"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{category.order}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.id === category.id ? (
                        <input
                          type="text"
                          value={editingCategory?.code || ''}
                          onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, code: e.target.value.toLowerCase() })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                        />
                      ) : (
                        <span className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {category.code}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingCategory?.id === category.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingCategory?.name || ''}
                            onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                            placeholder="Name"
                          />
                          <textarea
                            value={editingCategory?.description || ''}
                            onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, description: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                            placeholder="Description"
                            rows={2}
                          />
                          <div className="space-y-1">
                            {editingCategory?.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 flex-1">• {feature}</span>
                                <button
                                  type="button"
                                  onClick={() => removeFeatureFromEditing(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <input
                              type="text"
                              placeholder="Add feature and press Enter"
                              className="px-2 py-1 border border-gray-300 rounded text-xs w-full"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addFeatureToEditing((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <Layers className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm text-gray-900 font-medium">{category.name}</div>
                            <div className="text-xs text-gray-500">{category.description}</div>
                            {category.features?.length > 0 && (
                              <ul className="text-xs text-gray-400 mt-1 space-y-0.5">
                                {category.features.map((feature, index) => (
                                  <li key={index}>• {feature}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.id === category.id ? (
                        <input
                          type="number"
                          value={editingCategory?.minimumDeposit ?? 0}
                          onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, minimumDeposit: Number(e.target.value) })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-24"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">${category.minimumDeposit.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.id === category.id ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={editingCategory?.monthlyFee ?? ''}
                            onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, monthlyFee: e.target.value === '' ? undefined : Number(e.target.value) })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                            placeholder="Fee $"
                          />
                          <input
                            type="number"
                            value={editingCategory?.interestRate ?? ''}
                            onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, interestRate: e.target.value === '' ? undefined : Number(e.target.value) })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm w-20"
                            placeholder="Rate %"
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {category.monthlyFee !== undefined && <div>Fee: ${category.monthlyFee}</div>}
                          {category.interestRate !== undefined && <div>Rate: {category.interestRate}%</div>}
                          {category.monthlyFee === undefined && category.interestRate === undefined && '—'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCategory?.id === category.id ? (
                        <select
                          value={editingCategory?.enabled ? 'enabled' : 'disabled'}
                          onChange={(e) => editingCategory && setEditingCategory({ ...editingCategory, enabled: e.target.value === 'enabled' })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="enabled">Enabled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {category.enabled ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Disabled
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingCategory?.id === category.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={handleEditCategory}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id!, category.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No account categories found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding a new account category.'}
              </p>
              <button
                onClick={() => {
                  resetFormData();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add First Category
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <Layers className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{categories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enabled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {categories.filter(c => c.enabled).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <EyeOff className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Disabled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {categories.filter(c => !c.enabled).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Account Category</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                    placeholder="e.g., checking"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Checking Account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Everyday banking with unlimited transactions"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features
                </label>
                <div className="space-y-1 mb-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 flex-1">• {feature}</span>
                      <button
                        type="button"
                        onClick={() => removeFeatureFromForm(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={featureDraft}
                    onChange={(e) => setFeatureDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeatureToForm();
                      }
                    }}
                    placeholder="e.g., Unlimited transactions"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addFeatureToForm}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min. Deposit *
                  </label>
                  <input
                    type="number"
                    value={formData.minimumDeposit}
                    onChange={(e) => setFormData({ ...formData, minimumDeposit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Fee
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyFee}
                    onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest Rate %
                  </label>
                  <input
                    type="number"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                  Enable this category
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddCategory}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Category
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetFormData();
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

export default ManageCategories;
