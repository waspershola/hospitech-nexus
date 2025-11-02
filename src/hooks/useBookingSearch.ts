import { useMemo } from 'react';

export interface BookingFilters {
  status?: string;
  source?: string;
  organizationId?: string;
  roomType?: string;
  dateRange?: { start: Date; end: Date };
  amountRange?: { min: number; max: number };
}

export function useBookingSearch<T extends Record<string, any>>(
  bookings: T[],
  searchTerm: string,
  filters: BookingFilters
) {
  const filteredBookings = useMemo(() => {
    let result = bookings;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((booking) => {
        return (
          booking.guests?.name?.toLowerCase().includes(term) ||
          booking.guests?.phone?.toLowerCase().includes(term) ||
          booking.booking_reference?.toLowerCase().includes(term) ||
          booking.rooms?.number?.toString().includes(term)
        );
      });
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter((booking) => booking.status === filters.status);
    }

    // Source filter
    if (filters.source && filters.source !== 'all') {
      result = result.filter((booking) => booking.source === filters.source);
    }

    // Organization filter
    if (filters.organizationId) {
      result = result.filter((booking) => booking.organization_id === filters.organizationId);
    }

    // Room type filter
    if (filters.roomType) {
      result = result.filter((booking) => booking.rooms?.type === filters.roomType);
    }

    // Date range filter (check-in date)
    if (filters.dateRange) {
      result = result.filter((booking) => {
        const checkIn = new Date(booking.check_in);
        return (
          checkIn >= filters.dateRange!.start &&
          checkIn <= filters.dateRange!.end
        );
      });
    }

    // Amount range filter
    if (filters.amountRange) {
      result = result.filter((booking) => {
        const amount = booking.total_amount || 0;
        return (
          amount >= (filters.amountRange!.min || 0) &&
          amount <= (filters.amountRange!.max || Infinity)
        );
      });
    }

    return result;
  }, [bookings, searchTerm, filters]);

  return filteredBookings;
}
