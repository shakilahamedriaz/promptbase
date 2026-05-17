import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export interface Prompt {
  id: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  use_count: number;
  quality_score?: number;
  description?: string;
  is_public?: boolean;
  price_credits?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePromptPayload {
  title: string;
  body: string;
  category: string;
  tags: string[];
  description?: string;
}

export type SortOption = "newest" | "popular" | "recent" | "alpha" | "most_used";

export interface UsePromptsOptions {
  search?: string;
  category?: string;
  sort?: SortOption;
  page?: number;
}

export function usePrompts(options: UsePromptsOptions = {}) {
  const { search = "", category = "", sort = "recent", page = 1 } = options;
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      if (category) params.append("category", category);
      params.append("sort", sort);
      params.append("page", String(page));
      params.append("per_page", "20");

      const response = await api.get(`/prompts?${params.toString()}`);
      setPrompts(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, category, sort, page]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const createPrompt = useCallback(async (payload: CreatePromptPayload) => {
    try {
      const response = await api.post("/prompts", payload);
      setPrompts((prev) => [response, ...prev]);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deletePrompt = useCallback(async (id: string) => {
    try {
      await api.delete(`/prompts/${id}`);
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updatePrompt = useCallback(async (id: string, payload: Partial<CreatePromptPayload>) => {
    try {
      const response = await api.patch(`/prompts/${id}`, payload);
      setPrompts((prev) => prev.map((p) => (p.id === id ? response : p)));
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    try {
      await api.post(`/marketplace/prompts/${id}/favorite`);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getVersions = useCallback(async (id: string) => {
    try {
      const response = await api.get(`/marketplace/prompts/${id}/variants`);
      return response;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    prompts,
    total,
    isLoading,
    error,
    fetchPrompts,
    createPrompt,
    deletePrompt,
    updatePrompt,
    toggleFavorite,
    getVersions,
  };
}
