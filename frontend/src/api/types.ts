export type StaffRole = "OWNER" | "MANAGER" | "FRONT_DESK" | "HOUSEKEEPING" | "ACCOUNTANT";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  propertyId: string | null;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  timezone: string;
  currency: string;
}

export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  base_rate: string;
  max_occupancy: number;
  is_active: boolean;
}

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "DIRTY" | "INSPECTED" | "OUT_OF_ORDER";

export interface Room {
  id: string;
  room_type_id: string;
  room_number: string;
  status: RoomStatus;
  room_type_name?: string;
  base_rate?: string;
}

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export interface Reservation {
  id: string;
  property_id: string;
  room_id: string;
  guest_id: string;
  rate_plan_id: string | null;
  check_in: string;
  check_out: string;
  status: ReservationStatus;
  guest_name?: string;
  room_number?: string;
  room_type_name?: string;
}

export interface Folio {
  id: string;
  reservation_id: string;
  balance: string;
  status: "OPEN" | "CLOSED";
}

export interface FolioLineItem {
  id: string;
  folio_id: string;
  description: string;
  amount: string;
  posted_by_name?: string;
  posted_at: string;
}

export interface Payment {
  id: string;
  folio_id: string;
  method: "CARD" | "CASH" | "BANK_TRANSFER";
  amount: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  created_at: string;
}

export interface AvailableRoom {
  room_id: string;
  room_number: string;
  room_type_id: string;
  room_type_name: string;
  base_rate: string;
  max_occupancy: number;
}
