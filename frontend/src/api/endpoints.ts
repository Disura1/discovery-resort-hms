import { api } from "./client";
import type {
  AuthUser,
  Property,
  RoomType,
  Room,
  Reservation,
  Folio,
  FolioLineItem,
  Payment,
  AvailableRoom
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; staff: AuthUser }>("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get<{ user: { sub: string; role: string; propertyId: string | null } }>("/auth/me"),
  createStaff: (input: { fullName: string; email: string; password: string; role: string; propertyId: string | null }) =>
    api.post("/auth/staff", input)
};

export const propertiesApi = {
  list: () => api.get<{ properties: Property[] }>("/properties"),
  get: (id: string) => api.get<{ property: Property }>(`/properties/${id}`)
};

export const roomsApi = {
  availability: (propertyId: string, checkIn: string, checkOut: string) =>
    api.get<{ rooms: AvailableRoom[] }>("/availability", { params: { propertyId, checkIn, checkOut } }),
  listRoomTypes: (propertyId: string) =>
    api.get<{ roomTypes: RoomType[] }>(`/properties/${propertyId}/room-types`),
  createRoomType: (propertyId: string, input: { name: string; baseRate: number; maxOccupancy: number }) =>
    api.post(`/properties/${propertyId}/room-types`, input),
  listRooms: (propertyId: string) => api.get<{ rooms: Room[] }>(`/properties/${propertyId}/rooms`),
  createRoom: (input: { roomTypeId: string; roomNumber: string }) => api.post("/rooms", input),
  updateRoomStatus: (roomId: string, status: string) => api.patch(`/rooms/${roomId}/status`, { status })
};

export const guestsApi = {
  search: (q: string) => api.get(`/guests/search`, { params: { q } }),
  get: (id: string) => api.get(`/guests/${id}`)
};

export const reservationsApi = {
  list: (propertyId: string, filters: { from?: string; to?: string; status?: string } = {}) =>
    api.get<{ reservations: Reservation[] }>("/reservations", { params: { propertyId, ...filters } }),
  get: (id: string) => api.get<{ reservation: Reservation }>(`/reservations/${id}`),
  create: (input: Record<string, unknown>) => api.post<{ reservation: Reservation; folio: Folio }>("/reservations", input),
  checkIn: (id: string) => api.post<{ reservation: Reservation }>(`/reservations/${id}/checkin`),
  checkOut: (id: string) => api.post<{ reservation: Reservation }>(`/reservations/${id}/checkout`),
  cancel: (id: string, status: "CANCELLED" | "NO_SHOW") =>
    api.patch<{ reservation: Reservation }>(`/reservations/${id}/status`, { status })
};

export const foliosApi = {
  get: (id: string) => api.get<{ folio: Folio; lineItems: FolioLineItem[]; payments: Payment[] }>(`/folios/${id}`),
  getByReservation: (reservationId: string) => api.get<{ folio: Folio }>(`/folios/by-reservation/${reservationId}`),
  addLineItem: (id: string, input: { description: string; amount: number }) =>
    api.post(`/folios/${id}/items`, input),
  recordPayment: (id: string, input: { method: string; amount: number; idempotencyKey: string }) =>
    api.post(`/folios/${id}/payments`, input)
};

export const housekeepingApi = {
  board: (propertyId: string) => api.get<{ rooms: Room[] }>(`/housekeeping/properties/${propertyId}/board`)
};

export const reportsApi = {
  occupancy: (propertyId: string, from: string, to: string) =>
    api.get(`/reports/occupancy`, { params: { propertyId, from, to } }),
  revenue: (propertyId: string, from: string, to: string) =>
    api.get(`/reports/revenue`, { params: { propertyId, from, to } }),
  adrRevpar: (propertyId: string, from: string, to: string) =>
    api.get(`/reports/adr-revpar`, { params: { propertyId, from, to } })
};
