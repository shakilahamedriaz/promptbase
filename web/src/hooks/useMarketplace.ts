import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export interface MarketplacePrompt {
  id: string;
  title: string;
  body: string;
  description?: string;
  category: string;
  tags: string[];
  quality_score?: number;
  is_public: boolean;
  fork_of_id?: string;
  use_count: number;
  fork_count: number;
  avg_rating: number;
  rating_count: number;
  price_credits?: number;
  author_name: string;
  author_id: string;
  created_at: string;
}

export type SortOption = "newest" | "popular" | "rating";

export interface MarketplaceFilters {
  category?: string;
  tags?: string[];
  q?: string;
  sort?: SortOption;
  page?: number;
  per_page?: number;
  min_quality?: number;
  min_rating?: number;
  min_use_count?: number;
}

export function useMarketplace(filters: MarketplaceFilters = {}) {
  const [prompts, setPrompts] = useState<MarketplacePrompt[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== "All") params.append("category", filters.category);
      if (filters.q) params.append("q", filters.q);
      if (filters.sort) params.append("sort", filters.sort);
      if (filters.page) params.append("page", String(filters.page));
      if (filters.per_page) params.append("per_page", String(filters.per_page));
      
      const response = await api.get(`/marketplace/prompts?${params.toString()}`);
      setPrompts(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const forkPrompt = useCallback(async (id: string) => {
    try {
      const response = await api.post(`/marketplace/prompts/${id}/fork`);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const ratePrompt = useCallback(async (id: string, score: number) => {
    try {
      const response = await api.post(`/marketplace/prompts/${id}/rate`, { score });
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const favoritePrompt = useCallback(async (id: string) => {
    try {
      await api.post(`/marketplace/prompts/${id}/favorite`);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const unfavoritePrompt = useCallback(async (id: string) => {
    try {
      await api.delete(`/marketplace/prompts/${id}/favorite`);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const checkFavorited = useCallback(async (id: string) => {
    try {
      const response = await api.get(`/marketplace/prompts/${id}/is-favorited`);
      return response.data.is_favorited;
    } catch {
      return false;
    }
  }, []);

  return {
    prompts,
    total,
    isLoading,
    error,
    fetchPrompts,
    forkPrompt,
    ratePrompt,
    favoritePrompt,
    unfavoritePrompt,
    checkFavorited,
  };
}
