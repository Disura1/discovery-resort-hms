import request from "supertest";
import { createApp } from "../src/app";
import { seedFixtures, closePool } from "./helpers";
import { redis } from "../src/config/redis";

const app = createApp();

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;
let frontDeskToken: string;
let housekeepingToken: string;

beforeAll(async () => {
  fixtures = await seedFixtures("reservations");

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: fixtures.emails.frontDesk, password: "FrontDesk123!" });
  frontDeskToken = login.body.accessToken;

  const hkLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: fixtures.emails.housekeeping, password: "Housekeep123!" });
  housekeepingToken = hkLogin.body.accessToken;
});

afterAll(async () => {
  await closePool();
  redis.disconnect();
});

describe("Reservation lifecycle", () => {
  const checkIn = "2027-01-10T14:00:00Z";
  const checkOut = "2027-01-12T11:00:00Z";
  let reservationId: string;
  let folioId: string;

  it("creates a reservation and an accompanying folio with room charges", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${frontDeskToken}`)
      .send({
        propertyId: fixtures.propertyId,
        roomId: fixtures.roomId,
        checkIn,
        checkOut,
        guest: { fullName: "Test Guest", email: "guest@test.local" }
      });

    expect(res.status).toBe(201);
    expect(res.body.reservation.status).toBe("CONFIRMED");
    expect(res.body.folio.balance).toBe("0.00");
    reservationId = res.body.reservation.id;
    folioId = res.body.folio.id;
  });

  it("rejects an overlapping booking on the same room with 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${frontDeskToken}`)
      .send({
        propertyId: fixtures.propertyId,
        roomId: fixtures.roomId,
        checkIn: "2027-01-11T14:00:00Z",
        checkOut: "2027-01-13T11:00:00Z",
        guest: { fullName: "Another Guest" }
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("allows a non-overlapping booking on the same room after the first checks out", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${frontDeskToken}`)
      .send({
        propertyId: fixtures.propertyId,
        roomId: fixtures.roomId,
        checkIn: "2027-01-12T14:00:00Z", // starts exactly when the first one ends
        checkOut: "2027-01-14T11:00:00Z",
        guest: { fullName: "Third Guest" }
      });

    expect(res.status).toBe(201);
  });

  it("checks in the first reservation and populates the folio with room charges", async () => {
    const checkinRes = await request(app)
      .post(`/api/reservations/${reservationId}/checkin`)
      .set("Authorization", `Bearer ${frontDeskToken}`);
    expect(checkinRes.status).toBe(200);
    expect(checkinRes.body.reservation.status).toBe("CHECKED_IN");

    const folioRes = await request(app).get(`/api/folios/${folioId}`).set("Authorization", `Bearer ${frontDeskToken}`);
    expect(folioRes.status).toBe(200);
    expect(folioRes.body.lineItems).toHaveLength(2); // 2 nights
    expect(folioRes.body.folio.balance).toBe("20000.00"); // 2 x 10000
  });

  it("blocks checkout while the folio has an outstanding balance", async () => {
    const res = await request(app)
      .post(`/api/reservations/${reservationId}/checkout`)
      .set("Authorization", `Bearer ${frontDeskToken}`);
    expect(res.status).toBe(409);
    expect(res.body.error.details.balance).toBe("20000.00");
  });

  it("allows checkout once the balance is fully paid", async () => {
    const payRes = await request(app)
      .post(`/api/folios/${folioId}/payments`)
      .set("Authorization", `Bearer ${frontDeskToken}`)
      .send({ method: "CASH", amount: 20000, idempotencyKey: "test-idem-key-1" });
    expect(payRes.status).toBe(201);

    const checkoutRes = await request(app)
      .post(`/api/reservations/${reservationId}/checkout`)
      .set("Authorization", `Bearer ${frontDeskToken}`);
    expect(checkoutRes.status).toBe(200);
    expect(checkoutRes.body.reservation.status).toBe("CHECKED_OUT");
  });

  it("does not create a duplicate payment when the same idempotency key is resent", async () => {
    const res = await request(app)
      .post(`/api/folios/${folioId}/payments`)
      .set("Authorization", `Bearer ${frontDeskToken}`)
      .send({ method: "CASH", amount: 20000, idempotencyKey: "test-idem-key-1" });

    const paymentsRes = await request(app).get(`/api/folios/${folioId}`).set("Authorization", `Bearer ${frontDeskToken}`);
    expect(paymentsRes.body.payments).toHaveLength(1);
    expect(res.status).toBe(201); // returns the existing payment, not an error
  });
});

describe("Role-based access control", () => {
  it("forbids a Housekeeping account from creating a room type", async () => {
    const res = await request(app)
      .post(`/api/properties/${fixtures.propertyId}/room-types`)
      .set("Authorization", `Bearer ${housekeepingToken}`)
      .send({ name: "Suite", baseRate: 30000, maxOccupancy: 3 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows a Housekeeping account to update room status", async () => {
    const res = await request(app)
      .patch(`/api/rooms/${fixtures.roomId}/status`)
      .set("Authorization", `Bearer ${housekeepingToken}`)
      .send({ status: "INSPECTED" });

    expect(res.status).toBe(200);
    expect(res.body.room.status).toBe("INSPECTED");
  });

  it("rejects requests with no token at all", async () => {
    const res = await request(app).get(`/api/reservations?propertyId=${fixtures.propertyId}`);
    expect(res.status).toBe(401);
  });
});
