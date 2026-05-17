import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export interface CreatorProfile {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  follower_count: number;
  following_count: number;
  prompt_count: number;
  avg_rating: number;
  is_following: boolean;
}

export function useCreator(userId: string | null) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCreator = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/creators/${userId}`);
      setProfile(response.data);
      
      const promptsResponse = await api.get(`/creators/${userId}/prompts`);
      setPrompts(promptsResponse.data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCreator();
  }, [fetchCreator]);

  const toggleFollow = useCallback(async () => {
    if (!userId || !profile) return;
    
    try {
      if (profile.is_following) {
        await api.post(`/users/${userId}/unfollow`);
      } else {
        await api.post(`/users/${userId}/follow`);
      }
      setProfile((prev) => prev ? { ...prev, is_following: !prev.is_following } : null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [userId, profile]);

  return { profile, prompts, isLoading, error, toggleFollow };
}
