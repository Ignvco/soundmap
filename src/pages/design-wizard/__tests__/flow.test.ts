import { describe, expect, it } from "vitest";
import {
  WIZARD_STEPS,
  wizardBlocker,
  wizardCompletion,
  wizardProgress,
  type WizardProgressInput,
} from "../flow";
const empty: WizardProgressInput = {
  hasRoom: false,
  reviews: {},
  currentRevisionSaved: false,
};
describe("audit review flow", () => {
  it("allows a room-only report, without inventing PA", () =>
    expect(wizardBlocker("save", { ...empty, hasRoom: true })).toBeNull());
  it("does not count inventory or another saved scene as review evidence", () =>
    expect(wizardProgress({ ...empty, hasRoom: true })).toBe(0));
  it("requires justification for not applicable and verification", () =>
    expect(
      wizardCompletion({
        ...empty,
        hasRoom: true,
        reviews: { dsp: { state: "not-applicable", note: "" } },
      }).dsp,
    ).toBe(false));
  it("requires the CURRENT draft to be saved", () => {
    const reviews = Object.fromEntries(
      WIZARD_STEPS.map((s) => [
        s.id,
        { state: "verified" as const, note: "Evidence" },
      ]),
    );
    expect(
      wizardCompletion({ hasRoom: true, reviews, currentRevisionSaved: false })
        .save,
    ).toBe(false);
    expect(
      wizardProgress({ hasRoom: true, reviews, currentRevisionSaved: true }),
    ).toBe(1);
  });
});
