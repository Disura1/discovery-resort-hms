import request from "supertest";
import { createApp } from "../src/app";
import { seedFixtures, closePool } from "./helpers";
import { redis } from "../src/config/redis";


const app = createApp();

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

async function loginGuest(email: string, fullName = "Test Guest") {
  const res = await request(app)
    .post("/api/guest-auth/register")
    .send({ email, fullName, password: "GuestPass123!" });

  return { accessToken: res.body.accessToken as string,
     guestId: res.body.guest.id as string
     };
}
afterAll(async () => {
  await closePool();

  if (redis && typeof redis.quit === "function") {
    await redis.quit();
  } else if (redis && typeof redis.disconnect === "function") {
    await redis.disconnect();
  }
});

function afterAll(arg0: () => Promise<void>) {
  return arg0();
}
