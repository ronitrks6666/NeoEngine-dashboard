import { api } from './client';
import type { MutualExclusionZone } from '@/lib/featurePermissionExclusions';

export type CatalogItem = {
  key: string;
  label: string;
  description?: string;
  children?: CatalogItem[];
};

export type CatalogSection = {
  group: string;
  description?: string;
  items: CatalogItem[];
};

export type FeaturePermissionsCatalogResponse = {
  catalog: CatalogSection[];
  authAlwaysTrueKeys: string[];
  mutualExclusionZones: MutualExclusionZone[];
};

export const featurePermissionsApi = {
  getCatalog: async (): Promise<FeaturePermissionsCatalogResponse> => {
    const { data } = await api.get<{
      success: boolean;
      data: FeaturePermissionsCatalogResponse;
    }>('/employee/feature-permissions/catalog');
    const d = data.data;
    return {
      ...d,
      mutualExclusionZones: d.mutualExclusionZones ?? [],
    };
  },

  getForEmployee: async (employeeId: string) => {
    const { data } = await api.get<{
      success: boolean;
      data: { featurePermissions: Record<string, boolean>; overrides: Record<string, boolean> };
    }>(`/employee/staff/${employeeId}/feature-permissions`);
    return data.data;
  },

  update: async (employeeId: string, permissions: Record<string, boolean>) => {
    const { data } = await api.put<{
      success: boolean;
      message?: string;
      data: { featurePermissions: Record<string, boolean> };
    }>(`/employee/staff/${employeeId}/feature-permissions`, { permissions });
    return data;
  },
};
