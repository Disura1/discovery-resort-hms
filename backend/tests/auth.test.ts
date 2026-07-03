import request from "supertest";
import { createApp } from "../src/app";
import { seedFixtures, closePool } from "./helpers";
import { redis } from "../src/config/redis";

const app = createApp();

let emails: Awaited<ReturnType<typeof seedFixtures>>["emails"];

beforeAll(async () => {
  ({ emails } = await seedFixtures("auth"));
});

afterAll(async () => {
  await closePool();
  redis.disconnect();
});

describe("POST /api/auth/login", () => {
  it("logs in successfully with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: emails.frontDesk, password: "FrontDesk123!" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.staff.role).toBe("FRONT_DESK");
  });

  it("rejects an incorrect password with a generic error", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: emails.frontDesk, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("rejects a non-existent email with the same generic error", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.local", password: "whatever123" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("rejects a malformed request body with a validation error", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });
});

describe("GET /api/auth/me", () => {
  it("rejects requests without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the authenticated user with a valid token", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: emails.frontDesk, password: "FrontDesk123!" });

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("FRONT_DESK");
  });
});
