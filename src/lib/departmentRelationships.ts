/**
 * Department Hierarchy and Relationships
 * Defines parent-child relationships between departments for smart navigation configuration
 */

export interface DepartmentRelationship {
  parent: boolean;
  children?: string[];
  parentDept?: string;
  description: string;
}

export const DEPARTMENT_RELATIONSHIPS: Record<string, DepartmentRelationship> = {
  food_beverage: {
    parent: true,
    children: ['kitchen', 'bar'],
    description: 'Supervisory department for all F&B operations (restaurant, kitchen, bar)',
  },
  kitchen: {
    parent: false,
    parentDept: 'food_beverage',
    description: 'Kitchen operations and food preparation',
  },
  bar: {
    parent: false,
    parentDept: 'food_beverage',
    description: 'Bar and beverage service',
  },
  front_office: {
    parent: true,
    description: 'Front desk, reception, and guest services',
  },
  housekeeping: {
    parent: true,
    description: 'Room cleaning and housekeeping operations',
  },
  maintenance: {
    parent: true,
    description: 'Repairs, maintenance, and facility management',
  },
  management: {
    parent: true,
    description: 'Executive, admin, and management oversight',
  },
  inventory: {
    parent: true,
    description: 'Store, inventory control, and procurement',
  },
  finance: {
    parent: true,
    description: 'Finance, accounting, and financial operations',
  },
  security: {
    parent: true,
    description: 'Security and safety operations',
  },
  spa: {
    parent: true,
    description: 'Spa and wellness services',
  },
  concierge: {
    parent: true,
    description: 'Concierge and guest experience services',
  },
  admin: {
    parent: true,
    description: 'Administrative support and operations',
  },
  hr: {
    parent: true,
    description: 'Human resources and staff management',
  },
};

/**
 * Get all related departments (parent + children) for a given department
 */
export function getRelatedDepartments(department: string): string[] {
  const related = new Set<string>([department]);
  
  const deptInfo = DEPARTMENT_RELATIONSHIPS[department];
  if (!deptInfo) return [department];
  
  // If it's a parent, include all children
  if (deptInfo.parent && deptInfo.children) {
    deptInfo.children.forEach(child => related.add(child));
  }
  
  // If it's a child, include the parent
  if (deptInfo.parentDept) {
    related.add(deptInfo.parentDept);
  }
  
  return Array.from(related);
}

/**
 * Suggest departments that should be included based on current selection
 */
export function suggestDepartments(selectedDepartments: string[]): {
  suggested: string[];
  warnings: string[];
} {
  const suggested = new Set<string>();
  const warnings: string[] = [];
  
  selectedDepartments.forEach(dept => {
    const deptInfo = DEPARTMENT_RELATIONSHIPS[dept];
    if (!deptInfo) return;
    
    // If child department is selected, suggest parent
    if (deptInfo.parentDept && !selectedDepartments.includes(deptInfo.parentDept)) {
      suggested.add(deptInfo.parentDept);
      const parentInfo = DEPARTMENT_RELATIONSHIPS[deptInfo.parentDept];
      warnings.push(
        `Consider adding "${parentInfo?.description || deptInfo.parentDept}" - supervisors in this department manage ${dept}`
      );
    }
  });
  
  return {
    suggested: Array.from(suggested),
    warnings,
  };
}

/**
 * Quick select presets for common department access patterns
 */
export const DEPARTMENT_PRESETS = {
  'All F&B Departments': ['food_beverage', 'kitchen', 'bar'],
  'All Operational': ['front_office', 'housekeeping', 'maintenance', 'food_beverage', 'kitchen', 'bar'],
  'Management Only': ['management'],
  'All Departments': Object.keys(DEPARTMENT_RELATIONSHIPS),
};
