import { describe, expect, it } from "vitest";
import { computeSplGrid } from "../spl-grid.ts";
import { sceneToSources } from "../system-vitals.ts";
import { venueSpeakers, coverageVertices } from "../../venue-visual.ts";
import type { RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";

const room: RoomScanInput = {
  name: "Test",
  width: 12,
  length: 24,
  height: 6,
  capacity: 200,
  ceilingType: "flat",
  wallMaterial: "brick",
  floorType: "wood",
  windowCount: 0,
};
const top: GearItem = {
  id: "test-top",
  model: "Top",
  brand: "Test",
  category: "tops",
  active: true,
  splMax: 130,
  quantity: 3,
  coverageH: 90,
  coverageV: 40,
};

describe("3D venue and acoustic coordinate contract", () => {
  it("places the illustrated arrays at the same sources used for coverage, preserving odd quantities", () => {
    const speakers = venueSpeakers(room, [top], [], []);
    const sources = sceneToSources(room, [top], []);
    expect(speakers.map((s) => [s.x, s.y, s.z])).toEqual(
      sources.map((s) => [s.x, s.y, s.z]),
    );
    expect(speakers.map((s) => s.count)).toEqual([2, 1]);
  });
  it("maps stage-side samples to negative Z without flipping or stretching the audience grid", () => {
    const grid = computeSplGrid(room, sceneToSources(room, [top], []), {
      cols: 4,
      rows: 5,
    });
    const vertices = coverageVertices(grid);
    expect(vertices[0]).toEqual({
      x: grid.bounds.xMin,
      z: grid.bounds.zMin,
      db: grid.cells[0],
    });
    expect(vertices.at(-1)).toEqual({
      x: grid.bounds.xMax,
      z: grid.bounds.zMax,
      db: grid.cells.at(-1),
    });
    expect(vertices[grid.cols].z).toBeGreaterThan(vertices[0].z);
    expect(vertices[grid.cols].x).toBe(vertices[0].x);
  });
  it("does not invent loudspeakers for an empty room", () => {
    expect(venueSpeakers(room, [], [], [])).toEqual([]);
  });
});
