import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";

const DEFAULT_PARAMS = {
  page: 1,
  limit: 50,
  sortBy: "timestamp",
  sortOrder: "desc",
  search: "",
  severity: "",
  status: "",
  role: "",
  region: "",
  resourceType: "",
  action: "",
  actor: "",
  from: "",
  to: "",
};

const EMPTY = { data: [], pagination: null };

export function useLogs() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const fetchLogs = useCallback(async (p) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getLogs(p);
      // null = empty/no-content response, treat as zero results
      setData(result ?? EMPTY);
    } catch (err) {
      setError(err.message);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchLogs(params), 300);
    return () => clearTimeout(debounceRef.current);
  }, [params, fetchLogs]);

  const setFilter = useCallback((key, value) => {
    setParams((p) => ({ ...p, [key]: value, page: 1 }));
  }, []);

  const setSort = useCallback((sortBy, sortOrder) => {
    setParams((p) => ({ ...p, sortBy, sortOrder, page: 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setParams((p) => ({ ...p, page }));
  }, []);

  const resetFilters = useCallback(() => {
    setParams(DEFAULT_PARAMS);
  }, []);

  const refresh = useCallback(() => fetchLogs(params), [fetchLogs, params]);

  return {
    logs: data.data ?? [],
    pagination: data.pagination ?? null,
    params,
    loading,
    error,
    setFilter,
    setSort,
    setPage,
    resetFilters,
    refresh,
  };
}
