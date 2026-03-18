import { api } from './client';

export interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface TrustStats {
  businesses: number;
  staffManaged: number;
  tasksCompleted?: number;
}

export interface UseCase {
  id: string;
  title: string;
  impact: string;
}

export interface ProductStep {
  step: number;
  title: string;
  description: string;
}

export interface LandingConfig {
  features: LandingFeature[];
  trustStats: TrustStats;
  useCases: UseCase[];
  productSteps: ProductStep[];
}

export async function fetchLandingConfig(): Promise<LandingConfig> {
  const { data } = await api.get<{ success: boolean; data: LandingConfig }>('/config/landing');
  if (!data.success || !data.data) throw new Error('Invalid config response');
  return data.data;
}
