import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.QA_OUTPUT ?? "test-results/glow";
await mkdir(out, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5181, strictPort: true },
});
await server.listen();
let browser;
const errors = [],
  results = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    args: [
      ...JSON.parse(process.env.CHROME_ARGS || "[]"),
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:5181/", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.setState({ hasSeenOnboarding: true, hasSeenTour: true });
    useAppStore.getState().loadDemoVenue();
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  const settled = () =>
    page.waitForFunction(() =>
      [
        ...document.querySelectorAll(
          '.glow-home-heading, .home-vitals, .glow-home-visual, .glow-home-recent, .home-actions, [data-testid="wizard-body-dsp"]',
        ),
      ].every((el) => Number(getComputedStyle(el).opacity) >= 0.99),
    );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const [name, path] of [
      ["inicio", "/"],
      ["plano-3d", "/stage-map"],
      ["dsp", "/dsp"],
    ]) {
      await page.goto("http://127.0.0.1:5181" + path, {
        waitUntil: "networkidle",
      });
      await expect(page.getByTestId("project-context")).toHaveCount(1);
      await settled();
      if (name === "dsp")
        await expect(page.getByTestId("project-view-dsp")).toHaveAttribute(
          "aria-current",
          "page",
        );
      await page.screenshot({
        path: `${out}/${name}-${width}.png`,
        fullPage: true,
      });
      await page.screenshot({ path: `${out}/${name}-${width}-viewport.png` });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} overflows ${width}`,
      );
      results.push({ name, width, horizontalOverflow: false });
    }
  }
  // Output selection must edit only the selected output and survive reload.
  const outputs = page
    .getByRole("navigation", { name: "Salidas del procesador" })
    .getByRole("button");
  await outputs.nth(1).click();
  await expect(outputs.nth(1)).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Ganancia (dB)", { exact: true }).fill("-3");
  await page.getByLabel("Ganancia (dB)", { exact: true }).press("Tab");
  await page.reload({ waitUntil: "networkidle" });
  await outputs.nth(1).click();
  await expect(page.getByLabel("Ganancia (dB)", { exact: true })).toHaveValue(
    "-3",
  );
  await outputs.nth(0).click();
  await expect(page.getByLabel("Ganancia (dB)", { exact: true })).toHaveValue(
    "0",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Salida DSP").selectOption({ index: 1 });
  await expect(page.getByLabel("Ganancia (dB)", { exact: true })).toHaveValue(
    "-3",
  );
  await page.getByText(/Ecualización paramétrica/).click();
  await page
    .getByRole("button", { name: "Añadir filtro", exact: true })
    .click();
  await expect(page.getByLabel("Frecuencia (Hz)", { exact: true })).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Quitar filtro 1", exact: true })
    .click();
  await expect(page.getByLabel("Frecuencia (Hz)", { exact: true })).toHaveCount(
    0,
  );

  // Position editing is shared by 2D and 3D; saving creates a clean revision.
  await page.goto("http://127.0.0.1:5181/stage-map", {
    waitUntil: "networkidle",
  });
  await page.getByTestId("stage-view-2d").click();
  await page.getByTestId("stage-equipment-select").selectOption({ index: 1 });
  await page.getByLabel("Altura del centro (m)", { exact: true }).fill("2.2");
  await page.getByLabel("Altura del centro (m)", { exact: true }).press("Tab");
  const layout = await page.evaluate(
    async () =>
      (await import("/src/store/app.ts")).useAppStore.getState().stageLayout,
  );
  assert(Object.values(layout).some((p) => p.heightM === 2.2));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${out}/plano-2d-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${out}/plano-2d-${width}-viewport.png` });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `2d inspector overflows ${width}`,
    );
    results.push({ name: "plano-2d", width, horizontalOverflow: false });
  }
  await page.getByTestId("stage-view-3d").click();
  await expect(
    page.getByLabel("Altura del centro (m)", { exact: true }),
  ).toHaveValue("2.20");
  await page.getByTestId("project-save").click();
  await expect(page.getByTestId("project-state")).toHaveText("Guardado");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("stage-equipment-select").selectOption({ index: 1 });
  await expect(
    page.getByLabel("Altura del centro (m)", { exact: true }),
  ).toHaveValue("2.20");
  await page.goto("http://127.0.0.1:5181/", { waitUntil: "networkidle" });
  await settled();
  await page.screenshot({
    path: `${out}/inicio-guardado-1440.png`,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/qa.json`,
    JSON.stringify(
      {
        screens: results,
        desktopAndMobileOutputSelection: true,
        gainPersistence: true,
        outputIsolation: true,
        eqEditing: true,
        placementPersistence: true,
        selectionAcrossViews: true,
        revisionSave: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "15 responsive views; DSP selection, isolated edits, persistence, EQ, 2D/3D height and revision save passed",
  );
} finally {
  await browser?.close();
  await server.close();
}
