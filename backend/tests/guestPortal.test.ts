import request from "supertest";
import { createApp } from "../src/app";
import { seedFixtures, closePool } from "./helpers";
import { redis } from "../src/config/redis";
import { guestAuthRepository } from "../src/modules/guestAuth/guestAuth.repository";

const app = createApp();

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

async function loginGuest(email: string, fullName = "Test Guest") {
  await guestAuthRepository.storeOtp(email, "123456");
  const res = await request(app).post("/api/guest-auth/verify-otp").send({ email, code: "123456", fullName });
  return { accessToken: res.body.accessToken as string, guestId: res.body.guest.id as string };
}

beforeAll(async () => {
  fixtures = await seedFixtures("guestportal");
});

afterAll(async () => {
  await closePool();
  redis.disconnect();
});

describe("Guest OTP login", () => {
  it("rejects an incorrect code", async () => {
    await guestAuthRepository.storeOtp("wrongcode@test.local", "111111");
    const res = await request(app)
      .post("/api/guest-auth/verify-otp")
      .send({ email: "wrongcode@test.local", code: "999999" });
    expect(res.status).toBe(400);
  });

  it("rejects a code with no pending OTP (expired/never requested)", async () => {
    const res = await request(app)
      .post("/api/guest-auth/verify-otp")
      .send({ email: "never-requested@test.local", code: "123456" });
    expect(res.status).toBe(400);
  });

  it("logs in successfully with the correct code and creates a guest record", async () => {
    const { accessToken, guestId } = await loginGuest("newguest@test.local", "New Guest");
    expect(accessToken).toBeDefined();
    expect(guestId).toBeDefined();
  });

  it("a guest access token is rejected on staff-only endpoints", async () => {
    const { accessToken } = await loginGuest("crosstest1@test.local");
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(401);
  });

  it("a staff access token is rejected on guest-only endpoints", async () => {
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: fixtures.emails.frontDesk, password: "FrontDesk123!" });
    const res = await request(app).get("/api/guest/me").set("Authorization", `Bearer ${staffLogin.body.accessToken}`);
    expect(res.status).toBe(401);
  });
});

describe("Guest booking ownership", () => {
  const checkIn = "2027-03-01T14:00:00Z";
  const checkOut = "2027-03-02T11:00:00Z";
  let guestAToken: string;
  let guestBToken: string;
  let reservationId: string;

  beforeAll(async () => {
    ({ accessToken: guestAToken } = await loginGuest("guestA@test.local", "Guest A"));
    ({ accessToken: guestBToken } = await loginGuest("guestB@test.local", "Guest B"));
  });

  it("lets a logged-in guest book a room, linked to their own guest id", async () => {
    const res = await request(app)
      .post("/api/guest/bookings")
      .set("Authorization", `Bearer ${guestAToken}`)
      .send({ propertyId: fixtures.propertyId, roomId: fixtures.roomId, checkIn, checkOut });

    expect(res.status).toBe(201);
    reservationId = res.body.reservation.id;
  });

  it("shows the booking in the owning guest's My Bookings list", async () => {
    const res = await request(app).get("/api/guest/bookings").set("Authorization", `Bearer ${guestAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.bookings.map((b: any) => b.id)).toContain(reservationId);
  });

  it("does not show the booking in a different guest's My Bookings list", async () => {
    const res = await request(app).get("/api/guest/bookings").set("Authorization", `Bearer ${guestBToken}`);
    expect(res.body.bookings.map((b: any) => b.id)).not.toContain(reservationId);
  });

  it("returns 404 (not 403) when a different guest requests the booking directly", async () => {
    const res = await request(app)
      .get(`/api/guest/bookings/${reservationId}`)
      .set("Authorization", `Bearer ${guestBToken}`);
    expect(res.status).toBe(404);
  });

  it("prevents a different guest from cancelling the booking", async () => {
    const res = await request(app)
      .post(`/api/guest/bookings/${reservationId}/cancel`)
      .set("Authorization", `Bearer ${guestBToken}`);
    expect(res.status).toBe(404);
  });

  it("prevents a different guest from downloading the invoice", async () => {
    const res = await request(app)
      .get(`/api/guest/bookings/${reservationId}/invoice`)
      .set("Authorization", `Bearer ${guestBToken}`);
    expect(res.status).toBe(404);
  });

  it("lets the owning guest download a PDF invoice", async () => {
    const res = await request(app)
      .get(`/api/guest/bookings/${reservationId}/invoice`)
      .set("Authorization", `Bearer ${guestAToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
  });

  it("lets the owning guest cancel their own booking, freeing the room", async () => {
    const cancelRes = await request(app)
      .post(`/api/guest/bookings/${reservationId}/cancel`)
      .set("Authorization", `Bearer ${guestAToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.reservation.status).toBe("CANCELLED");

    // Same room/dates should now be bookable again.
    const rebookRes = await request(app)
      .post("/api/guest/bookings")
      .set("Authorization", `Bearer ${guestBToken}`)
      .send({ propertyId: fixtures.propertyId, roomId: fixtures.roomId, checkIn, checkOut });
    expect(rebookRes.status).toBe(201);
  });

  it("prevents a different guest from attaching feedback to someone else's reservation", async () => {
    const res = await request(app)
      .post("/api/guest/feedback")
      .set("Authorization", `Bearer ${guestBToken}`)
      .send({ reservationId, rating: 5 });
    // reservationId here is Guest A's cancelled reservation, not Guest B's
    expect(res.status).toBe(404);
  });

  it("lets a guest submit feedback on their own reservation", async () => {
    const res = await request(app)
      .post("/api/guest/feedback")
      .set("Authorization", `Bearer ${guestAToken}`)
      .send({ reservationId, rating: 4, comment: "Great stay" });
    expect(res.status).toBe(201);
  });
});

describe("OTP request rate limiting", () => {
  it("blocks a second OTP request for the same email within the cooldown window", async () => {
    const email = "cooldown@test.local";
    const first = await request(app).post("/api/guest-auth/request-otp").send({ email });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/guest-auth/request-otp").send({ email });
    expect(second.status).toBe(429);
  });
});
