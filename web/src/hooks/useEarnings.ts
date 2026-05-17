import { useState, useEffect, useCallback } from "react";
import { api } from "@/api/client";

export interface EarningsSummary {
  total_revenue: number;
  this_month: number;
  this_week: number;
  avg_price: number;
}

export interface TopPrompt {
  id: string;
  title: string;
  revenue: number;
  sales_count: number;
}

export interface Payout {
  id: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

export function useEarnings() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [topPrompts, setTopPrompts] = useState<TopPrompt[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, topRes, payoutRes] = await Promise.all([
        api.get("/creator/earnings/summary"),
        api.get("/creator/earnings/top-prompts"),
        api.get("/creator/payouts"),
      ]);

      setSummary(summaryRes.data);
      setTopPrompts(topRes.data.items || []);
      setPayouts(payoutRes.data.items || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  return { summary, topPrompts, payouts, isLoading, error };
}
