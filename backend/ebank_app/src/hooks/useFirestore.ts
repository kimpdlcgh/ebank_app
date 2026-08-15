import { useState, useEffect, useRef } from 'react';
import { DocumentData, Unsubscribe } from 'firebase/firestore';
import { createQuery, OptimizedQuery, handleFirebaseError } from '../utils/firebaseOptimizer';
import { USER_COLLECTION, profileToUser } from '../utils/profileAdapter';

interface UseFirestoreOptions {
  realTime?: boolean;
  cacheEnabled?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

interface UseFirestoreState {
  data: DocumentData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isEmpty: boolean;
}

// Optimized Firestore hook with caching, error handling, and real-time updates
export const useFirestore = (
  collectionName: string,
  queryBuilder?: (query: OptimizedQuery) => OptimizedQuery,
  options: UseFirestoreOptions = {}
): UseFirestoreState => {
  const {
    realTime = false,
    cacheEnabled = true,
    retryOnError = true,
    maxRetries = 3
  } = options;

  const [data, setData] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const retryCountRef = useRef(0);

  const buildQuery = (): OptimizedQuery => {
    let query = createQuery(collectionName);
    if (queryBuilder) {
      query = queryBuilder(query);
    }
    return query;
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const query = buildQuery();
      const result = await query.execute();
      
      if (result.error) {
        setError(result.error);
        setData([]);
      } else {
        setData(result.data);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      const errorMessage = handleFirebaseError(err, `fetch ${collectionName}`, false);
      setError(errorMessage);
      
      // Retry logic
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`Retrying fetch for ${collectionName} (${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => fetchData(false), 1000 * retryCountRef.current);
        return;
      }
      
      setData([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const setupRealTimeListener = () => {
    try {
      const query = buildQuery();
      
      const unsubscribe = query.onSnapshot((newData, error) => {
        if (error) {
          const errorMessage = handleFirebaseError(error, `real-time ${collectionName}`, false);
          console.error(`Real-time listener error for ${collectionName}:`, errorMessage);
          
          // Check if it's an authentication error that should not trigger retries
          if (errorMessage.includes('Authentication required') || 
              errorMessage.includes('Access denied') || 
              error.includes('unauthenticated') || 
              error.includes('permission-denied')) {
            console.log(`Authentication/permission error in real-time listener for ${collectionName}, not retrying`);
            setError(errorMessage);
            setLoading(false);
            return;
          }
          
          setError(errorMessage);
          
          // Only retry for network or temporary errors
          if (retryOnError && retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Retrying real-time listener for ${collectionName} (${retryCountRef.current}/${maxRetries})`);
            
            // Clean up current listener before retrying
            if (unsubscribeRef.current) {
              unsubscribeRef.current();
            }
            
            // Longer delay for retries to prevent spam
            setTimeout(setupRealTimeListener, 3000 * Math.pow(2, retryCountRef.current)); // 3s, 6s, 12s...
          } else if (retryCountRef.current >= maxRetries) {
            console.error(`Max retries exceeded for real-time listener: ${collectionName}`);
          }
        } else {
          setData(newData);
          setError(null);
          retryCountRef.current = 0;
        }
        setLoading(false);
      });

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      console.error(`Error setting up real-time listener for ${collectionName}:`, err);
      const errorMessage = handleFirebaseError(err, `listener setup ${collectionName}`, false);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchData(true);
  };

  useEffect(() => {
    // Clean up any existing listener first
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Reset retry count on new effect
    retryCountRef.current = 0;
    
    if (realTime) {
      setupRealTimeListener();
    } else {
      fetchData();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [collectionName, realTime]); // Re-run when collection or realTime mode changes

  return {
    data,
    loading,
    error,
    refetch,
    isEmpty: !loading && data.length === 0
  };
};

// Specialized hook for user accounts with enhanced debugging
export const useUserAccounts = (userId: string) => {
  // Don't make query if userId is empty/invalid
  if (!userId || userId.trim() === '' || userId === 'undefined' || userId === 'null') {
    console.log('useUserAccounts: Invalid userId provided:', userId);
    return {
      data: [],
      loading: false,
      error: null,
      refetch: () => Promise.resolve(),
      isEmpty: true
    };
  }

  console.log('useUserAccounts: Setting up for userId:', userId);
  console.log('useUserAccounts: Auth state and userId verified');
  
  const result = useFirestore(
    'accounts',
    (query) => {
      console.log('useUserAccounts: Building query for userId:', userId);
      return query
        .whereField('userId', '==', userId);
        // Temporarily remove orderByField to avoid index requirement
        // .orderByField('createdAt', 'desc');
    },
    { realTime: true, cacheEnabled: false, maxRetries: 3, retryOnError: true } // Disable cache temporarily for debugging
  );
  
  // Enhanced logging for debugging
  console.log('useUserAccounts: Query result:', {
    dataCount: result.data?.length || 0,
    loading: result.loading,
    error: result.error,
    userId: userId
  });
  
  return result;
};

// Specialized hook for admin users management (live `profiles` collection)
export const useUsers = (includeInactive: boolean = false) => {
  const result = useFirestore(
    USER_COLLECTION,
    (query) => query.orderByField('createdAt', 'desc'),
    { cacheEnabled: true, realTime: true }
  );

  const mapped = result.data.map((row) => {
    const id = String(row.id || row.uid || '');
    const user = profileToUser(id, row);
    return { ...user, id: user.uid };
  }).filter((user) => {
    if (includeInactive) return true;
    return user.status !== 'inactive' && user.status !== 'suspended';
  });

  return {
    ...result,
    data: mapped,
    isEmpty: !result.loading && mapped.length === 0,
  };
};

// Specialized hook for support requests
export const useSupportRequests = () => {
  return useFirestore(
    'support_requests',
    (query) => query.orderByField('timestamp', 'desc'),
    { realTime: true }
  );
};

// Specialized hook for FAQs
export const useFAQs = (activeOnly: boolean = true) => {
  return useFirestore(
    'faqs',
    (query) => {
      let q = query.orderByField('order', 'asc');
      if (activeOnly) {
        q = q.whereField('isActive', '==', true);
      }
      return q;
    },
    { realTime: true, cacheEnabled: true }
  );
};

// Specialized hook for clients (role === 'client') on the live `profiles` collection
export const useClients = () => {
  const result = useFirestore(
    USER_COLLECTION,
    (query) => query.orderByField('createdAt', 'desc'),
    { cacheEnabled: true, realTime: true }
  );

  const mapped = result.data
    .map((row) => {
      const id = String(row.id || row.uid || '');
      return { ...profileToUser(id, row), id };
    })
    .filter((user) => user.role === 'client');

  return {
    ...result,
    data: mapped,
    isEmpty: !result.loading && mapped.length === 0,
  };
};

// Specialized hook for admin-managed account/product categories
export const useAccountCategories = () => {
  return useFirestore(
    'account_categories',
    (query) => query.orderByField('order', 'asc'),
    { realTime: true, cacheEnabled: true }
  );
};

// Specialized hook for tradable instruments
export const useInstruments = () => {
  return useFirestore(
    'instruments',
    (query) => query.orderByField('symbol', 'asc'),
    { realTime: true, cacheEnabled: true }
  );
};

// Specialized hook for a single client's positions (sorted client-side to avoid a composite index)
export const useUserPositions = (userId: string) => {
  const result = useFirestore(
    'positions',
    (query) => query.whereField('userId', '==', userId),
    { realTime: true, cacheEnabled: false }
  );
  return { ...result, data: !userId ? [] : result.data };
};

// Specialized hook for all positions (admin AUM/portfolio views)
export const useAllPositions = () => {
  return useFirestore('positions', undefined, { realTime: true, cacheEnabled: true });
};

// Specialized hook for a single client's brokerage orders
export const useUserOrders = (userId: string) => {
  const result = useFirestore(
    'brokerage_orders',
    (query) => query.whereField('userId', '==', userId),
    { realTime: true, cacheEnabled: false }
  );
  return { ...result, data: !userId ? [] : result.data };
};

// Specialized hook for all brokerage orders (admin order queue)
export const useAllOrders = () => {
  return useFirestore('brokerage_orders', undefined, { realTime: true, cacheEnabled: false });
};

// Specialized hook for a single client's watchlist
export const useUserWatchlist = (userId: string) => {
  const result = useFirestore(
    'watchlist',
    (query) => query.whereField('userId', '==', userId),
    { realTime: true, cacheEnabled: false }
  );
  return { ...result, data: !userId ? [] : result.data };
};

// Specialized hook for a single client's banking transactions
export const useUserTransactions = (userId: string) => {
  const result = useFirestore(
    'transactions',
    (query) => query.whereField('userId', '==', userId),
    { realTime: true, cacheEnabled: false }
  );
  return { ...result, data: !userId ? [] : result.data };
};

// Specialized hook for the admin audit trail
export const useAuditLogs = () => {
  return useFirestore(
    'audit_logs',
    (query) => query.orderByField('createdAt', 'desc').limitTo(200),
    { realTime: true, cacheEnabled: false }
  );
};

// Specialized hook for a client's internal admin notes
export const useClientNotes = (clientId: string) => {
  const result = useFirestore(
    'client_notes',
    (query) => query.whereField('clientId', '==', clientId),
    { realTime: true, cacheEnabled: false }
  );
  return { ...result, data: !clientId ? [] : result.data };
};

// Hook for system configuration
export const useSystemConfig = () => {
  const [config, setConfig] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const query = createQuery('systemConfig');
        const result = await query.execute();
        
        if (result.error) {
          setError(result.error);
        } else if (result.data.length > 0) {
          setConfig(result.data[0]);
        } else {
          setError('System configuration not found');
        }
      } catch (err) {
        const errorMessage = handleFirebaseError(err, 'fetch system config');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
};