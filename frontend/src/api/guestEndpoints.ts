import { guestApi } from "./guestClient";
import type { AvailableRoom, Reservation, Folio, FolioLineItem, Payment } from "./types";

export interface GuestProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

export interface GuestBooking extends Reservation {
  property_name: string;
}

export const guestAuthApi = {
  register: (fullName: string, email: string, password: string) =>
    guestApi.post<{ accessToken: string; guest: GuestProfile }>("/guest-auth/register", {
      fullName,
      email,
      password
    }),
  login: (email: string, password: string) =>
    guestApi.post<{ accessToken: string; guest: GuestProfile }>("/guest-auth/login", { email, password }),
  logout: () => guestApi.post("/guest-auth/logout"),
  me: () => guestApi.get<{ guest: GuestProfile }>("/guest/me")
};

export const guestPortalApi = {
  availability: (propertyId: string, checkIn: string, checkOut: string) =>
    guestApi.get<{ rooms: AvailableRoom[] }>("/availability", { params: { propertyId, checkIn, checkOut } }),

  createBooking: (input: { propertyId: string; roomId: string; ratePlanId?: string; checkIn: string; checkOut: string }) =>
    guestApi.post<{ reservation: Reservation; folio: Folio }>("/guest/bookings", input),

  myBookings: () => guestApi.get<{ bookings: GuestBooking[] }>("/guest/bookings"),

  bookingDetail: (reservationId: string) =>
    guestApi.get<{ reservation: Reservation; folio: Folio | null; lineItems: FolioLineItem[]; payments: Payment[] }>(
      `/guest/bookings/${reservationId}`
    ),

  cancelBooking: (reservationId: string) =>
    guestApi.post<{ reservation: Reservation }>(`/guest/bookings/${reservationId}/cancel`),

  downloadInvoice: (reservationId: string) =>
    guestApi.get(`/guest/bookings/${reservationId}/invoice`, { responseType: "blob" }),

  submitFeedback: (input: { reservationId?: string; propertyId?: string; rating: number; comment?: string }) =>
    guestApi.post("/guest/feedback", input)
};