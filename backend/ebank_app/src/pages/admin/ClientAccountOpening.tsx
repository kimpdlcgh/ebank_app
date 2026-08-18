/**
 * ClientAccountOpening - ADMIN VERSION
 * Quick account creation (Step 1 only: Personal Info + Generate Account)
 * Admin creates basic account, client completes full onboarding on first login
 */

import React, { useState } from 'react';
import {
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import AdminLayout from '../../components/Layout/AdminLayout';
import toast from 'react-hot-toast';
import ClientAccountEmailService from '../../utils/clientAccountEmailService';
import { db } from '../../services/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

interface AdminClientData {
  // Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;

  // Contact
  email: string;
  phone: string;

  // Credentials
  username: string;
  temporaryPassword: string;

  // Account
  tradingAccountId?: string;
  accountCreatedDate?: string;
}

const initialClientData: AdminClientData = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phone: '',
  username: '',
  temporaryPassword: '',
  tradingAccountId: '',
  accountCreatedDate: ''
};

const ClientAccountOpening: React.FC = () => {
  const { user: currentUser, createUser } = useAuth();
  const { config } = useSystemConfigContext();
  const [clientData, setClientData] = useState<AdminClientData>(initialClientData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedAccount, setGeneratedAccount] = useState<any>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!clientData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!clientData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!clientData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!clientData.gender) newErrors.gender = 'Gender is required';
    if (!clientData.email.trim()) newErrors.email = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) newErrors.email = 'Valid email is required';
    if (!clientData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!clientData.username.trim()) newErrors.username = 'Username is required';
    if (clientData.username.length < 4) newErrors.username = 'Username must be at least 4 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateTradingAccountId = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `SG-${dateStr}-${randomSuffix}`;
  };

  const generateTemporaryPassword = (): string => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += special[Math.floor(Math.random() * special.length)];

    const all = upper + lower + numbers + special;
    for (let i = pwd.length; i < 12; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    return pwd.split('').sort(() => Math.random() - 0.5).join('');
  };

  const handleGenerateAccount = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const tradingAccountId = generateTradingAccountId();
      const temporaryPassword = generateTemporaryPassword();
      const accountCreatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create Firebase Authentication user
      const newUser = await createUser(clientData.email, temporaryPassword);

      if (!newUser) {
        throw new Error('Failed to create Firebase user');
      }

      // Create Firestore account record
      const accountsRef = collection(db, 'accounts');
      const accountRecord = await addDoc(accountsRef, {
        userId: newUser.uid,
        tradingAccountId,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone,
        username: clientData.username,
        dateOfBirth: clientData.dateOfBirth,
        gender: clientData.gender,
        accountStatus: 'active',
        isActive: true,
        onboardingStatus: 'pending', // Client will complete this
        features: {
          onlineTrading: false,
          realTimeQuotes: false,
          mobileApp: false,
          researchTools: false,
          advancedCharting: false,
          marginTrading: false,
          optionsTrading: false
        },
        kycStatus: 'pending',
        complianceReviewedBy: currentUser?.uid,
        complianceReviewedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser?.uid
      });

      // Generate welcome email
      const emailService = new ClientAccountEmailService(config);
      const emailPackage = emailService.generateAccountCreationEmails({
        firstName: clientData.firstName,
        email: clientData.email,
        username: clientData.username,
        temporaryPassword,
        tradingAccountId,
        accountType: 'pending', // Will be selected by client
        accountCreatedDate,
        clientPortalUrl: config?.clientPortalUrl || 'https://app.safeguardsecurities.us/#/client-login',
        supportEmail: config?.contact?.email?.support || 'support@safeguardsecurities.com',
        supportPhone: config?.contact?.phone?.support || '+1 216 250-7891',
        companyName: config?.companyInfo?.name || 'SafeGuard Securities',
        adminName: currentUser?.displayName || 'Admin',
        adminEmail: currentUser?.email || ''
      });

      // Store in localStorage for reference
      sessionStorage.setItem(`temp_trading_account_${tradingAccountId}`, JSON.stringify({
        tradingAccountId,
        email: clientData.email,
        username: clientData.username,
        temporaryPassword,
        accountCreatedDate,
        firestoreDocId: accountRecord.id
      }));

      setGeneratedAccount({
        tradingAccountId,
        email: clientData.email,
        username: clientData.username,
        temporaryPassword,
        accountCreatedDate,
        emailPackage
      });

      // Open email in default client
      window.open(emailPackage.clientEmail.mailtoUrl, '_blank');

      toast.success('Account created successfully! Email opened in your default email client.');
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setClientData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quick Account Creation</h1>
          <p className="text-gray-600">
            Create a basic trading account. Client will complete their full profile on first login.
          </p>
        </div>

        {!generatedAccount ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            {/* Personal Information Section */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <User className="w-5 h-5 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={clientData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="John"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={clientData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Doe"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                {/* Middle Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="middleName"
                    value={clientData.middleName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Michael"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={clientData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    name="gender"
                    value={clientData.gender}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.gender ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={clientData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={clientData.phone}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="+1 (555) 000-0000"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Login Credentials Section */}
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Login Credentials</h2>

              <div className="grid grid-cols-2 gap-6">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={clientData.username}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.username ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="johndoe1234"
                  />
                  {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                </div>

                {/* Temporary Password Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporary Password
                  </label>
                  <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    Auto-generated
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  A strong temporary password will be generated automatically. Client must change it on first login.
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerateAccount}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account & Send Email'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        ) : (
          /* Account Generated - Summary */
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8">
            <div className="flex items-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-2xl font-bold text-green-800">Account Created Successfully!</h2>
            </div>

            <p className="text-green-700 mb-6">
              The welcome email has opened in your default email client. Please review and send it to the client.
            </p>

            {/* Account Details */}
            <div className="bg-white border border-green-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700 font-medium">Trading Account ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-200 px-3 py-1 rounded font-mono text-sm">
                      {generatedAccount.tradingAccountId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedAccount.tradingAccountId, 'Trading Account ID')}
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700 font-medium">Email:</span>
                  <span className="text-gray-800">{generatedAccount.email}</span>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700 font-medium">Username:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-200 px-3 py-1 rounded font-mono text-sm">
                      {generatedAccount.username}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedAccount.username, 'Username')}
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700 font-medium">Temporary Password:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-200 px-3 py-1 rounded font-mono text-sm">
                      {generatedAccount.temporaryPassword}
                    </code>
                    <button
                      onClick={() => copyToClipboard(generatedAccount.temporaryPassword, 'Password')}
                      className="p-2 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="text-gray-700 font-medium">Account Created:</span>
                  <span className="text-gray-800">{generatedAccount.accountCreatedDate}</span>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Next Steps</h3>
              <ol className="space-y-2 text-blue-800">
                <li className="flex items-start">
                  <span className="font-semibold mr-3">1.</span>
                  <span>Review the email that opened in your default email client</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-3">2.</span>
                  <span>Send the welcome email to the client</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-3">3.</span>
                  <span>Client receives email with username and temporary password</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-3">4.</span>
                  <span>Client logs in and completes their full profile (7-step onboarding)</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-3">5.</span>
                  <span>Account becomes fully verified and active</span>
                </li>
              </ol>
            </div>

            {/* Create Another Account Button */}
            <div className="mt-8">
              <button
                onClick={() => {
                  setGeneratedAccount(null);
                  setClientData(initialClientData);
                  setErrors({});
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Create Another Account
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ClientAccountOpening;
