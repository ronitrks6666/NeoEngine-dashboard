import { api } from './client';

export const hierarchyApi = {
  getTree: async (outletId: string) => {
    const { data } = await api.get(`/hierarchy/${outletId}`);
    return data;
  },

  addNode: async (
    outletId: string,
    payload: {
      parentNodeId?: string;
      nodeType: 'employee' | 'role' | 'active_role';
      employeeId?: string;
      parentRoleId?: string;
      activeRoleId?: string;
    }
  ) => {
    const { data } = await api.post(`/hierarchy/${outletId}/nodes`, payload);
    return data;
  },

  updateNode: async (nodeId: string, payload: { parentNodeId?: string; order?: number }) => {
    const { data } = await api.put(`/hierarchy/nodes/${nodeId}`, payload);
    return data;
  },

  deleteNode: async (nodeId: string) => {
    const { data } = await api.delete(`/hierarchy/nodes/${nodeId}`);
    return data;
  },
};
