/**
 * Priority Escalation System
 * Automatically escalates request priority based on time elapsed since creation
 */

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface EscalationRule {
  fromPriority: Priority;
  toPriority: Priority;
  hoursThreshold: number;
}

// Default escalation rules
const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  { fromPriority: 'low', toPriority: 'normal', hoursThreshold: 4 },
  { fromPriority: 'normal', toPriority: 'high', hoursThreshold: 2 },
  { fromPriority: 'high', toPriority: 'urgent', hoursThreshold: 1 },
];

/**
 * Calculate how many hours have elapsed since the request was created
 */
export const getHoursElapsed = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return diffMs / (1000 * 60 * 60); // Convert to hours
};

/**
 * Calculate the escalated priority based on time elapsed
 */
export const calculateEscalatedPriority = (
  originalPriority: Priority,
  createdAt: string,
  rules: EscalationRule[] = DEFAULT_ESCALATION_RULES
): Priority => {
  const hoursElapsed = getHoursElapsed(createdAt);
  
  // Find applicable escalation rules for the current priority
  const applicableRules = rules
    .filter(rule => rule.fromPriority === originalPriority)
    .sort((a, b) => b.hoursThreshold - a.hoursThreshold); // Sort by threshold descending

  // Check if any rule applies
  for (const rule of applicableRules) {
    if (hoursElapsed >= rule.hoursThreshold) {
      return rule.toPriority;
    }
  }

  // If already at highest priority or no rule applies, return original
  return originalPriority;
};

/**
 * Get priority badge color based on priority level
 */
export const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'normal':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

/**
 * Check if priority has been escalated
 */
export const isEscalated = (
  originalPriority: Priority,
  currentPriority: Priority
): boolean => {
  const priorityOrder: Priority[] = ['low', 'normal', 'high', 'urgent'];
  const originalIndex = priorityOrder.indexOf(originalPriority);
  const currentIndex = priorityOrder.indexOf(currentPriority);
  return currentIndex > originalIndex;
};

/**
 * Format escalation message
 */
export const getEscalationMessage = (
  originalPriority: Priority,
  escalatedPriority: Priority,
  hoursElapsed: number
): string => {
  const hours = Math.floor(hoursElapsed);
  const minutes = Math.floor((hoursElapsed - hours) * 60);
  
  return `Auto-escalated from ${originalPriority} to ${escalatedPriority} after ${hours}h ${minutes}m`;
};
