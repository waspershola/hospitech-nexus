import { format, isToday, isYesterday, startOfDay } from 'date-fns';

export interface RequestGroup {
  group: string;
  sortOrder: number;
  items: any[];
}

/**
 * Determines which date group a request belongs to
 * @param submittedAt - ISO timestamp of when request was submitted
 * @param isOverdue - Whether the request is overdue
 * @returns Group name: "Overdue", "Today", "Yesterday", or formatted date like "Nov 25"
 */
export function getRequestGroup(submittedAt: string, isOverdue: boolean): string {
  if (isOverdue) {
    return 'Overdue';
  }

  const date = new Date(submittedAt);

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'MMM d');
}

/**
 * Groups requests by date category and sorts them appropriately
 * @param requests - Array of requests to group
 * @param calculateOverdue - Function to determine if request is overdue
 * @returns Array of RequestGroup objects sorted by priority
 */
export function groupRequestsByDate(
  requests: any[],
  calculateOverdue: (request: any) => { isOverdue: boolean; minutesOverdue: number }
): RequestGroup[] {
  // Create groups map
  const groupsMap = new Map<string, any[]>();

  requests.forEach((request) => {
    const overdueInfo = calculateOverdue(request);
    const groupName = getRequestGroup(request.created_at, overdueInfo.isOverdue);

    if (!groupsMap.has(groupName)) {
      groupsMap.set(groupName, []);
    }
    groupsMap.get(groupName)!.push(request);
  });

  // Sort items within each group (newest first)
  groupsMap.forEach((items, groupName) => {
    items.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });

  // Convert to array and assign sort order
  const groups: RequestGroup[] = [];

  // Predefined group order
  const groupOrder = ['Overdue', 'Today', 'Yesterday'];

  // Add predefined groups first
  groupOrder.forEach((groupName, index) => {
    if (groupsMap.has(groupName)) {
      groups.push({
        group: groupName,
        sortOrder: index,
        items: groupsMap.get(groupName)!,
      });
      groupsMap.delete(groupName);
    }
  });

  // Add remaining date groups sorted by date (newest date first)
  const remainingGroups = Array.from(groupsMap.entries())
    .map(([group, items]) => ({
      group,
      sortOrder: 100, // Base sort order for date groups
      items,
      // Parse date for sorting
      dateValue: new Date(items[0].created_at),
    }))
    .sort((a, b) => b.dateValue.getTime() - a.dateValue.getTime())
    .map(({ group, sortOrder, items }, index) => ({
      group,
      sortOrder: sortOrder + index,
      items,
    }));

  groups.push(...remainingGroups);

  return groups;
}
