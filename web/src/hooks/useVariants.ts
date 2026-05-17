import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export interface Variant {
  id: string;
  title: string;
  author_name: string;
  created_at: string;
  use_count: number;
}

export interface VariantsData {
  is_original: boolean;
  original_id?: string;
  forks: Variant[];
}

export function useVariants(promptId: string) {
  const [variants, setVariants] = useState<VariantsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/marketplace/prompts/${promptId}/variants`);
      setVariants(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [promptId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  return { variants, isLoading, error };
}
