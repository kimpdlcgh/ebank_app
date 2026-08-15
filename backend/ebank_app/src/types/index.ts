import { Timestamp } from 'firebase/firestore';

// User roles
export const UserRole = {
  CLIENT: 'client',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Transaction types
export const TransactionType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',
  PAYMENT: 'payment',
  TRADE_BUY: 'trade_buy',
  TRADE_SELL: 'trade_sell'
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

// Transaction status
export const TransactionStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

// Account types
export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  BUSINESS: 'business'
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

// Fund request types
export const FundRequestType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal'
} as const;

export type FundRequestType = typeof FundRequestType[keyof typeof FundRequestType];

// Fund request status
export const FundRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type FundRequestStatus = typeof FundRequestStatus[keyof typeof FundRequestStatus];

// E-wallet providers
export const EWalletProvider = {
  PAYPAL: 'paypal',
  VENMO: 'venmo',
  CASHAPP: 'cashapp',
  APPLEPAY: 'applepay',
  GOOGLEPAY: 'googlepay'
} as const;

export type EWalletProvider = typeof EWalletProvider[keyof typeof EWalletProvider];

// User interface
export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  profileImageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  status?: string;
  department?: string;
  jobTitle?: string;
  adminProfile?: {
    department?: string;
    jobTitle?: string;
    permissions?: Record<string, boolean>;
  };
  lastLoginAt?: Timestamp;
}

// Account interface
export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Transaction interface
export interface Transaction {
  id: string;
  fromAccountId?: string;
  toAccountId?: string;
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  failureReason?: string;
}

// Fund request interface
export interface FundRequest {
  id: string;
  userId: string;
  accountId: string;
  type: FundRequestType;
  amount: number;
  currency: string;
  status: FundRequestStatus;
  description: string;
  paymentMethod?: string;
  bankDetails?: BankDetails;
  ewalletDetails?: EWalletDetails;
  documentUrl?: string;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  adminNotes?: string;
}

// Bank details interface
export interface BankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
}

// E-wallet details interface
export interface EWalletDetails {
  provider: EWalletProvider;
  walletId: string;
  walletName?: string;
}

// Linked e-wallet interface
export interface LinkedEWallet {
  id: string;
  userId: string;
  provider: EWalletProvider;
  walletId: string;
  walletName: string;
  isVerified: boolean;
  balance?: number;
  currency?: string;
  linkedAt: Timestamp;
  lastSyncAt?: Timestamp;
}

// Deposit method interface
export interface DepositMethod {
  id: string;
  type: 'card' | 'bank' | 'ewallet';
  name: string;
  details: any;
  isDefault: boolean;
}

// Card details interface
export interface CardDetails {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cardType: string;
  lastFourDigits: string;
}

// OTP verification interface
export interface OTPVerification {
  id: string;
  userId: string;
  method: 'sms' | 'email';
  code: string;
  purpose: string;
  expiresAt: Timestamp;
  isUsed: boolean;
  createdAt: Timestamp;
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// Analytics data interface
export interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingRequests: number;
  monthlyGrowth: number;
  transactionVolume: number;
}

// Form interfaces
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileForm {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface TransferForm {
  recipientAccount: string;
  amount: number;
  description: string;
  transferType: 'internal' | 'external' | 'ewallet';
  recipientBank?: string;
  recipientName?: string;
  ewalletProvider?: EWalletProvider;
}

export interface DepositForm {
  amount: number;
  method: 'card' | 'bank' | 'ewallet';
  description?: string;
  cardDetails?: CardDetails;
  bankDetails?: BankDetails;
  ewalletProvider?: EWalletProvider;
}

export interface WithdrawalForm {
  amount: number;
  method: 'bank' | 'ewallet';
  description?: string;
  bankDetails?: BankDetails;
  ewalletProvider?: EWalletProvider;
}

// API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Context interfaces
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: SignupForm) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  enableTwoFactor: () => Promise<void>;
  disableTwoFactor: () => Promise<void>;
}

// System Configuration types
export interface SystemConfig {
  id: string;
  companyInfo: CompanyInfo;
  branding: BrandingConfig;
  contact: ContactInfo;
  features: SystemFeatures;
  security: SecurityConfig;
  notifications: NotificationConfig;
  supportEmailTemplates: SupportEmailTemplates;
  updatedAt: Date;
  updatedBy: string;
  version: string;
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  description?: string;
  tagline?: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  establishedYear?: number;
  industry: string;
  timezone: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
}

export interface BrandingConfig {
  logo: {
    primary: string; // URL to primary logo
    secondary?: string; // URL to secondary/white version
    favicon?: string; // URL to favicon
    width?: number;
    height?: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  layout: {
    sidebarWidth: number;
    headerHeight: number;
    footerHeight: number;
    borderRadius: string;
  };
}

export interface ContactInfo {
  email: {
    primary: string;
    support: string;
    billing?: string;
    legal?: string;
    noreply?: string;
  };
  phone: {
    primary: string;
    support?: string;
    international?: string;
    fax?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  businessHours: {
    timezone: string;
    schedule: {
      [key: string]: {
        open: string;
        close: string;
        closed?: boolean;
      };
    };
  };
}

export const AssetClass = {
  STOCK: 'stock',
  BOND: 'bond',
  ETF: 'etf',
  COMMODITY: 'commodity',
  CRYPTO: 'crypto'
} as const;

export type AssetClass = typeof AssetClass[keyof typeof AssetClass];

export const OrderSide = {
  BUY: 'buy',
  SELL: 'sell'
} as const;

export type OrderSide = typeof OrderSide[keyof typeof OrderSide];

export const BrokerageOrderType = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP: 'stop',
  STOP_LIMIT: 'stop_limit'
} as const;

export type BrokerageOrderType = typeof BrokerageOrderType[keyof typeof BrokerageOrderType];

export const BrokerageOrderStatus = {
  OPEN: 'open',
  PARTIALLY_FILLED: 'partially_filled',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
} as const;

export type BrokerageOrderStatus = typeof BrokerageOrderStatus[keyof typeof BrokerageOrderStatus];

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  bid?: number;
  ask?: number;
  lastPrice: number;
  dayChange: number;
  dayChangePercent: number;
  isTradable: boolean;
  updatedAt: Timestamp;
}

export interface BrokerageOrder {
  id: string;
  userId: string;
  accountId: string;
  instrumentId: string;
  symbol: string;
  assetClass: AssetClass;
  side: OrderSide;
  orderType: BrokerageOrderType;
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  estimatedValue: number;
  status: BrokerageOrderStatus;
  timeInForce: 'day' | 'gtc' | 'ioc';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Position {
  id: string;
  accountId: string;
  userId: string;
  instrumentId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  averageCost: number;
  lastPrice: number;
  marketValue: number;
  allocationPercent: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  updatedAt: Timestamp;
}

export interface CashLedgerEntry {
  id: string;
  accountId: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'trade_settlement' | 'dividend' | 'coupon' | 'fee' | 'transfer' | 'adjustment';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  createdAt: Timestamp;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  lastPrice: number;
  dayChangePercent: number;
  addedAt: Timestamp;
}

export interface BrokerageDocument {
  id: string;
  accountId: string;
  type: 'statement' | 'trade-confirmation' | 'tax-document' | 'funding-advice';
  title: string;
  period: string;
  status: 'ready' | 'processing';
  generatedAt: Timestamp;
  downloadUrl?: string;
}

export interface SystemFeatures {
  multiCurrency: boolean;
  twoFactorAuth: boolean;
  emailVerification: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  maintenance: boolean;
  registration: boolean;
  passwordReset: boolean;
  accountRecovery: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  exportData: boolean;
  importData: boolean;
  bulkOperations: boolean;
}

export interface SecurityConfig {
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays?: number;
  };
  twoFactorAuth: {
    enforced: boolean;
    methods: ('sms' | 'email' | 'totp' | 'backup')[];
  };
  ipWhitelist: string[];
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

export interface NotificationConfig {
  email: {
    enabled: boolean;
    templates: {
      welcome: boolean;
      transactionAlert: boolean;
      securityAlert: boolean;
      maintenance: boolean;
      newsletter: boolean;
    };
  };
  sms: {
    enabled: boolean;
    provider?: string;
    templates: {
      twoFactorAuth: boolean;
      transactionAlert: boolean;
      securityAlert: boolean;
    };
  };
  push: {
    enabled: boolean;
    templates: {
      transactionAlert: boolean;
      securityAlert: boolean;
      maintenance: boolean;
    };
  };
  inApp: {
    enabled: boolean;
    retention: number; // days
  };
}

// Admin-managed account/product category (drives account-type selection UI)
export interface AccountCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  features: string[];
  minimumDeposit: number;
  monthlyFee?: number;
  interestRate?: number;
  enabled: boolean;
  order: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Append-only admin action audit trail entry
export interface AuditLog {
  id: string;
  action: string;
  actorId?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  details?: Record<string, any>;
  createdAt: Timestamp;
}

// Internal admin note/flag attached to a client profile
export interface ClientNote {
  id: string;
  clientId: string;
  note: string;
  flag: 'none' | 'watch' | 'risk';
  createdBy?: string;
  createdByEmail?: string;
  createdAt: Timestamp;
}

export interface SupportEmailTemplates {
  autoReply: {
    enabled: boolean;
    subject: string;
    message: string;
  };
  accountOpening: {
    acknowledgment: {
      subject: string;
      message: string;
    };
    approved: {
      subject: string;
      message: string;
    };
    requiresDocuments: {
      subject: string;
      message: string;
    };
  };
  general: {
    received: {
      subject: string;
      message: string;
    };
    resolved: {
      subject: string;
      message: string;
    };
    followUp: {
      subject: string;
      message: string;
    };
  };
}