import { taskApi } from '@/api/task';
import type { DuplicateToOutletTarget } from '@/components/DuplicateToOutletModal';

export type DuplicateAssignment = {
  targetOutletId: string;
  assignToType: 'role' | 'staff';
  roleIds: string[];
  staffIds: string[];
  isShared: boolean;
};

async function duplicateOneItem(item: DuplicateToOutletTarget, assignment: DuplicateAssignment) {
  const { targetOutletId, assignToType, roleIds, staffIds, isShared } = assignment;

  if (item.kind === 'task') {
    if (assignToType === 'staff') {
      if (isShared && staffIds.length > 1) {
        await taskApi.duplicateTemplateToOutlet(item.id, {
          targetOutletId,
          assignToType: 'staff',
          assignToEmployeeId: staffIds[0],
          assignToEmployeeIds: staffIds,
          isCollaborative: true,
        });
        return;
      }
      for (const assignToEmployeeId of staffIds) {
        await taskApi.duplicateTemplateToOutlet(item.id, {
          targetOutletId,
          assignToType: 'staff',
          assignToEmployeeId,
        });
      }
      return;
    }
    if (isShared) {
      await taskApi.duplicateTemplateToOutlet(item.id, {
        targetOutletId,
        assignToType: 'role',
        parentRoleId: roleIds[0],
        assignToRoleId: roleIds[0],
        isCollaborative: true,
        collaboratorRoleIds: roleIds,
      });
      return;
    }
    for (const parentRoleId of roleIds) {
      await taskApi.duplicateTemplateToOutlet(item.id, {
        targetOutletId,
        assignToType: 'role',
        parentRoleId,
        assignToRoleId: parentRoleId,
      });
    }
    return;
  }

  if (assignToType === 'staff') {
    await taskApi.duplicateSopToOutlet(item.id, {
      targetOutletId,
      assignToType: 'staff',
      assignedEmployeeIds: staffIds,
      assignToEmployeeId: staffIds.length === 1 ? staffIds[0] : undefined,
      isCollaborative: isShared && staffIds.length > 1,
    });
    return;
  }
  if (isShared) {
    await taskApi.duplicateSopToOutlet(item.id, {
      targetOutletId,
      assignToType: 'role',
      parentRoleId: roleIds[0],
      isCollaborative: true,
      collaboratorRoleIds: roleIds,
    });
    return;
  }
  for (const parentRoleId of roleIds) {
    await taskApi.duplicateSopToOutlet(item.id, {
      targetOutletId,
      assignToType: 'role',
      parentRoleId,
    });
  }
}

export async function duplicateItemsToOutlet(
  items: DuplicateToOutletTarget[],
  assignment: DuplicateAssignment
) {
  for (const item of items) {
    await duplicateOneItem(item, assignment);
  }
}
