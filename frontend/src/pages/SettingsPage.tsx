import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentProperty } from "../lib/useCurrentProperty";
import { roomsApi, authApi } from "../api/endpoints";
import type { StaffRole } from "../api/types";

const STAFF_ROLES: StaffRole[] = ["MANAGER", "FRONT_DESK", "HOUSEKEEPING", "ACCOUNTANT"];

export function SettingsPage() {
  const { propertyId, property } = useCurrentProperty();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [maxOccupancy, setMaxOccupancy] = useState("2");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("FRONT_DESK");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types", propertyId],
    queryFn: () => roomsApi.listRoomTypes(propertyId!).then((r) => r.data.roomTypes),
    enabled: !!propertyId
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms", propertyId],
    queryFn: () => roomsApi.listRooms(propertyId!).then((r) => r.data.rooms),
    enabled: !!propertyId
  });

  async function createRoomType() {
    if (!propertyId || !name || !baseRate) return;
    await roomsApi.createRoomType(propertyId, { name, baseRate: Number(baseRate), maxOccupancy: Number(maxOccupancy) });
    setName("");
    setBaseRate("");
    await queryClient.invalidateQueries({ queryKey: ["room-types", propertyId] });
  }

  async function createRoom() {
    if (!roomTypeId || !roomNumber) return;
    await roomsApi.createRoom({ roomTypeId, roomNumber });
    setRoomNumber("");
    await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
  }

  async function createStaffAccount() {
    if (!propertyId || !staffName || !staffEmail || !staffPassword) return;
    setStaffError(null);
    setStaffSuccess(null);
    try {
      await authApi.createStaff({
        fullName: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
        propertyId
      });
      setStaffSuccess(`Account created for ${staffName}.`);
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
    } catch (err: any) {
      setStaffError(err?.response?.data?.error?.message ?? "Could not create this staff account.");
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink-800">Settings</h1>
        <p className="text-sm text-ink-400">{property?.name}</p>
      </div>

      <section className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-800">Room types</h2>
        <div className="divide-y divide-ink-100">
          {roomTypes?.map((rt) => (
            <div key={rt.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-800">{rt.name}</span>
              <span className="text-ink-600">
                Rs {Number(rt.base_rate).toLocaleString()} / night &middot; sleeps {rt.max_occupancy}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 pt-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="col-span-2 rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <input
            value={baseRate}
            onChange={(e) => setBaseRate(e.target.value)}
            placeholder="Base rate"
            type="number"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <input
            value={maxOccupancy}
            onChange={(e) => setMaxOccupancy(e.target.value)}
            placeholder="Max occupancy"
            type="number"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
        </div>
        <button onClick={createRoomType} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Add room type
        </button>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-800">Rooms</h2>
        <div className="grid grid-cols-3 gap-2">
          {rooms?.map((room) => (
            <div key={room.id} className="rounded-md border border-ink-100 px-3 py-2 text-sm text-ink-800">
              {room.room_number} <span className="text-ink-400">({room.room_type_name})</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          >
            <option value="">Select room type…</option>
            {roomTypes?.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
          <input
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="Room number"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <button onClick={createRoom} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            Add room
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink-800">Staff accounts</h2>
        <p className="text-xs text-ink-400">
          New accounts are scoped to {property?.name ?? "this property"}. Passwords must be at least 8 characters.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Full name"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <select
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as StaffRole)}
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input
            value={staffEmail}
            onChange={(e) => setStaffEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
          <input
            value={staffPassword}
            onChange={(e) => setStaffPassword(e.target.value)}
            placeholder="Temporary password"
            type="password"
            className="rounded-md border border-ink-200 px-3 py-2 text-sm"
          />
        </div>
        {staffError && <p className="text-sm text-danger-600">{staffError}</p>}
        {staffSuccess && <p className="text-sm text-brand-800">{staffSuccess}</p>}
        <button
          onClick={createStaffAccount}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Create staff account
        </button>
      </section>
    </div>
  );
}
