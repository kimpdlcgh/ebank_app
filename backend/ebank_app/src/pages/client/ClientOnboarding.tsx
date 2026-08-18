/**
 * ClientOnboarding - FULL 7-STEP CLIENT VERSION
 * Client completes comprehensive profile after first login
 * Includes: Personal, Contact, Identity, Employment, Account Selection, Compliance, Confirmation
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Globe,
  Briefcase,
  CreditCard,
  Shield,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { db } from '../../services/firebase';
import { doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { countries } from '../../utils/countries';
import SearchableCountrySelect from '../../components/ui/SearchableCountrySelect';

interface OnboardingData {
  // Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;

  // Contact & Address
  email: string;
  phone: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  addressCountry: string;

  // Identity & Residency
  country: string;
  isUSCitizen: boolean;
  residencyStatus: string;
  ssn: string;
  passportNumber: string;
  passportCountry: string;
  taxId: string;

  // Employment
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  annualIncome: string;
  incomeSource: string;

  // Account Selection
  accountPurpose: string;
  expectedMonthlyTransactions: string;
  expectedTransactionAmount: string;
  initialDeposit: string;
  fundingSource: string;

  // Trading Features
  onlineTrading: boolean;
  realTimeQuotes: boolean;
  mobileApp: boolean;
  researchTools: boolean;
  advancedCharting: boolean;
  marginTrading: boolean;
  optionsTrading: boolean;

  // Compliance
  fatcaStatus: string;
  crsReporting: boolean;
  sanctionsScreening: boolean;
  pep: boolean;
  kycStatus: string;
  amlCompliance: boolean;
}

const initialOnboardingData: OnboardingData = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phone: '',
  alternatePhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  addressCountry: 'United States',
  country: 'United States',
  isUSCitizen: true,
  residencyStatus: '',
  ssn: '',
  passportNumber: '',
  passportCountry: '',
  taxId: '',
  employmentStatus: '',
  employer: '',
  jobTitle: '',
  annualIncome: '',
  incomeSource: '',
  accountPurpose: 'long-term investment',
  expectedMonthlyTransactions: '5-10',
  expectedTransactionAmount: '1000-5000',
  initialDeposit: '0',
  fundingSource: 'bank transfer',
  onlineTrading: true,
  realTimeQuotes: false,
  mobileApp: false,
  researchTools: false,
  advancedCharting: false,
  marginTrading: false,
  optionsTrading: false,
  fatcaStatus: '',
  crsReporting: false,
  sanctionsScreening: false,
  pep: false,
  kycStatus: 'pending',
  amlCompliance: false
};

const ClientOnboarding: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { config } = useSystemConfigContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  const steps = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Contact & Address', icon: MapPin },
    { id: 3, title: 'Identity & Residency', icon: Globe },
    { id: 4, title: 'Employment Details', icon: Briefcase },
    { id: 5, title: 'Account Purpose', icon: CreditCard },
    { id: 6, title: 'Trading Features', icon: CheckCircle },
    { id: 7, title: 'Compliance & Review', icon: Shield }
  ];

  // Load existing profile data if available
  useEffect(() => {
    const loadProfileData = async () => {
      if (!currentUser?.uid) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Pre-fill with existing data if available
          if (userData.firstName) {
            setOnboardingData(prev => ({
              ...prev,
              firstName: userData.firstName || '',
              lastName: userData.lastName || '',
              email: userData.email || '',
              phone: userData.phone || ''
            }));
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    };

    loadProfileData();
  }, [currentUser]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Personal Information
        if (!onboardingData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!onboardingData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!onboardingData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!onboardingData.gender) newErrors.gender = 'Gender is required';
        break;

      case 2: // Contact & Address
        if (!onboardingData.email.trim()) newErrors.email = 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(onboardingData.email)) newErrors.email = 'Valid email is required';
        if (!onboardingData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!onboardingData.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
        if (!onboardingData.city.trim()) newErrors.city = 'City is required';
        if (!onboardingData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
        break;

      case 3: // Identity & Residency
        if (!onboardingData.country) newErrors.country = 'Country is required';
        if (!onboardingData.residencyStatus) newErrors.residencyStatus = 'Residency status is required';
        if (onboardingData.isUSCitizen && !onboardingData.ssn.trim()) newErrors.ssn = 'SSN is required for US citizens';
        if (!onboardingData.isUSCitizen && !onboardingData.passportNumber.trim()) newErrors.passportNumber = 'Passport number is required';
        if (!onboardingData.taxId.trim()) newErrors.taxId = 'Tax ID is required';
        break;

      case 4: // Employment
        if (!onboardingData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
        if (onboardingData.employmentStatus !== 'unemployed' && !onboardingData.employer.trim()) {
          newErrors.employer = 'Employer is required';
        }
        if (onboardingData.employmentStatus !== 'unemployed' && !onboardingData.jobTitle.trim()) {
          newErrors.jobTitle = 'Job title is required';
        }
        if (!onboardingData.annualIncome) newErrors.annualIncome = 'Annual income is required';
        break;

      case 5: // Account Purpose
        if (!onboardingData.accountPurpose) newErrors.accountPurpose = 'Account purpose is required';
        if (!onboardingData.fundingSource) newErrors.fundingSource = 'Funding source is required';
        break;

      case 6: // Trading Features
        // At least one feature should be selected
        if (
          !onboardingData.onlineTrading &&
          !onboardingData.realTimeQuotes &&
          !onboardingData.mobileApp &&
          !onboardingData.researchTools &&
          !onboardingData.advancedCharting &&
          !onboardingData.marginTrading &&
          !onboardingData.optionsTrading
        ) {
          newErrors.features = 'Please select at least one trading feature';
        }
        break;

      case 7: // Compliance
        if (!onboardingData.fatcaStatus) newErrors.fatcaStatus = 'FATCA status is required';
        if (!onboardingData.kycStatus) newErrors.kycStatus = 'KYC status is required';
        if (!onboardingData.amlCompliance) newErrors.amlCompliance = 'You must confirm AML compliance';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      window.scrollTo(0, 0);
    } else {
      toast.error('Please fix the errors before proceeding');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setOnboardingData(prev => ({
      ...prev,
      [name]: val
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      // Update user profile in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        middleName: onboardingData.middleName,
        gender: onboardingData.gender,
        dateOfBirth: onboardingData.dateOfBirth,
        email: onboardingData.email,
        phone: onboardingData.phone,
        alternatePhone: onboardingData.alternatePhone,
        address: {
          line1: onboardingData.addressLine1,
          line2: onboardingData.addressLine2,
          city: onboardingData.city,
          state: onboardingData.state,
          postalCode: onboardingData.postalCode,
          country: onboardingData.addressCountry
        },
        identity: {
          country: onboardingData.country,
          isUSCitizen: onboardingData.isUSCitizen,
          residencyStatus: onboardingData.residencyStatus,
          ssn: onboardingData.ssn,
          passportNumber: onboardingData.passportNumber,
          passportCountry: onboardingData.passportCountry,
          taxId: onboardingData.taxId
        },
        employment: {
          status: onboardingData.employmentStatus,
          employer: onboardingData.employer,
          jobTitle: onboardingData.jobTitle,
          annualIncome: onboardingData.annualIncome,
          incomeSource: onboardingData.incomeSource
        },
        account: {
          purpose: onboardingData.accountPurpose,
          expectedMonthlyTransactions: onboardingData.expectedMonthlyTransactions,
          expectedTransactionAmount: onboardingData.expectedTransactionAmount,
          initialDeposit: onboardingData.initialDeposit,
          fundingSource: onboardingData.fundingSource
        },
        compliance: {
          fatcaStatus: onboardingData.fatcaStatus,
          crsReporting: onboardingData.crsReporting,
          sanctionsScreening: onboardingData.sanctionsScreening,
          pep: onboardingData.pep,
          amlCompliance: onboardingData.amlCompliance
        },
        updatedAt: Timestamp.now()
      });

      // Update trading account with features and status
      const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDocSnap.exists() && userDocSnap.data().tradingAccountId) {
        const tradingAccountId = userDocSnap.data().tradingAccountId;
        const accountRef = doc(db, 'accounts', tradingAccountId);

        await updateDoc(accountRef, {
          features: {
            onlineTrading: onboardingData.onlineTrading,
            realTimeQuotes: onboardingData.realTimeQuotes,
            mobileApp: onboardingData.mobileApp,
            researchTools: onboardingData.researchTools,
            advancedCharting: onboardingData.advancedCharting,
            marginTrading: onboardingData.marginTrading,
            optionsTrading: onboardingData.optionsTrading
          },
          kycStatus: 'verified',
          onboardingStatus: 'completed',
          updatedAt: Timestamp.now()
        });
      }

      setCompleted(true);
      toast.success('Profile completed successfully!');
    } catch (error: any) {
      console.error('Error submitting profile:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">Profile Complete!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Your account is now fully set up and ready to use.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-green-900 mb-4">What's Next?</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-green-800">Your account has been verified and is ready to use</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-green-800">You can now access all enabled trading features</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-green-800">Fund your account to start trading</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-green-800">Access the trading dashboard and market research tools</span>
                </li>
              </ul>
            </div>

            <a
              href="/client/dashboard"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Step {currentStep} of {steps.length}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between mb-4">
            {steps.map(step => (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold mb-2 transition-colors ${
                    step.id <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.id}
                </div>
                <span className={`text-xs text-center ${
                  step.id <= currentStep ? 'text-blue-600 font-semibold' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div>
              <div className="flex items-center mb-6">
                <User className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={onboardingData.firstName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={onboardingData.lastName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={onboardingData.middleName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={onboardingData.dateOfBirth}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.dateOfBirth ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                  <select
                    name="gender"
                    value={onboardingData.gender}
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
          )}

          {/* Step 2: Contact & Address */}
          {currentStep === 2 && (
            <div>
              <div className="flex items-center mb-6">
                <MapPin className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Contact & Address</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={onboardingData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={onboardingData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alternate Phone</label>
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={onboardingData.alternatePhone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={onboardingData.addressLine1}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.addressLine1 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="123 Main St"
                  />
                  {errors.addressLine1 && <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={onboardingData.addressLine2}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Apt, Suite, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={onboardingData.city}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                    <input
                      type="text"
                      name="state"
                      value={onboardingData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={onboardingData.postalCode}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.postalCode ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <SearchableCountrySelect
                      value={onboardingData.addressCountry}
                      onChange={(country) => setOnboardingData(prev => ({
                        ...prev,
                        addressCountry: country
                      }))}
                      options={countries}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Identity & Residency */}
          {currentStep === 3 && (
            <div>
              <div className="flex items-center mb-6">
                <Globe className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Identity & Residency</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country of Residence *</label>
                  <SearchableCountrySelect
                    value={onboardingData.country}
                    onChange={(country) => setOnboardingData(prev => ({
                      ...prev,
                      country
                    }))}
                    options={countries}
                  />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">US Citizen?</label>
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="usCitizen"
                        checked={onboardingData.isUSCitizen}
                        onChange={() => setOnboardingData(prev => ({ ...prev, isUSCitizen: true }))}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="usCitizen"
                        checked={!onboardingData.isUSCitizen}
                        onChange={() => setOnboardingData(prev => ({ ...prev, isUSCitizen: false }))}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                {onboardingData.isUSCitizen && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Social Security Number *</label>
                    <input
                      type="text"
                      name="ssn"
                      value={onboardingData.ssn}
                      onChange={handleInputChange}
                      placeholder="XXX-XX-XXXX"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.ssn ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    />
                    {errors.ssn && <p className="text-red-500 text-sm mt-1">{errors.ssn}</p>}
                  </div>
                )}

                {!onboardingData.isUSCitizen && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Passport Number *</label>
                      <input
                        type="text"
                        name="passportNumber"
                        value={onboardingData.passportNumber}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.passportNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {errors.passportNumber && <p className="text-red-500 text-sm mt-1">{errors.passportNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Passport Country</label>
                      <SearchableCountrySelect
                        value={onboardingData.passportCountry}
                        onChange={(country) => setOnboardingData(prev => ({
                          ...prev,
                          passportCountry: country
                        }))}
                        options={countries}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Residency Status *</label>
                  <select
                    name="residencyStatus"
                    value={onboardingData.residencyStatus}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.residencyStatus ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Status</option>
                    <option value="citizen">Citizen</option>
                    <option value="permanent-resident">Permanent Resident</option>
                    <option value="temporary-resident">Temporary Resident</option>
                    <option value="student">Student Visa</option>
                  </select>
                  {errors.residencyStatus && <p className="text-red-500 text-sm mt-1">{errors.residencyStatus}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID (TIN) *</label>
                  <input
                    type="text"
                    name="taxId"
                    value={onboardingData.taxId}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.taxId ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  {errors.taxId && <p className="text-red-500 text-sm mt-1">{errors.taxId}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Employment */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-center mb-6">
                <Briefcase className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Employment Details</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status *</label>
                  <select
                    name="employmentStatus"
                    value={onboardingData.employmentStatus}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.employmentStatus ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Status</option>
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                  {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>}
                </div>

                {onboardingData.employmentStatus && onboardingData.employmentStatus !== 'unemployed' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employer Name *</label>
                      <input
                        type="text"
                        name="employer"
                        value={onboardingData.employer}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.employer ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {errors.employer && <p className="text-red-500 text-sm mt-1">{errors.employer}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                      <input
                        type="text"
                        name="jobTitle"
                        value={onboardingData.jobTitle}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                          errors.jobTitle ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {errors.jobTitle && <p className="text-red-500 text-sm mt-1">{errors.jobTitle}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income *</label>
                  <select
                    name="annualIncome"
                    value={onboardingData.annualIncome}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.annualIncome ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Range</option>
                    <option value="under-50k">Under $50,000</option>
                    <option value="50k-100k">$50,000 - $100,000</option>
                    <option value="100k-250k">$100,000 - $250,000</option>
                    <option value="250k-500k">$250,000 - $500,000</option>
                    <option value="500k-1m">$500,000 - $1,000,000</option>
                    <option value="over-1m">Over $1,000,000</option>
                  </select>
                  {errors.annualIncome && <p className="text-red-500 text-sm mt-1">{errors.annualIncome}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Income Source</label>
                  <select
                    name="incomeSource"
                    value={onboardingData.incomeSource}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Source</option>
                    <option value="employment">Employment</option>
                    <option value="self-employment">Self-Employment</option>
                    <option value="investments">Investments</option>
                    <option value="inheritance">Inheritance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Account Purpose */}
          {currentStep === 5 && (
            <div>
              <div className="flex items-center mb-6">
                <CreditCard className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Account Purpose</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Purpose *</label>
                  <select
                    name="accountPurpose"
                    value={onboardingData.accountPurpose}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.accountPurpose ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Purpose</option>
                    <option value="long-term investment">Long-term Investment</option>
                    <option value="short-term trading">Short-term Trading</option>
                    <option value="retirement planning">Retirement Planning</option>
                    <option value="wealth management">Wealth Management</option>
                    <option value="hedge">Hedge Strategy</option>
                  </select>
                  {errors.accountPurpose && <p className="text-red-500 text-sm mt-1">{errors.accountPurpose}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Monthly Transactions</label>
                  <select
                    name="expectedMonthlyTransactions"
                    value={onboardingData.expectedMonthlyTransactions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0-5">0-5</option>
                    <option value="5-10">5-10</option>
                    <option value="10-20">10-20</option>
                    <option value="20-50">20-50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Transaction Amount</label>
                  <select
                    name="expectedTransactionAmount"
                    value={onboardingData.expectedTransactionAmount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="under-1k">Under $1,000</option>
                    <option value="1k-5k">$1,000 - $5,000</option>
                    <option value="5k-25k">$5,000 - $25,000</option>
                    <option value="25k-100k">$25,000 - $100,000</option>
                    <option value="over-100k">Over $100,000</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Initial Deposit Amount</label>
                  <input
                    type="number"
                    name="initialDeposit"
                    value={onboardingData.initialDeposit}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Funding Source *</label>
                  <select
                    name="fundingSource"
                    value={onboardingData.fundingSource}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.fundingSource ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Source</option>
                    <option value="bank transfer">Bank Transfer</option>
                    <option value="wire transfer">Wire Transfer</option>
                    <option value="debit card">Debit Card</option>
                    <option value="check">Check</option>
                  </select>
                  {errors.fundingSource && <p className="text-red-500 text-sm mt-1">{errors.fundingSource}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Trading Features */}
          {currentStep === 6 && (
            <div>
              <div className="flex items-center mb-6">
                <CheckCircle className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Trading Features</h2>
              </div>

              <p className="text-gray-600 mb-6">Select the trading features you'd like to enable on your account:</p>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { name: 'onlineTrading', label: 'Online Trading', desc: 'Execute trades online' },
                  { name: 'realTimeQuotes', label: 'Real-Time Quotes', desc: 'Live market data' },
                  { name: 'mobileApp', label: 'Mobile App', desc: 'Trade on the go' },
                  { name: 'researchTools', label: 'Research Tools', desc: 'Market analysis' },
                  { name: 'advancedCharting', label: 'Advanced Charting', desc: 'Professional charts' },
                  { name: 'marginTrading', label: 'Margin Trading', desc: 'Leverage up to $500k' },
                  { name: 'optionsTrading', label: 'Options Trading', desc: 'Trade options contracts' }
                ].map(feature => (
                  <label key={feature.name} className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      name={feature.name}
                      checked={(onboardingData as any)[feature.name]}
                      onChange={handleInputChange}
                      className="w-5 h-5 mt-1 text-blue-600 rounded"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{feature.label}</p>
                      <p className="text-sm text-gray-500">{feature.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {errors.features && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{errors.features}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Compliance & Review */}
          {currentStep === 7 && (
            <div>
              <div className="flex items-center mb-6">
                <Shield className="w-6 h-6 text-blue-600 mr-3" />
                <h2 className="text-2xl font-bold text-gray-900">Compliance & Review</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">FATCA Status *</label>
                  <select
                    name="fatcaStatus"
                    value={onboardingData.fatcaStatus}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.fatcaStatus ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Select Status</option>
                    <option value="us-person">US Person</option>
                    <option value="foreign-person">Foreign Person</option>
                  </select>
                  {errors.fatcaStatus && <p className="text-red-500 text-sm mt-1">{errors.fatcaStatus}</p>}
                </div>

                <label className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="crsReporting"
                    checked={onboardingData.crsReporting}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">CRS Reporting Status</p>
                    <p className="text-sm text-gray-500">I understand my account may be reported under CRS</p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="sanctionsScreening"
                    checked={onboardingData.sanctionsScreening}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Sanctions Screening</p>
                    <p className="text-sm text-gray-500">I certify I am not on any sanctions list</p>
                  </div>
                </label>

                <label className="flex items-start p-4 border border-gray-300 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    name="pep"
                    checked={onboardingData.pep}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">Politically Exposed Person (PEP)</p>
                    <p className="text-sm text-gray-500">I confirm I am not a politically exposed person</p>
                  </div>
                </label>

                <label className={`flex items-start p-4 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${
                  errors.amlCompliance ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    name="amlCompliance"
                    checked={onboardingData.amlCompliance}
                    onChange={handleInputChange}
                    className="w-5 h-5 mt-1 text-blue-600 rounded"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">AML Compliance *</p>
                    <p className="text-sm text-gray-500">I acknowledge the AML/KYC requirements and commit to compliance</p>
                  </div>
                </label>
                {errors.amlCompliance && <p className="text-red-500 text-sm mt-1">{errors.amlCompliance}</p>}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                  <h3 className="font-semibold text-blue-900 mb-3">Review Summary</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Personal information completed
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Address verified
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Identity documents provided
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Employment information recorded
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Account preferences configured
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Trading features selected
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      Compliance requirements acknowledged
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:text-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous
          </button>

          {currentStep === steps.length ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? 'Completing Profile...' : 'Complete Profile'}
              <CheckCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Next
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;
