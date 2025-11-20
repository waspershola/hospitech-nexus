import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TransferRoomModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  currentRoomId: string;
  currentRoomNumber: string;
}

// TRANSFER-ROOM-V1: Modal for transferring guest to different room
export function TransferRoomModal({
  open,
  onClose,
  bookingId,
  currentRoomId,
  currentRoomNumber,
}: TransferRoomModalProps) {
  const { tenantId } = useAuth();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newRoomId, setNewRoomId] = useState("");
  const [reason, setReason] = useState("");

  // Fetch available rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["available-rooms", tenantId],
    queryFn: async () => {
      console.log('[TransferRoomModal] TRANSFER-ROOM-V1: Fetching available rooms');
      const { data, error } = await supabase
        .from("rooms")
        .select("id, number, type, status")
        .eq("tenant_id", tenantId)
        .in("status", ["available", "cleaning"])
        .neq("id", currentRoomId)
        .order("number");

      if (error) throw error;
      return data;
    },
    enabled: open && !!tenantId,
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      console.log('[TransferRoomModal] TRANSFER-ROOM-V1: Calling transfer-room edge function', {
        bookingId,
        newRoomId,
        reason
      });

      const { data, error } = await supabase.functions.invoke("transfer-room", {
        body: {
          booking_id: bookingId,
          new_room_id: newRoomId,
          reason: reason || "Guest request",
          staff_id: user?.id,
        },
      });

      if (error) {
        console.error('[TransferRoomModal] TRANSFER-ROOM-V1: Edge function error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('[TransferRoomModal] TRANSFER-ROOM-V1: Transfer failed:', data);
        throw new Error(data?.error || "Transfer failed");
      }

      console.log('[TransferRoomModal] TRANSFER-ROOM-V1: Transfer successful:', data);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Room transferred successfully to ${data.data.new_room_number}`);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["booking-folio"] });
      setNewRoomId("");
      setReason("");
      onClose();
    },
    onError: (error: Error) => {
      console.error('[TransferRoomModal] TRANSFER-ROOM-V1: Mutation error:', error);
      toast.error(`Failed to transfer room: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId) {
      toast.error("Please select a target room");
      return;
    }
    transferMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Room</DialogTitle>
          <DialogDescription>
            Transfer guest from Room {currentRoomNumber} to a different room
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="current-room">Current Room</Label>
              <input
                id="current-room"
                type="text"
                value={`Room ${currentRoomNumber}`}
                disabled
                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-room">New Room *</Label>
              <Select value={newRoomId} onValueChange={setNewRoomId}>
                <SelectTrigger id="new-room">
                  <SelectValue placeholder="Select target room" />
                </SelectTrigger>
                <SelectContent>
                  {roomsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : rooms && rooms.length > 0 ? (
                    rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.number} - {room.type} ({room.status})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No available rooms
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Transfer Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Guest complaint, maintenance issue, upgrade..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={transferMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={transferMutation.isPending || !newRoomId}>
              {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
