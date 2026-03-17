import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletStore } from '@/stores/outletStore';
import { hierarchyApi } from '@/api/hierarchy';
import { employeeApi } from '@/api/employee';
import { getApiErrorMessage } from '@/api/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { GripVertical, Users, User, ClipboardList, UserCircle, X } from 'lucide-react';

interface HierarchyNode {
  _id: string;
  nodeType?: string;
  order?: number;
  ownerId?: { name: string };
  employeeId?: { name: string; _id?: string };
  parentRoleId?: { name: string };
  employeesInRole?: { _id: string; name: string }[];
  children?: HierarchyNode[];
  parentNodeId?: string;
}

/** Remove node from tree and return [modified tree, extracted node] */
function extractNode(nodes: HierarchyNode[], nodeId: string): [HierarchyNode[], HierarchyNode | null] {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]._id === nodeId) {
      const [extracted] = nodes.splice(i, 1);
      return [nodes, extracted];
    }
    if (nodes[i].children) {
      const [modified, found] = extractNode([...nodes[i].children!], nodeId);
      if (found) {
        nodes[i] = { ...nodes[i], children: modified };
        return [nodes, found];
      }
    }
  }
  return [nodes, null];
}

/** Move node to new parent. Returns new tree (immutable). */
function moveNodeInTree(tree: HierarchyNode[], nodeId: string, newParentId: string): HierarchyNode[] {
  const copy = JSON.parse(JSON.stringify(tree)) as HierarchyNode[];
  const [afterRemove, node] = extractNode(copy, nodeId);
  if (!node) return tree;

  const addToParent = (nodes: HierarchyNode[]): HierarchyNode[] =>
    nodes.map((n) => {
      if (n._id === newParentId) {
        return { ...n, children: [...(n.children ?? []), node] };
      }
      if (n.children) return { ...n, children: addToParent(n.children) };
      return n;
    });
  return addToParent(afterRemove);
}

/** Add employee as child of target. Returns new tree. */
function addEmployeeToTree(tree: HierarchyNode[], parentId: string, employeeId: string, employeeName: string): HierarchyNode[] {
  const newNode: HierarchyNode = {
    _id: `temp-${employeeId}-${Date.now()}`,
    nodeType: 'employee',
    employeeId: { _id: employeeId, name: employeeName },
    children: [],
  };
  const addToParent = (nodes: HierarchyNode[]): HierarchyNode[] =>
    nodes.map((n) => {
      if (n._id === parentId) {
        return { ...n, children: [...(n.children ?? []), newNode] };
      }
      if (n.children) return { ...n, children: addToParent(n.children) };
      return n;
    });
  return addToParent(JSON.parse(JSON.stringify(tree)));
}

function DraggableNode({
  node,
  onAddChild,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRoleEmployeeDragStart,
  onRoleEmployeeDragEnd,
  depth = 0,
  draggedId,
  draggedEmployeeId,
  dropTargetId,
}: {
  node: HierarchyNode;
  onAddChild: (parentId: string) => void;
  onDelete: (nodeId: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent, targetId: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent, targetId: string) => void;
  onDragEnd?: () => void;
  onRoleEmployeeDragStart?: (employeeId: string) => void;
  onRoleEmployeeDragEnd?: () => void;
  depth?: number;
  draggedId?: string | null;
  draggedEmployeeId?: string | null;
  dropTargetId?: string | null;
}) {
  const isDragging = draggedId === node._id;
  const [expanded, setExpanded] = useState(true);
  const isDropTarget = dropTargetId === node._id;
  const label =
    node.nodeType === 'owner'
      ? node.ownerId?.name ?? 'Owner'
      : node.nodeType === 'employee'
        ? node.employeeId?.name ?? 'Employee'
        : node.nodeType === 'role'
          ? node.parentRoleId?.name ?? 'Role'
          : 'Node';

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const hasRoleUsers = node.nodeType === 'role' && node.employeesInRole && node.employeesInRole.length > 0;
  const isRoot = node.nodeType === 'owner';

  const typeColors = {
    owner: 'from-emerald-600 to-emerald-700',
    role: 'from-amber-500 to-amber-600',
    employee: 'from-emerald-500 to-emerald-600',
  };
  const typeColor = typeColors[node.nodeType as keyof typeof typeColors] ?? 'from-emerald-500 to-emerald-600';

  return (
    <div className="ml-4" style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div
        draggable={!isRoot}
        onDragStart={(e) => {
          if (!isRoot) {
            e.dataTransfer.setData('nodeId', node._id);
            e.dataTransfer.effectAllowed = 'move';
            onDragStart?.(node._id);
          }
        }}
        onDragOver={(e) => onDragOver?.(e, node._id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop?.(e, node._id)}
        onDragEnd={onDragEnd}
        className={`group rounded-xl border overflow-hidden mb-2 transition-opacity ${
          node.nodeType === 'owner' ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200' : 'bg-white border-emerald-100 hover:border-emerald-300'
        } ${isDragging ? 'opacity-50' : ''} ${!isRoot ? 'cursor-grab active:cursor-grabbing' : ''} ${isDropTarget ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}`}
      >
        <div className="flex items-center gap-3 p-4">
          {!isRoot && (
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-grab">
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
          >
            {(hasChildren || hasRoleUsers) ? (expanded ? '▼' : '▶') : '•'}
          </button>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeColor} flex items-center justify-center text-white shrink-0`}>
            {node.nodeType === 'owner' ? <User className="h-5 w-5" /> : node.nodeType === 'role' ? <ClipboardList className="h-5 w-5" /> : <UserCircle className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{label}</p>
            <p className="text-xs text-gray-500 capitalize">{node.nodeType}</p>
            {node.nodeType === 'role' && hasRoleUsers && (
              <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {node.employeesInRole!.length} user{node.employeesInRole!.length !== 1 ? 's' : ''} — click arrow to expand
              </p>
            )}
          </div>
          {!isRoot && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onAddChild(node._id)} className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600" title="Add child">+</button>
              <button onClick={() => onDelete(node._id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600" title="Remove">🗑️</button>
            </div>
          )}
        </div>
      </div>
      {expanded && hasRoleUsers && node.nodeType === 'role' && (
        <div className="ml-6 pl-4 border-l-2 border-emerald-200 mb-2 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase mt-2">Users in this role — drag to add under another node</p>
          {node.employeesInRole!.map((emp) => (
            <div
              key={emp._id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('employeeId', emp._id);
                e.dataTransfer.setData('employeeName', emp.name);
                e.dataTransfer.effectAllowed = 'move';
                onRoleEmployeeDragStart?.(emp._id);
              }}
              onDragEnd={onRoleEmployeeDragEnd}
              className="flex items-center gap-2 py-2 px-3 rounded-lg bg-emerald-50/80 border border-emerald-200 cursor-grab active:cursor-grabbing hover:border-emerald-400 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-gray-900">{emp.name}</span>
            </div>
          ))}
        </div>
      )}
      {expanded && hasChildren && (
        <div className="border-l-2 border-emerald-200 ml-6 pl-2">
          {node.children!.map((child) => (
            <DraggableNode
              key={child._id}
              node={child}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onRoleEmployeeDragStart={onRoleEmployeeDragStart}
              onRoleEmployeeDragEnd={onRoleEmployeeDragEnd}
              depth={depth + 1}
              draggedId={draggedId}
              draggedEmployeeId={draggedEmployeeId}
              dropTargetId={dropTargetId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyPage() {
  const { selectedOutletId } = useOutletStore();
  const [showAdd, setShowAdd] = useState<{ parentNodeId: string } | null>(null);
  const [addType, setAddType] = useState<'employee' | 'role'>('role');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['hierarchy', selectedOutletId],
    queryFn: () => hierarchyApi.getTree(selectedOutletId!),
    enabled: !!selectedOutletId,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['my-employees', selectedOutletId],
    queryFn: () => employeeApi.getMyEmployees({ outletId: selectedOutletId ?? undefined, limit: 100 }),
    enabled: !!selectedOutletId && !!showAdd,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['parent-roles'],
    queryFn: () => employeeApi.getParentRoles(),
    enabled: !!showAdd && addType === 'role',
  });

  const updateMutation = useMutation({
    mutationFn: ({ nodeId, parentNodeId, order }: { nodeId: string; parentNodeId?: string; order?: number }) =>
      hierarchyApi.updateNode(nodeId, { parentNodeId, order }),
    onMutate: async ({ nodeId, parentNodeId }) => {
      await queryClient.cancelQueries({ queryKey: ['hierarchy', selectedOutletId] });
      const prev = queryClient.getQueryData<{ success: boolean; data: { hierarchy: HierarchyNode[] } }>(['hierarchy', selectedOutletId]);
      if (!prev?.data?.hierarchy) return { prev };
      const next = moveNodeInTree(JSON.parse(JSON.stringify(prev.data.hierarchy)), nodeId, parentNodeId!);
      queryClient.setQueryData(['hierarchy', selectedOutletId], { ...prev, data: { ...prev.data, hierarchy: next } });
      setDraggedId(null);
      setDropTargetId(null);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['hierarchy', selectedOutletId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', selectedOutletId] });
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      hierarchyApi.addNode(selectedOutletId!, {
        parentNodeId: showAdd!.parentNodeId,
        nodeType: addType,
        employeeId: addType === 'employee' ? selectedEmployeeId : undefined,
        parentRoleId: addType === 'role' ? selectedRoleId : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      setShowAdd(null);
      setSelectedEmployeeId('');
      setSelectedRoleId('');
    },
  });

  const addEmployeeMutation = useMutation({
    mutationFn: ({ parentNodeId, employeeId }: { parentNodeId: string; employeeId: string }) =>
      hierarchyApi.addNode(selectedOutletId!, {
        parentNodeId,
        nodeType: 'employee',
        employeeId,
      }),
    onMutate: async ({ parentNodeId, employeeId, employeeName }) => {
      await queryClient.cancelQueries({ queryKey: ['hierarchy', selectedOutletId] });
      const prev = queryClient.getQueryData<{ success: boolean; data: { hierarchy: HierarchyNode[] } }>(['hierarchy', selectedOutletId]);
      if (!prev?.data?.hierarchy) return { prev };
      const next = addEmployeeToTree(prev.data.hierarchy, parentNodeId, employeeId, employeeName);
      queryClient.setQueryData(['hierarchy', selectedOutletId], { ...prev, data: { ...prev.data, hierarchy: next } });
      setDraggedEmployeeId(null);
      setDropTargetId(null);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['hierarchy', selectedOutletId], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy', selectedOutletId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hierarchyApi.deleteNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      setConfirmDelete(null);
    },
  });

  const tree = (data?.data?.hierarchy ?? []) as HierarchyNode[];
  const employees = employeesData?.data?.employees ?? [];
  const parentRoles = rolesData?.data?.parentRoles ?? [];

  const findInTree = (nodes: HierarchyNode[], id: string): HierarchyNode | null => {
    for (const n of nodes) {
      if (n._id === id) return n;
      if (n.children) {
        const found = findInTree(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const isDescendant = (ancestorId: string, descendantId: string): boolean => {
    const node = findInTree(tree, ancestorId);
    if (!node?.children) return false;
    const walk = (n: HierarchyNode): boolean => {
      if (n._id === descendantId) return true;
      return (n.children ?? []).some(walk);
    };
    return node.children.some(walk);
  };

  const findParentAndSiblings = (nodes: HierarchyNode[], id: string): { parent: HierarchyNode | null; siblings: HierarchyNode[] } | null => {
    for (const n of nodes) {
      if (n.children) {
        const idx = n.children.findIndex((c) => c._id === id);
        if (idx >= 0) return { parent: n, siblings: n.children };
        const found = findParentAndSiblings(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggedId(nodeId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
    const isDraggingNode = !!draggedId;
    const isDraggingEmployee = !!draggedEmployeeId;
    if (isDraggingNode && draggedId !== targetId) setDropTargetId(targetId);
    if (isDraggingEmployee) setDropTargetId(targetId);
  };

  const handleDragLeave = () => setDropTargetId(null);

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetId(null);
    const nodeId = e.dataTransfer.getData('nodeId');
    const employeeId = e.dataTransfer.getData('employeeId');
    const targetNode = findInTree(tree, targetId);
    if (!targetNode) return;

    if (employeeId) {
      const employeeName = e.dataTransfer.getData('employeeName') || 'Employee';
      addEmployeeMutation.mutate({ parentNodeId: targetId, employeeId, employeeName });
      return;
    }

    if (!nodeId || nodeId === targetId) return;
    if (targetNode.nodeType === 'owner' && nodeId === targetId) return;
    if (isDescendant(nodeId, targetId)) return; // prevent cycle
    updateMutation.mutate({ nodeId, parentNodeId: targetId, order: 0 });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDraggedEmployeeId(null);
    setDropTargetId(null);
  };

  const getNodeLabel = (n: HierarchyNode) =>
    n.nodeType === 'owner' ? n.ownerId?.name ?? 'Owner' : n.nodeType === 'employee' ? n.employeeId?.name ?? 'Employee' : n.parentRoleId?.name ?? 'Role';

  if (!selectedOutletId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh]">
        <div className="text-center animate-fade-in">
          <p className="text-amber-600 text-lg">Select an outlet first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-emerald-900">Hierarchy</h1>
          {(updateMutation.isPending || addEmployeeMutation.isPending) && (
            <span className="text-xs text-emerald-600 font-medium animate-pulse">Saving…</span>
          )}
        </div>
        <p className="text-emerald-700 mt-0.5 font-medium">Drag nodes to reorder. Click a role to see users. Click + to add.</p>
      </div>

      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : tree.length > 0 ? (
        <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm">
          <div
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            {tree.map((node) => (
              <DraggableNode
                key={node._id}
                node={node}
                onAddChild={(parentId) => setShowAdd({ parentNodeId: parentId })}
                onDelete={(id) => {
                  const n = findInTree(tree, id);
                  setConfirmDelete({ id, label: n ? getNodeLabel(n) : 'Node' });
                }}
                onDragStart={setDraggedId}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onRoleEmployeeDragStart={setDraggedEmployeeId}
                onRoleEmployeeDragEnd={handleDragEnd}
                draggedId={draggedId}
                draggedEmployeeId={draggedEmployeeId}
                dropTargetId={dropTargetId}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-6xl mb-4 opacity-30">🌳</div>
          <p className="text-gray-500">No hierarchy. One will be created when you add nodes.</p>
        </div>
      )}

      {(updateMutation.isError || addEmployeeMutation.isError) && (
        <p className="mt-2 text-red-600 text-sm">
          {getApiErrorMessage(updateMutation.error ?? addEmployeeMutation.error)}
        </p>
      )}

      {/* Add node modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 animate-slide-up relative">
            <div className="p-6 border-b border-gray-100 pr-12">
              <h2 className="text-xl font-semibold text-gray-900">Add to hierarchy</h2>
              <p className="text-sm text-gray-500 mt-0.5">Add a role or employee under the selected node</p>
            </div>
            <button type="button" onClick={() => setShowAdd(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="flex gap-2">
                  {(['role', 'employee'] as const).map((t) => (
                    <button key={t} onClick={() => setAddType(t)} className={`flex-1 px-4 py-2.5 rounded-xl font-medium capitalize ${addType === t ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {addType === 'role' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <option value="">Select role</option>
                    {parentRoles.map((r: { _id: string; name: string }) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {addType === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500">
                    <option value="">Select employee</option>
                    {employees.map((e: { _id: string; name: string }) => (
                      <option key={e._id} value={e._id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {addMutation.isError && <p className="text-red-600 text-sm">{getApiErrorMessage(addMutation.error)}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || (addType === 'role' ? !selectedRoleId : !selectedEmployeeId)} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50">
                  Add
                </button>
                <button onClick={() => setShowAdd(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-slide-up relative">
            <button type="button" onClick={() => setConfirmDelete(null)} className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" aria-label="Close"><X className="h-5 w-5" /></button>
            <p className="text-gray-900 font-medium pr-8">Remove &quot;{confirmDelete.label}&quot;?</p>
            <p className="text-sm text-gray-500 mt-1">Child nodes will move up to the parent.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => deleteMutation.mutate(confirmDelete.id)} disabled={deleteMutation.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50">
                Remove
              </button>
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
