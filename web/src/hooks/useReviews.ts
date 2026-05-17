import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export interface Review {
  id: string;
  prompt_id: string;
  user_id: string;
  title: string;
  content: string;
  rating: number;
  helpful_count: number;
  unhelpful_count: number;
  user_helpful?: boolean;
  created_at: string;
  author_name: string;
}

export function useReviews(promptId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/marketplace/prompts/${promptId}/reviews`);
      setReviews(response.data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [promptId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const createReview = useCallback(async (title: string, content: string, rating: number) => {
    try {
      const response = await api.post(`/marketplace/prompts/${promptId}/reviews`, {
        title,
        content,
        rating,
      });
      setReviews((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [promptId]);

  const voteHelpful = useCallback(async (reviewId: string, helpful: boolean) => {
    try {
      await api.post(`/reviews/${reviewId}/helpful`, { helpful });
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                helpful_count: helpful ? r.helpful_count + 1 : r.helpful_count,
                user_helpful: helpful,
              }
            : r
        )
      );
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  return { reviews, isLoading, error, createReview, voteHelpful, fetchReviews };
}
