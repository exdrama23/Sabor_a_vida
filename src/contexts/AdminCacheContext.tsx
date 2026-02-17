import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import api from '../axiosInstance';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  size?: 'PEQUENO' | 'MEDIO' | 'GRANDE';
  featured: boolean;
  description?: string;
}

interface Order {
  id: string;
  externalReference?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCpf?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressReference?: string;
  addressType?: string;
  deliveryNotes?: string;
  totalPrice: number;
  subtotal?: number;
  deliveryPrice?: number;
  deliveryStatus?: 'PENDING' | 'DELIVERED';
  deliveredAt?: string;
  paymentStatus: string;
  paymentMethod?: string;
  mercadoPagoPaymentId?: string;
  cardLastFour?: string;
  installments?: number;
  created_at?: string;
  updated_at?: string;
  whatsappSentAt?: string;
  items?: any[];
}

interface Payment {
  id: string;
  orderExternalRef: string;
  mercadoPagoId: string;
  status: string;
  statusDetail?: string;
  transactionAmount: number;
  paymentMethodId: string;
  created_at: string;
  updated_at: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

interface CacheState {
  products: CacheEntry<Product[]> | null;
  orders: CacheEntry<Order[]> | null;
  payments: CacheEntry<Payment[]> | null;
}

interface LoadingState {
  products: boolean;
  orders: boolean;
  payments: boolean;
}

interface AdminCacheContextValue {
  products: Product[];
  orders: Order[];
  payments: Payment[];

  loading: LoadingState;
  initialLoading: LoadingState;

  lastUpdate: {
    products: Date | null;
    orders: Date | null;
    payments: Date | null;
  };

  fetchProducts: (force?: boolean) => Promise<Product[]>;
  fetchOrders: (force?: boolean) => Promise<Order[]>;
  fetchPayments: (force?: boolean) => Promise<Payment[]>;
  fetchAll: (force?: boolean) => Promise<void>;

  invalidateProducts: () => void;
  invalidateOrders: () => void;
  invalidatePayments: () => void;
  invalidateAll: () => void;

  addProduct: (product: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
}

const CACHE_TTL = {
  products: 5 * 60 * 1000,  
  orders: 2 * 60 * 1000,     
  payments: 2 * 60 * 1000,   
};

const STALE_TTL = {
  products: 30 * 1000,    
  orders: 15 * 1000,         
  payments: 15 * 1000,        
};

const BACKGROUND_REFRESH_INTERVAL = 60 * 1000; 

const AdminCacheContext = createContext<AdminCacheContextValue | null>(null);

export function AdminCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<CacheState>({
    products: null,
    orders: null,
    payments: null,
  });

  const [loading, setLoading] = useState<LoadingState>({
    products: false,
    orders: false,
    payments: false,
  });

  const [initialLoading, setInitialLoading] = useState<LoadingState>({
    products: true,
    orders: true,
    payments: true,
  });

  const pendingRequests = useRef<{
    products: Promise<Product[]> | null;
    orders: Promise<Order[]> | null;
    payments: Promise<Payment[]> | null;
  }>({
    products: null,
    orders: null,
    payments: null,
  });

  const backgroundRefreshRef = useRef<number | null>(null);

  const isCacheValid = useCallback((entry: CacheEntry<any> | null, ttl: number): boolean => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < ttl;
  }, []);

  const isCacheStale = useCallback((entry: CacheEntry<any> | null, staleTtl: number): boolean => {
    if (!entry) return true;
    return Date.now() - entry.timestamp > staleTtl;
  }, []);

  const fetchProducts = useCallback(async (force: boolean = false): Promise<Product[]> => {
    if (!force && isCacheValid(cache.products, CACHE_TTL.products)) {
      if (isCacheStale(cache.products, STALE_TTL.products) && !pendingRequests.current.products) {
        fetchProducts(true).catch(console.error);
      }
      return cache.products!.data;
    }

    if (pendingRequests.current.products) {
      return pendingRequests.current.products;
    }

    setLoading(prev => ({ ...prev, products: true }));
    
    const request = api.get('/product')
      .then(response => {
        const data = response.data || [];
        setCache(prev => ({
          ...prev,
          products: {
            data,
            timestamp: Date.now(),
            isStale: false,
          },
        }));
        setInitialLoading(prev => ({ ...prev, products: false }));
        return data;
      })
      .finally(() => {
        pendingRequests.current.products = null;
        setLoading(prev => ({ ...prev, products: false }));
      });

    pendingRequests.current.products = request;
    return request;
  }, [cache.products, isCacheValid, isCacheStale]);

  const fetchOrders = useCallback(async (force: boolean = false): Promise<Order[]> => {
    if (!force && isCacheValid(cache.orders, CACHE_TTL.orders)) {
      if (isCacheStale(cache.orders, STALE_TTL.orders) && !pendingRequests.current.orders) {
        fetchOrders(true).catch(console.error);
      }
      return cache.orders!.data;
    }

    if (pendingRequests.current.orders) {
      return pendingRequests.current.orders;
    }

    setLoading(prev => ({ ...prev, orders: true }));
    
    const request = api.get('/orders')
      .then(response => {
        const data = response.data || [];
        setCache(prev => ({
          ...prev,
          orders: {
            data,
            timestamp: Date.now(),
            isStale: false,
          },
        }));
        setInitialLoading(prev => ({ ...prev, orders: false }));
        return data;
      })
      .finally(() => {
        pendingRequests.current.orders = null;
        setLoading(prev => ({ ...prev, orders: false }));
      });

    pendingRequests.current.orders = request;
    return request;
  }, [cache.orders, isCacheValid, isCacheStale]);

  const fetchPayments = useCallback(async (force: boolean = false): Promise<Payment[]> => {
    if (!force && isCacheValid(cache.payments, CACHE_TTL.payments)) {
      if (isCacheStale(cache.payments, STALE_TTL.payments) && !pendingRequests.current.payments) {
        fetchPayments(true).catch(console.error);
      }
      return cache.payments!.data;
    }

    if (pendingRequests.current.payments) {
      return pendingRequests.current.payments;
    }

    setLoading(prev => ({ ...prev, payments: true }));
    
    const request = api.get('/payments')
      .then(response => {
        const data = response.data || [];
        setCache(prev => ({
          ...prev,
          payments: {
            data,
            timestamp: Date.now(),
            isStale: false,
          },
        }));
        setInitialLoading(prev => ({ ...prev, payments: false }));
        return data;
      })
      .finally(() => {
        pendingRequests.current.payments = null;
        setLoading(prev => ({ ...prev, payments: false }));
      });

    pendingRequests.current.payments = request;
    return request;
  }, [cache.payments, isCacheValid, isCacheStale]);

  const fetchAll = useCallback(async (force: boolean = false): Promise<void> => {
    await Promise.all([
      fetchProducts(force),
      fetchOrders(force),
      fetchPayments(force),
    ]);
  }, [fetchProducts, fetchOrders, fetchPayments]);

  const invalidateProducts = useCallback(() => {
    setCache(prev => ({ ...prev, products: null }));
    setInitialLoading(prev => ({ ...prev, products: true }));
  }, []);

  const invalidateOrders = useCallback(() => {
    setCache(prev => ({ ...prev, orders: null }));
    setInitialLoading(prev => ({ ...prev, orders: true }));
  }, []);

  const invalidatePayments = useCallback(() => {
    setCache(prev => ({ ...prev, payments: null }));
    setInitialLoading(prev => ({ ...prev, payments: true }));
  }, []);

  const invalidateAll = useCallback(() => {
    setCache({ products: null, orders: null, payments: null });
    setInitialLoading({ products: true, orders: true, payments: true });
  }, []);

  const addProduct = useCallback((product: Product) => {
    setCache(prev => {
      if (!prev.products) return prev;
      return {
        ...prev,
        products: {
          ...prev.products,
          data: [product, ...prev.products.data],
        },
      };
    });
  }, []);

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setCache(prev => {
      if (!prev.products) return prev;
      return {
        ...prev,
        products: {
          ...prev.products,
          data: prev.products.data.map(p => 
            p.id === id ? { ...p, ...data } : p
          ),
        },
      };
    });
  }, []);

  const removeProduct = useCallback((id: string) => {
    setCache(prev => {
      if (!prev.products) return prev;
      return {
        ...prev,
        products: {
          ...prev.products,
          data: prev.products.data.filter(p => p.id !== id),
        },
      };
    });
  }, []);

  const updateOrder = useCallback((id: string, data: Partial<Order>) => {
    setCache(prev => {
      if (!prev.orders) return prev;
      return {
        ...prev,
        orders: {
          ...prev.orders,
          data: prev.orders.data.map(o => 
            o.id === id ? { ...o, ...data } : o
          ),
        },
      };
    });
  }, []);

  useEffect(() => {
    const backgroundRefresh = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts(true).catch(() => {});
        fetchOrders(true).catch(() => {});
        fetchPayments(true).catch(() => {});
      }
    };

    backgroundRefreshRef.current = window.setInterval(backgroundRefresh, BACKGROUND_REFRESH_INTERVAL);

    return () => {
      if (backgroundRefreshRef.current) {
        window.clearInterval(backgroundRefreshRef.current);
      }
    };
  }, [fetchProducts, fetchOrders, fetchPayments]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts().catch(() => {});
        fetchOrders().catch(() => {});
        fetchPayments().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchProducts, fetchOrders, fetchPayments]);

  const value: AdminCacheContextValue = {
    products: cache.products?.data || [],
    orders: cache.orders?.data || [],
    payments: cache.payments?.data || [],
    
    loading,
    initialLoading,
    
    lastUpdate: {
      products: cache.products ? new Date(cache.products.timestamp) : null,
      orders: cache.orders ? new Date(cache.orders.timestamp) : null,
      payments: cache.payments ? new Date(cache.payments.timestamp) : null,
    },

    fetchProducts,
    fetchOrders,
    fetchPayments,
    fetchAll,
    invalidateProducts,
    invalidateOrders,
    invalidatePayments,
    invalidateAll,
    addProduct,
    updateProduct,
    removeProduct,
    updateOrder,
  };

  return (
    <AdminCacheContext.Provider value={value}>
      {children}
    </AdminCacheContext.Provider>
  );
}

export function useAdminCache(): AdminCacheContextValue {
  const context = useContext(AdminCacheContext);
  if (!context) {
    throw new Error('useAdminCache deve ser usado dentro de AdminCacheProvider');
  }
  return context;
}

/**
 * Hook específico para produtos com fetch automático
 */
export function useProducts() {
  const { products, loading, initialLoading, fetchProducts, invalidateProducts, addProduct, updateProduct, removeProduct, lastUpdate } = useAdminCache();
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading: loading.products,
    initialLoading: initialLoading.products,
    refetch: () => fetchProducts(true),
    invalidate: invalidateProducts,
    addProduct,
    updateProduct,
    removeProduct,
    lastUpdate: lastUpdate.products,
  };
}

/**
 * Hook específico para pedidos com fetch automático
 */
export function useOrders() {
  const { orders, loading, initialLoading, fetchOrders, invalidateOrders, updateOrder, lastUpdate } = useAdminCache();
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading: loading.orders,
    initialLoading: initialLoading.orders,
    refetch: () => fetchOrders(true),
    invalidate: invalidateOrders,
    updateOrder,
    lastUpdate: lastUpdate.orders,
  };
}

/**
 * Hook específico para pagamentos com fetch automático
 */
export function usePayments() {
  const { payments, loading, initialLoading, fetchPayments, invalidatePayments, lastUpdate } = useAdminCache();
  
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    loading: loading.payments,
    initialLoading: initialLoading.payments,
    refetch: () => fetchPayments(true),
    invalidate: invalidatePayments,
    lastUpdate: lastUpdate.payments,
  };
}

/**
 * Hook para dashboard que precisa de products e orders
 */
export function useDashboardData() {
  const { products, orders, loading, initialLoading, fetchProducts, fetchOrders, lastUpdate } = useAdminCache();
  
  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  return {
    products,
    orders,
    loading: loading.products || loading.orders,
    initialLoading: initialLoading.products || initialLoading.orders,
    refetch: async () => {
      await Promise.all([fetchProducts(true), fetchOrders(true)]);
    },
    lastUpdate: {
      products: lastUpdate.products,
      orders: lastUpdate.orders,
    },
  };
}

/**
 * Hook para logs que precisa de orders e payments
 */
export function useLogsData() {
  const { orders, payments, loading, initialLoading, fetchOrders, fetchPayments, lastUpdate } = useAdminCache();
  
  useEffect(() => {
    fetchOrders();
    fetchPayments();
  }, [fetchOrders, fetchPayments]);

  return {
    orders,
    payments,
    loading: loading.orders || loading.payments,
    initialLoading: initialLoading.orders || initialLoading.payments,
    refetch: async () => {
      await Promise.all([fetchOrders(true), fetchPayments(true)]);
    },
    lastUpdate: {
      orders: lastUpdate.orders,
      payments: lastUpdate.payments,
    },
  };
}

export default AdminCacheContext;
