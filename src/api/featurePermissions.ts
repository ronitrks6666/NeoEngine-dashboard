import { api } from './client';
import type {
  ManagerBundleFeature,
  MutualExclusionZone,
  WebOnlyFeature,
} from '@/lib/featurePermissionExclusions';

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

export type UnifiedSharedFeature = {
  id: string;
  label: string;
  zoneId: string;
  webKeys: string[];
};

export type FeaturePermissionsCatalogResponse = {
  catalog: CatalogSection[];
  unifiedSharedFeatures: UnifiedSharedFeature[];
  managerBundleFeatures: ManagerBundleFeature[];
  webOnlyFeatures: WebOnlyFeature[];
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
      unifiedSharedFeatures: d.unifiedSharedFeatures ?? [],
      managerBundleFeatures: d.managerBundleFeatures ?? [],
      webOnlyFeatures: d.webOnlyFeatures ?? [],
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
