// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
describe("cloud boundaries", () => {
  it("rejects anonymous workspace access", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.workspaces.list)).rejects.toThrow("Sesión");
  });
  it("requires membership and prevents viewers from changing permissions or publishing", async () => {
    const t = convexTest(schema, modules),
      owner = t.withIdentity({
        subject: "owner",
        issuer: "https://identity.test",
      }),
      viewer = t.withIdentity({
        subject: "viewer",
        issuer: "https://identity.test",
      });
    const id = await owner.mutation(api.workspaces.create, { name: "Private" });
    await expect(
      viewer.query(api.workspaces.revisions, { workspaceId: id }),
    ).rejects.toThrow("permiso");
    const who = await viewer.query(api.workspaces.whoami);
    await owner.mutation(api.workspaces.setMember, {
      workspaceId: id,
      memberIdentifier: who,
      role: "viewer",
    });
    expect(
      await viewer.query(api.workspaces.revisions, { workspaceId: id }),
    ).toEqual([]);
    await expect(
      viewer.mutation(api.workspaces.append, {
        workspaceId: id,
        clientId: "x",
        expectedHead: 0,
        data: "{}",
      }),
    ).rejects.toThrow("permiso");
    await expect(
      viewer.mutation(api.workspaces.setMember, {
        workspaceId: id,
        memberIdentifier: who,
        role: "editor",
      }),
    ).rejects.toThrow("permiso");
    await owner.mutation(api.workspaces.setMember, {
      workspaceId: id,
      memberIdentifier: who,
      role: "remove",
    });
    await expect(
      viewer.query(api.workspaces.revisions, { workspaceId: id }),
    ).rejects.toThrow("permiso");
  });
  it("enforces atomic per-user minute and daily quotas", async () => {
    const t = convexTest(schema, modules);
    for (let i = 0; i < 3; i++)
      expect(
        await t.mutation(internal.quotas.consume, { identity: "u", now: 1000 }),
      ).toBe(true);
    expect(
      await t.mutation(internal.quotas.consume, { identity: "u", now: 1000 }),
    ).toBe(false);
    expect(
      await t.mutation(internal.quotas.consume, { identity: "u", now: 61000 }),
    ).toBe(true);
  });
  it("registers preflight and rejects a foreign origin and unauthenticated POST", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://soundmap.test");
    const t = convexTest(schema, modules);
    expect(
      (
        await t.fetch("/advisor-stream", {
          method: "OPTIONS",
          headers: { Origin: "https://soundmap.test" },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await t.fetch("/advisor-stream", {
          method: "OPTIONS",
          headers: { Origin: "https://evil.test" },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await t.fetch("/advisor-stream", {
          method: "POST",
          headers: { Origin: "https://soundmap.test" },
          body: "{}",
        })
      ).status,
    ).toBe(401);
    vi.unstubAllEnvs();
  });
  it("does not allow ordinary users to moderate catalog claims", async () => {
    const t = convexTest(schema, modules).withIdentity({ subject: "normal" });
    await expect(t.query(api.catalog.pending)).rejects.toThrow("moderación");
  });
});

it("keeps published revisions immutable, idempotent and rejects stale heads", async () => {
  const t = convexTest(schema, modules).withIdentity({ subject: "owner" });
  const id = await t.mutation(api.workspaces.create, { name: "Audit" });
  const data = JSON.stringify({
    id: "scene1",
    name: "Room",
    createdAt: "2026-10-05",
    room: {
      name: "Room",
      length: 10,
      width: 10,
      height: 3,
      capacity: 20,
      windowCount: 0,
      ceilingType: "flat",
      wallMaterial: "wood",
      floorType: "wood",
    },
    acoustics: {},
    tops: [],
    subs: [],
    monitors: [],
    dspUnits: [],
    amps: [],
    mixers: [],
    mics: [],
  });
  const args = { workspaceId: id, expectedHead: 0, clientId: "rev1", data };
  expect(await t.mutation(api.workspaces.append, args)).toBe(1);
  expect(await t.mutation(api.workspaces.append, args)).toBe(1);
  await expect(
    t.mutation(api.workspaces.append, {
      ...args,
      data: data.replace("Room", "Changed"),
    }),
  ).rejects.toThrow("inmutable");
  await expect(
    t.mutation(api.workspaces.append, { ...args, clientId: "rev2" }),
  ).rejects.toThrow("Conflicto");
  expect(
    await t.query(api.workspaces.revisions, { workspaceId: id }),
  ).toHaveLength(1);
});
