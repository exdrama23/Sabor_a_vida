import { useState, useEffect, useCallback, useRef } from 'react';

const CACHE_TTL_MS = 30 * 1000;

const REFRESH_INTERVAL_MS = 30 * 1000;

const CACHE_PREFIX = 'admin_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseAdminCacheResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

function readFromCache<T>(key: string): CacheEntry<T> | null {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    return entry;
  } catch (error) {
    console.warn(`[Cache] Erro ao ler cache para ${key}:`, error);
    return null;
  }
}

function writeToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`[Cache] Erro ao salvar cache para ${key}:`, error);
  }
}

function clearCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (error) {
    console.warn(`[Cache] Erro ao limpar cache para ${key}:`, error);
  }
}


export function useAdminCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  enabled: boolean = true
): UseAdminCacheResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const intervalRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  const fetchData = useCallback(async (silent: boolean = false) => {
    if (!enabled) return;

    if (!silent && isFirstLoadRef.current) {
      setLoading(true);
    }

    try {
      const result = await fetchFn();
      
      if (!isMountedRef.current) return;

      setData(result);
      setError(null);
      setLastUpdate(new Date());
      writeToCache(cacheKey, result);
      
      isFirstLoadRef.current = false;
    } catch (err) {
      if (!isMountedRef.current) return;

      console.error(`[Cache] Erro ao buscar dados para ${cacheKey}:`, err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));

    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, fetchFn, enabled]);

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const invalidateCache = useCallback(() => {
    clearCache(cacheKey);
    setData(null);
    setLastUpdate(null);
    isFirstLoadRef.current = true;
  }, [cacheKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    isMountedRef.current = true;
    const cached = readFromCache<T>(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp)) {
      setData(cached.data);
      setLastUpdate(new Date(cached.timestamp));
      setLoading(false);
      isFirstLoadRef.current = false;

      fetchData(true);
    } else {
      fetchData(false);
    }

    intervalRef.current = window.setInterval(() => {
      if (isMountedRef.current) {
        fetchData(true); 
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cacheKey, enabled, fetchData]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch,
    invalidateCache
  };
}


export function clearAllAdminCache(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[Cache] ${keysToRemove.length} entradas de cache removidas`);
  } catch (error) {
    console.warn('[Cache] Erro ao limpar todo o cache:', error);
  }
}

export default useAdminCache;
