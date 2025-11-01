import { useState, useMemo } from 'react';

export interface GuestFilters {
  status?: string;
  organization?: string;
  source?: string;
  tags?: string[];
  dateRange?: { start: Date; end: Date };
}

export function useGuestSearch<T extends Record<string, any>>(
  guests: T[],
  searchTerm: string,
  filters: GuestFilters
) {
  const filteredGuests = useMemo(() => {
    let result = guests;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((guest) => {
        return (
          guest.name?.toLowerCase().includes(term) ||
          guest.email?.toLowerCase().includes(term) ||
          guest.phone?.toLowerCase().includes(term) ||
          guest.id_number?.toLowerCase().includes(term)
        );
      });
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter((guest) => guest.status === filters.status);
    }

    // Organization filter
    if (filters.organization) {
      result = result.filter((guest) => guest.organization_id === filters.organization);
    }

    // Source filter
    if (filters.source && filters.source !== 'all') {
      result = result.filter((guest) => guest.source === filters.source);
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter((guest) => {
        const guestTags = guest.tags || [];
        return filters.tags!.some(tag => guestTags.includes(tag));
      });
    }

    // Date range filter
    if (filters.dateRange) {
      result = result.filter((guest) => {
        const createdAt = new Date(guest.created_at);
        return (
          createdAt >= filters.dateRange!.start &&
          createdAt <= filters.dateRange!.end
        );
      });
    }

    return result;
  }, [guests, searchTerm, filters]);

  return filteredGuests;
}
