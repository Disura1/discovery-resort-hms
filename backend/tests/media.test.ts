import request from "supertest";
import { createApp } from "../src/app";
import { seedFixtures, closePool } from "./helpers";
import { redis } from "../src/config/redis";
import { pool } from "../src/config/db";

const app = createApp();
let fixtures: Awaited<ReturnType<typeof seedFixtures>>;
let managerToken: string;

beforeAll(async () => {
  fixtures = await seedFixtures("media");
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: fixtures.emails.manager, password: "ManagerPass123!" });
  managerToken = login.body.accessToken;
});

afterAll(async () => {
  await closePool();
  redis.disconnect();
});

describe("Media upload flow", () => {
  it("issues a presigned upload URL for an owned room type", async () => {
    const res = await request(app)
      .post("/api/media/uploads")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        entityType: "ROOM_TYPE",
        entityId: fixtures.roomTypeId,
        fileName: "room.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        isPublic: true
      });
    expect(res.status).toBe(201);
    expect(res.body.uploadUrl).toContain("http");
    expect(res.body.mediaId).toBeDefined();
  });

  it("rejects a file exceeding the size limit for its type", async () => {
    const res = await request(app)
      .post("/api/media/uploads")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        entityType: "ROOM_TYPE",
        entityId: fixtures.roomTypeId,
        fileName: "huge.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 50 * 1024 * 1024,
        isPublic: true
      });
    expect(res.status).toBe(400);
  });

  it("rejects an unsupported mime type", async () => {
    const res = await request(app)
      .post("/api/media/uploads")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        entityType: "ROOM_TYPE",
        entityId: fixtures.roomTypeId,
        fileName: "malware.exe",
        mimeType: "application/x-msdownload",
        sizeBytes: 1024,
        isPublic: true
      });
    expect(res.status).toBe(400);
  });

  it("blocks a manager from another property from uploading to this room type", async () => {
    const other = await seedFixtures("media-other");
    const otherLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: other.emails.manager, password: "ManagerPass123!" });

    const res = await request(app)
      .post("/api/media/uploads")
      .set("Authorization", `Bearer ${otherLogin.body.accessToken}`)
      .send({
        entityType: "ROOM_TYPE",
        entityId: fixtures.roomTypeId, // belongs to the FIRST property
        fileName: "room.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        isPublic: true
      });
    expect(res.status).toBe(403);
  });

  it("rejects confirming an upload that was never actually PUT to the bucket", async () => {
    const create = await request(app)
      .post("/api/media/uploads")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        entityType: "ROOM_TYPE",
        entityId: fixtures.roomTypeId,
        fileName: "never-uploaded.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        isPublic: true
      });

    const confirm = await request(app)
      .post("/api/media/uploads/confirm")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ mediaId: create.body.mediaId });

    expect(confirm.status).toBe(400);
  });
});