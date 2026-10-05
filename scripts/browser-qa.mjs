import { chromium } from "@playwright/test";
import { createServer, preview } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const out = process.env.QA_OUTPUT ?? "test-results";
await mkdir(out, { recursive: true });
const dev = await createServer({
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
await dev.listen();
const prod = await preview({
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || undefined,
  args: [
    ...JSON.parse(process.env.CHROME_ARGS || "[]"),
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
const errors = [],
  results = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  const main = await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.setState({ hasSeenOnboarding: true, hasSeenTour: true });
    useAppStore.getState().loadDemoVenue();
    useAppStore.getState().saveRevision();
    await (await import("/src/lib/persistence.ts")).flushPersistence();
    return JSON.stringify({ version: 4, state: useAppStore.getState() });
  });
  if (!process.env.QA_PART || process.env.QA_PART === "interaction") {
    await page.goto("http://127.0.0.1:5173/stage-map", {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "Opciones del visor" }).click();
    await page
      .getByRole("button", { name: "Guardar cámara", exact: true })
      .click();
    assert(
      await page.evaluate(
        async () =>
          !!(await import("/src/store/app.ts")).useAppStore.getState().audit
            .savedView,
      ),
    );
    for (const name of ["Planta", "Frente", "Lateral", "Perspectiva"])
      await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByRole("button", { name: "Recuperar cámara", exact: true })
      .click();
    await page.getByRole("button", { name: "Plano", exact: true }).click();
    await page.locator('[aria-label^="Seleccionar "]').first().click();
    await page.getByLabel("Altura rápida (m)").fill("2.2");
    await page.getByLabel("Altura rápida (m)").press("Tab");
    const before = await page.evaluate(async () =>
      JSON.stringify(
        (await import("/src/store/app.ts")).useAppStore.getState().stageLayout,
      ),
    );
    assert(Object.values(JSON.parse(before)).some((p) => p.heightM === 2.2));
    await page.getByRole("button", { name: "Optimizar", exact: true }).click();
    await page
      .getByRole("button", { name: "Aplicar candidato #1", exact: true })
      .click({ timeout: 30000 });
    const applied = await page.evaluate(async () =>
      JSON.stringify(
        (await import("/src/store/app.ts")).useAppStore.getState().stageLayout,
      ),
    );
    assert.notEqual(applied, before);
    await page
      .getByRole("button", { name: "Deshacer optimización", exact: true })
      .click();
    assert.equal(
      await page.evaluate(async () =>
        JSON.stringify(
          (await import("/src/store/app.ts")).useAppStore.getState()
            .stageLayout,
        ),
      ),
      before,
    );
    await page.keyboard.press("Control+s");
    assert.equal(
      await page.evaluate(async () => {
        const m = await import("/src/store/app.ts");
        return m.hasUnsavedRevision(m.useAppStore.getState());
      }),
      false,
    );
    results.push({
      interaction:
        "3D views/camera, keyboard height, optimizer apply/undo, save shortcut",
      status: "pass",
    });
  }
  if (!["offline", "pdf", "interaction"].includes(process.env.QA_PART)) {
    const routes = [
      "/",
      "/audit",
      "/design?step=room",
      "/design?step=pa",
      "/design?step=dsp",
      "/design?step=patch",
      "/design?step=measurement",
      "/design?step=findings",
      "/design?step=save",
      "/stage-map",
      "/spl-analysis",
      "/acoustic-analysis",
      "/perform",
      "/pa",
      "/live",
      "/compare",
      "/settings",
      "/export",
      "/collaboration",
      "/community",
      "/toolkit",
    ];
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1000 : 844,
      });
      for (let i = 0; i < routes.length; i++) {
        await page.goto("http://127.0.0.1:5173" + routes[i], {
          waitUntil: "networkidle",
        });
        const state = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - innerWidth,
          heading: document.querySelector("h1")?.textContent,
          body: document.body.innerText.slice(0, 200),
        }));
        assert(!state.body.includes("Algo salió mal"), `Crash ${routes[i]}`);
        assert(
          state.overflow <= 1,
          `Overflow ${width} ${routes[i]}: ${state.overflow}`,
        );
        results.push({ width, route: routes[i], ...state });
        if ([1, 4, 9, 12, 17].includes(i) && width !== 390)
          await page.screenshot({
            path: `${out}/screen-${width}-${i}.png`,
            fullPage: true,
          });
      }
    }
    await page.goto("http://127.0.0.1:5173/audit", {
      waitUntil: "networkidle",
    });
    const capture = await page.evaluate(async () => {
      const { captureService: c } =
        await import("/src/lib/audio/capture-service.ts");
      const context = new AudioContext(),
        osc = context.createOscillator(),
        gain = context.createGain(),
        dest = context.createMediaStreamDestination();
      osc.frequency.value = 1000;
      gain.gain.value = 0.01;
      osc.connect(gain).connect(dest);
      osc.start();
      await context.resume();
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      navigator.mediaDevices.getUserMedia = async () => dest.stream;
      await c.start();
      await new Promise((r) => setTimeout(r, 500));
      const before = c.getSnapshot().reading.spl;
      c.calibrate(94);
      await new Promise((r) => setTimeout(r, 400));
      const after = c.getSnapshot();
      c.startMeasurement("Fixture sintética");
      await new Promise((r) => setTimeout(r, 350));
      c.interrupt("Interrupción sintética");
      navigator.mediaDevices.getUserMedia = original;
      await context.close();
      const m = (await import("/src/store/app.ts")).useAppStore
        .getState()
        .audit.measurements.at(-1);
      return {
        before,
        after: after.reading.spl,
        calibrated: after.isCalibrated,
        samples: m.samples.length,
        interruptions: m.interruptions,
      };
    });
    assert(capture.calibrated);
    assert(Math.abs(capture.after - 94) < 0.3, JSON.stringify(capture));
    assert(capture.samples >= 2);
    assert(capture.interruptions.length === 1);
    results.push({ capture });
    // Cancellation while a permission request is pending must release late streams.
    const late = await page.evaluate(async () => {
      const { captureService: c } =
        await import("/src/lib/audio/capture-service.ts");
      const original = navigator.mediaDevices.getUserMedia.bind(
        navigator.mediaDevices,
      );
      let stopped = false,
        release;
      navigator.mediaDevices.getUserMedia = () =>
        new Promise((r) => (release = r));
      const pending = c.start();
      c.stop();
      release({ getTracks: () => [{ stop: () => (stopped = true) }] });
      await pending;
      navigator.mediaDevices.getUserMedia = original;
      return { stopped, state: c.getSnapshot().state };
    });
    assert.deepEqual(late, { stopped: true, state: "idle" });
    results.push({ late });
  }
  if (!["offline", "interaction"].includes(process.env.QA_PART)) {
    // Immutable report DTOs and every supported inventory shape generate finite PDFs.
    for (const kind of ["demo", "tops-only", "subs-only", "room-only"]) {
      const pdf = await page.evaluate(async (kind) => {
        const { useAppStore } = await import("/src/store/app.ts");
        const { createReport } = await import("/src/lib/audit/report.ts");
        const { generateTechnicalPDF } = await import("/src/lib/pdf-export.ts");
        const s = useAppStore.getState();
        s.loadDemoVenue();
        s.updateAudit({
          technician: "Técnico Muñoz",
          client: "Auditoría Ñandú",
          objective: "Verificar coherencia de la revisión.",
          conclusion: "Estimaciones revisadas; pendiente validación física.",
        });
        if (kind === "tops-only" || kind === "room-only") s.setGear("subs", []);
        if (kind === "subs-only" || kind === "room-only") s.setGear("tops", []);
        if (kind === "room-only") s.setGear("monitors", []);
        if (kind === "demo") {
          const { generateDSPConfig } =
            await import("/src/lib/audio/dsp-engine.ts");
          const v = useAppStore.getState();
          s.updateAudit({
            dsp: generateDSPConfig(
              v.room,
              v.acoustics,
              v.tops,
              v.subs,
              v.monitors,
              v.dspUnits[0],
              v.amps,
              v.stageLayout,
            ),
            dspState: "edited",
            findings: [
              {
                id: "qa",
                title: "Ejemplo de hallazgo",
                evidence: "Fixture de QA, no medición real",
                action: "Contrastar en terreno",
                priority: "P1",
                state: "open",
              },
            ],
          });
        }
        s.saveRevision();
        const report = await createReport(useAppStore.getState()),
          doc = await generateTechnicalPDF(report, false),
          raw = doc.output("arraybuffer");
        let binary = "";
        for (const n of new Uint8Array(raw)) binary += String.fromCharCode(n);
        return {
          base64: btoa(binary),
          pages: doc.getNumberOfPages(),
          fingerprint: report.fingerprint,
        };
      }, kind);
      await writeFile(`${out}/${kind}.pdf`, Buffer.from(pdf.base64, "base64"));
      results.push({
        pdf: kind,
        pages: pdf.pages,
        fingerprint: pdf.fingerprint,
      });
    }
  }
  if (!["pdf", "interaction"].includes(process.env.QA_PART)) {
    // Cache all lazy routes on first installation; visit previously unopened routes offline.
    const offline = context;
    await page.setViewportSize({ width: 390, height: 844 });
    await offline.addInitScript(
      (value) => localStorage.setItem("soundmap-store", value),
      main,
    );
    const p = page;
    p.on("pageerror", (e) => errors.push(String(e)));
    await p.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    await p.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    await offline.setOffline(true);
    for (const route of [
      "/toolkit",
      "/audit",
      "/design?step=dsp",
      "/export",
      "/stage-map",
    ]) {
      await p.goto("http://127.0.0.1:4173" + route, {
        waitUntil: "networkidle",
      });
      assert(!(await p.locator("body").innerText()).includes("Algo salió mal"));
      results.push({ offline: route, status: "pass" });
    }
    await p.screenshot({ path: `${out}/offline-stage.png`, fullPage: true });
    await offline.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: results.length, errors }));
} finally {
  await writeFile(
    `${out}/browser-${process.env.QA_PART || "results"}.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
  await dev.close();
  await new Promise((r) => prod.httpServer.close(r));
}
