import { beforeEach, describe, expect, it, vi } from "vitest";
import { layoutSpeakers, layoutSources } from "../../speaker-layout.ts";
import {
  cameraPitch,
  ceilingHeight,
  floorDistance,
  validDimension,
} from "../../ar-measurement.ts";
import { calculateAcoustics, type RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";
import { sceneToSources } from "../system-vitals.ts";
import { venueSpeakers } from "../../venue-visual.ts";
import { computeSplGrid } from "../spl-grid.ts";

const data = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => data.get(k) ?? null,
  setItem: (k: string, v: string) => data.set(k, v),
  removeItem: (k: string) => data.delete(k),
});
vi.stubGlobal("window", { localStorage });
const { useAppStore: store } = await import("@/store/app.ts");
const room: RoomScanInput = {
  name: "Test",
  width: 12,
  length: 20,
  height: 5,
  capacity: 200,
  ceilingType: "flat",
  wallMaterial: "brick",
  floorType: "wood",
  windowCount: 0,
};
const top: GearItem = {
  id: "test",
  brand: "Test",
  model: "Top",
  category: "tops",
  active: true,
  quantity: 2,
  splMax: 130,
  coverageH: 90,
  coverageV: 40,
};
const id = "tops:test:0";
beforeEach(() => {
  store.getState().resetSystem();
  store.setState({ scenes: [] });
  data.clear();
});
function setup() {
  store.getState().applyRoomScan(room, calculateAcoustics(room));
  store.getState().setGear("tops", [top]);
}

describe("shared speaker placement", () => {
  it("keeps unit identity after reordering gear and increasing quantities", () => {
    const extra = { ...top, id: "other" },
      layout = { [id]: { normX: 70, normY: 55, heightM: 3.1 } };
    const a = layoutSpeakers(room, [top, extra], [], [], layout).find(
      (s) => s.id === id,
    );
    const b = layoutSpeakers(
      room,
      [extra, { ...top, quantity: 4 }],
      [],
      [],
      layout,
    ).find((s) => s.id === id);
    expect([a?.x, a?.y, a?.z]).toEqual([b?.x, b?.y, b?.z]);
    expect(b?.y).toBe(3.1);
  });
  it("updates 3D geometry and SPL sources from the same coordinates and height", () => {
    const layout = { [id]: { normX: 75, normY: 60, heightM: 3.3 } };
    const speakers = venueSpeakers(room, [top], [], [], layout);
    const sources = sceneToSources(room, [top], [], layout);
    expect(speakers.map((s) => [s.x, s.y, s.z])).toEqual(
      sources.map((s) => [s.x, s.y, s.z]),
    );
    expect(speakers[0].x).toBe(3);
    expect(speakers[0].y).toBe(3.3);
    expect(speakers[0].z).toBeCloseTo(2);
    expect(computeSplGrid(room, sources).cells).not.toEqual(
      computeSplGrid(room, sceneToSources(room, [top], [])).cells,
    );
  });
  it("supports every monitor and sub, clamps bounds, and suggests different heights", () => {
    const subs = [{ ...top, id: "sub", category: "subs" as const }],
      mons = [
        { ...top, id: "mon", category: "monitors" as const, quantity: 8 },
      ];
    const all = layoutSpeakers(room, [{ ...top, coverageV: 15 }], subs, mons, {
      [id]: { normX: 120, normY: -20, heightM: 100 },
      "monitors:mon:7": { normX: 20, normY: 40, heightM: 1.2 },
    });
    expect(all).toHaveLength(12);
    expect(all[0].x).toBe(6);
    expect(all[0].z).toBe(-10);
    expect(all[0].y).toBe(4.6);
    expect(all[0].cabinetType).toBe("line-array");
    expect(all[0].suggestedHeightM).toBe(3.6);
    expect(all.find((s) => s.id === "monitors:mon:7")?.y).toBe(1.2);
    expect(layoutSources(all)).toHaveLength(4);
  });
  it("persists through rehydration, saved-scene load and active-scene edits", async () => {
    setup();
    store.getState().updateSpeakerPlacement(id, { normX: 72, heightM: 3 });
    store.getState().saveScene("A");
    const scene = store.getState().scenes[0];
    store.getState().updateSpeakerPlacement(id, { normY: 62 });
    const expected = { normX: 72, normY: 62, heightM: 3 };
    expect(store.getState().scenes[0].stageLayout?.[id]).toEqual(expected);
    const persisted = data.get("soundmap-store")!;
    store.getState().resetSystem();
    data.set("soundmap-store", persisted);
    await store.persist.rehydrate();
    expect(store.getState().stageLayout[id]).toEqual(expected);
    store.getState().loadDemoVenue();
    expect(store.getState().stageLayout).toEqual({});
    store.getState().loadScene(scene.id);
    expect(store.getState().stageLayout[id]).toEqual(expected);
    store.getState().resetSpeakerLayout();
    expect(store.getState().scenes[0].stageLayout).toEqual({});
  });
  it("loads old v2 scenes without inheriting another room's positions", async () => {
    setup();
    store.getState().saveScene("Legacy");
    const { stageLayout: _, ...scene } = store.getState().scenes[0];
    data.set(
      "soundmap-store",
      JSON.stringify({
        version: 2,
        state: { scenes: [scene], room, tops: [top] },
      }),
    );
    await store.persist.rehydrate();
    expect(store.getState().stageLayout).toEqual({});
    store.getState().updateSpeakerPlacement(id, { heightM: 4 });
    store.getState().loadScene(scene.id);
    expect(store.getState().stageLayout).toEqual({});
  });
  it("keeps layout during room edits but clears it for a new project", () => {
    setup();
    store.getState().updateSpeakerPlacement(id, { normX: 55, heightM: 3 });
    store
      .getState()
      .applyRoomScan({ ...room, name: "Renamed" }, calculateAcoustics(room));
    expect(store.getState().stageLayout[id].heightM).toBe(3);
    store
      .getState()
      .applyRoomScan(room, calculateAcoustics(room), { resetGear: true });
    expect(store.getState().stageLayout).toEqual({});
  });
});
describe("AR measurements", () => {
  it("uses the rear camera ray for down, horizontal and up orientations", () => {
    expect(cameraPitch(60, 0)).toBeCloseTo(-30);
    expect(cameraPitch(90, 0)).toBeCloseTo(0);
    expect(cameraPitch(120, 0)).toBeCloseTo(30);
    expect(cameraPitch(0, 60)).toBeCloseTo(-30);
    expect(cameraPitch(null, 0)).toBeNull();
  });
  it("distinguishes floor distance from ceiling elevation with a known wall distance", () => {
    expect(floorDistance(1.5, -45)).toBeCloseTo(1.5);
    expect(ceilingHeight(1.5, 4, 45)).toBeCloseTo(5.5);
    expect(ceilingHeight(1.5, 0, 45)).toBeNull();
    expect(ceilingHeight(1.5, 4, -45)).toBeNull();
  });
  it("rejects stale/missing, singular and invalid measurements", () => {
    for (const p of [null, 0, -1, 45, -89, NaN])
      expect(floorDistance(1.5, p)).toBeNull();
    expect(validDimension("height", 0)).toBe(false);
    expect(validDimension("height", 100)).toBe(false);
    expect(validDimension("width", Infinity)).toBe(false);
    expect(validDimension("height", 3)).toBe(true);
  });
});
