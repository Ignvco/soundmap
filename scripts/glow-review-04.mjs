import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.QA_OUTPUT ?? "test-results/glow-04";
await mkdir(out, { recursive: true });
await rm(`${out}/qa.json`, { force: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5184, strictPort: true },
});
await server.listen();
let browser, page;
const errors = [],
  screens = [],
  checks = [];
const base = "http://127.0.0.1:5184";
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    args: [
      ...JSON.parse(process.env.CHROME_ARGS || "[]"),
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    locale: "es-CL",
    acceptDownloads: true,
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  const settled = () =>
    page.waitForFunction(() =>
      [...document.querySelectorAll('[data-testid^="wizard-body-"]')].every(
        (el) => Number(getComputedStyle(el).opacity) >= 0.99,
      ),
    );
  const goto = async (path) => {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await settled();
  };
  const snapshot = () =>
    page.evaluate(async () => {
      const s = (await import("/src/store/app.ts")).useAppStore.getState();
      const m = (
        await import("/src/lib/audio/capture-service.ts")
      ).captureService.getSnapshot();
      return {
        room: s.room,
        dsp: s.audit.dsp,
        stageLayout: s.stageLayout,
        measurements: s.audit.measurements,
        mic: m,
      };
    });
  const capture = async (name, width, selector) => {
    if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
    else await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert(!overflow, `${name}: desborda a ${width}px`);
    if (await page.getByTestId("project-context").count()) {
      assert(
        await page
          .getByRole("navigation", {
            name: "Vistas del proyecto",
            includeHidden: true,
          })
          .evaluate((nav) => {
            const active = nav
                .querySelector('[aria-current="page"]')
                ?.getBoundingClientRect(),
              box = nav.getBoundingClientRect();
            return (
              !!active &&
              active.left >= box.left - 1 &&
              active.right <= box.right + 1
            );
          }),
        `${name}: enlace activo fuera de vista`,
      );
    }
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      animations: "disabled",
    });
    screens.push({ name, width, horizontalOverflow: false });
  };
  const seed = () =>
    page.evaluate(async () => {
      const { useAppStore } = await import("/src/store/app.ts");
      useAppStore.setState({ hasSeenOnboarding: true, hasSeenTour: true });
      useAppStore.getState().loadDemoVenue();
      const s = useAppStore.getState();
      const layout = {
        "tops:jbl-srx906:0": { normX: 22, normY: 16, yawDeg: 12, heightM: 3 },
      };
      s.replaceSpeakerLayout(layout);
      const { generateDSPConfig } =
        await import("/src/lib/audio/dsp-engine.ts");
      const dsp = generateDSPConfig(
        s.room,
        s.acoustics,
        s.tops,
        s.subs,
        s.monitors,
        s.dspUnits[0],
        s.amps,
        layout,
      );
      dsp.outputs[0].gain = -7.5;
      dsp.outputs[0].delayMs = 4.3;
      s.updateAudit({ dsp });
      await (await import("/src/lib/persistence.ts")).flushPersistence();
    });
  await goto("/");
  await seed();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
    for (const [name, path] of [
      ["medicion", "/perform"],
      ["operacion", "/live"],
      ["foh", "/kiosk"],
      ["medicion-asistente", "/design?step=measurement"],
    ]) {
      await goto(path);
      await capture(name, width);
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await goto("/kiosk");
  await capture("foh-horizontal", 844);

  // The accepted DSP supplies the reference; virtual faders never write to it.
  await page.setViewportSize({ width: 390, height: 844 });
  const beforeFaders = await snapshot();
  const firstFader = page.getByTestId(
    `kiosk-fader-${beforeFaders.dsp.outputs[0].id.toLowerCase()}`,
  );
  await expect(firstFader.locator('input[type="range"]')).toHaveValue("-7.5");
  await firstFader.getByRole("slider").focus();
  await firstFader.getByRole("slider").press("ArrowUp");
  await expect(firstFader.getByRole("slider")).toHaveValue("-7");
  await firstFader.getByRole("button").click();
  await expect(firstFader.getByRole("button")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Salidas siguientes", exact: true })
    .click();
  await expect(
    page.getByTestId(
      `kiosk-fader-${beforeFaders.dsp.outputs.at(-1).id.toLowerCase()}`,
    ),
  ).toBeVisible();
  await capture("foh-ultimas-salidas", 390, ".foh-console");
  await page
    .getByRole("button", { name: "Salidas anteriores", exact: true })
    .click();
  await expect(firstFader.getByRole("slider")).toHaveValue("-7");
  await page
    .getByRole("button", {
      name: "Restablecer referencias de faders",
      exact: true,
    })
    .click();
  await expect(firstFader.getByRole("slider")).toHaveValue("-7.5");
  assert.deepEqual((await snapshot()).dsp, beforeFaders.dsp);
  assert.deepEqual((await snapshot()).stageLayout, beforeFaders.stageLayout);
  await expect(page.getByTestId("kiosk-mark-btn")).toBeDisabled();
  checks.push(
    "FOH usa DSP aceptado; teclado, silencio visual, paginación y reset no modifican DSP ni plano",
  );

  await goto("/live");
  const nav = page.getByRole("navigation", {
    name: "Procedimientos operativos",
  });
  const firstStep = page.getByRole("checkbox").first();
  const firstName = await firstStep.getAttribute("aria-label");
  await firstStep.focus();
  await firstStep.press("Space");
  await expect(firstStep).toBeChecked();
  await nav
    .getByRole("button", { name: "Prueba de línea", exact: true })
    .click();
  await page.getByRole("checkbox").first().check();
  await nav.getByRole("button", { name: "Arranque", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: firstName, exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Reiniciar lista actual", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: firstName, exact: true }),
  ).not.toBeChecked();
  await nav
    .getByRole("button", { name: "Prueba de línea", exact: true })
    .click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await expect(
    page.getByText("Lista marcada como completada.", { exact: false }),
  ).toBeVisible();
  await capture("lista-completada", 390, ".live-progress");
  for (const name of ["Respaldo", "Emergencia"]) {
    await nav.getByRole("button", { name, exact: true }).click();
    await capture(name.toLowerCase(), 390, ".live-protocol");
  }
  checks.push(
    "Checklists con teclado/tacto, progreso, conservación entre pestañas y reinicio aislado",
  );

  // Synthetic browser output only (Chromium is muted); verify player UI matches its engine.
  await page.getByTestId("test-signal-level").fill("-30");
  await page.getByTestId("test-signal-pink-noise").click();
  await expect(page.getByTestId("test-signal-level")).toBeDisabled();
  await page.getByTestId("test-signal-white-noise").click();
  await page.waitForTimeout(100);
  await expect(page.getByTestId("test-signal-white-noise")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  assert.equal(
    await page.evaluate(async () =>
      (await import("/src/lib/audio/test-signals.ts")).currentSignal(),
    ),
    "white-noise",
  );
  await capture("senales-activas", 390, ".glow-signals");
  await page.getByTestId("test-signal-stop").click();
  await expect(page.getByTestId("test-signal-level")).toBeEnabled();
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await import("/src/lib/audio/test-signals.ts")).isPlaying(),
      ),
    )
    .toBe(false);
  await page.getByTestId("test-signal-sine-1k").click();
  await page
    .getByRole("link", { name: "Abrir medición y sesiones", exact: false })
    .click();
  await expect(page).toHaveURL(base + "/perform");
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await import("/src/lib/audio/test-signals.ts")).isPlaying(),
      ),
    )
    .toBe(false);
  checks.push(
    "Generador: cambio rápido de señal, bloqueo de nivel durante reproducción y parada al salir",
  );

  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Blocked for QA", "NotAllowedError");
    };
  });
  await page.getByTestId("spl-toggle-btn").click();
  await expect(page.getByTestId("spl-error")).toContainText(
    "Permiso de micrófono bloqueado",
  );
  await expect(page.getByTestId("spl-value")).toHaveText("—");
  await expect(page.getByTestId("session-rec-btn")).toBeDisabled();
  await capture("microfono-bloqueado", 390, ".glow-meter");
  checks.push(
    "Permiso denegado: mensaje recuperable, sin lectura ficticia ni grabación habilitada",
  );

  // Install a real Web Audio oscillator-to-MediaStream fixture, never the host microphone.
  await page.evaluate(() => {
    window.__glowAudio = { contexts: [], calls: 0 };
    navigator.mediaDevices.getUserMedia = async () => {
      window.__glowAudio.calls++;
      const context = new AudioContext(),
        osc = context.createOscillator(),
        gain = context.createGain(),
        dest = context.createMediaStreamDestination();
      osc.frequency.value = 1000;
      gain.gain.value = 0.01;
      osc.connect(gain).connect(dest);
      osc.start();
      await context.resume();
      const track = dest.stream.getAudioTracks()[0],
        settings = track.getSettings.bind(track);
      track.getSettings = () => ({
        ...settings(),
        deviceId: "glow-04-fixture",
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
      });
      window.__glowAudio.contexts.push(context);
      return dest.stream;
    };
  });
  await page.getByTestId("spl-toggle-btn").click();
  await expect
    .poll(async () => (await snapshot()).mic.reading.timestamp)
    .toBeGreaterThan(0);
  await expect(page.getByTestId("spl-unit")).toHaveText("dBFS · A digital");
  assert(
    Math.abs(
      Number(await page.getByTestId("spl-value").textContent()) -
        (await snapshot()).mic.reading.dbfs,
    ) < 0.2,
  );
  await page.getByTestId("spl-calibrate-btn").click();
  await page
    .getByLabel("Nivel de referencia externo", { exact: true })
    .fill("10");
  await expect(page.getByTestId("spl-calib-apply")).toBeDisabled();
  await page.getByTestId("spl-calib-preset-94").click();
  await page.getByTestId("spl-calib-apply").click();
  await expect.poll(async () => (await snapshot()).mic.isCalibrated).toBe(true);
  await expect(
    page.getByText("Referencia aplicada", { exact: true }),
  ).toBeVisible();
  await capture("calibracion", 390);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("spl-calib-overlay")).toHaveCount(0);
  await expect(page.getByTestId("spl-calibrate-btn")).toBeFocused();
  await expect(page.getByTestId("spl-unit")).toHaveText("dB(A) estimado");
  await expect
    .poll(async () =>
      Math.abs(Number(await page.getByTestId("spl-value").textContent()) - 94),
    )
    .toBeLessThan(0.3);
  await capture("medicion-con-referencia", 390, ".glow-meter");
  checks.push(
    "Audio sintético atraviesa AudioWorklet: dBFS sin referencia, calibración validada a 94 dB y diálogo con foco/Escape",
  );

  await page.getByTestId("session-rec-btn").click();
  await page.waitForTimeout(550);
  await page.getByTestId("session-rec-btn").click();
  await expect(page.getByTestId("session-summary-overlay")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("session-export-json").click(),
  ]);
  await download.saveAs(`${out}/sesion-calibrada.json`);
  const exported = JSON.parse(
    await readFile(`${out}/sesion-calibrada.json`, "utf8"),
  );
  assert.equal(exported._meta.calibrated, true);
  assert.equal(exported._meta.referenceDb, 94);
  assert(exported.samples.length >= 2);
  assert(Math.abs(exported.summary.leq - 94) < 0.3);
  assert.equal((await snapshot()).measurements.length, 1);
  await capture("resumen-sesion", 390);
  await page.getByTestId("session-summary-close").click();
  await page.getByTestId("spl-calibrate-btn").click();
  await page.getByText("Ajuste manual del offset", { exact: true }).click();
  await page.getByLabel("Offset manual", { exact: true }).fill("80");
  assert.equal((await snapshot()).mic.isCalibrated, false);
  await page.getByTestId("spl-calib-close").click();
  await page.getByTestId("session-open-summary").click();
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("session-export-csv").click(),
  ]);
  await csvDownload.saveAs(`${out}/sesion-calibrada.csv`);
  const csv = await readFile(`${out}/sesion-calibrada.csv`, "utf8");
  assert(csv.includes("# Referencia declarada: 94 dB"));
  assert(csv.includes(`# Offset: ${exported._meta.calibrationOffsetDb} dB`));
  await page.getByTestId("session-summary-close").click();
  checks.push(
    "Registro al expediente, CSV/JSON y procedencia de la sesión conservada al cambiar el offset posterior",
  );

  // Navigation closes the recording but shares capture with FOH, without a second getUserMedia.
  await page.getByTestId("session-rec-btn").click();
  await page.waitForTimeout(350);
  const calls = await page.evaluate(() => window.__glowAudio.calls);
  await page.getByTestId("perform-goto-kiosk").click();
  await expect(page.getByTestId("kiosk-root")).toBeVisible();
  assert.equal((await snapshot()).mic.state, "running");
  assert.equal(await page.evaluate(() => window.__glowAudio.calls), calls);
  assert.equal((await snapshot()).measurements.length, 2);
  await expect(page.getByTestId("kiosk-unit")).toHaveText("dBFS · A digital");
  await page.getByTestId("kiosk-mark-btn").click();
  await expect(page.getByTestId("kiosk-marks")).toContainText(
    "dBFS · A digital",
  );
  await capture("foh-captura", 390);
  await page.getByTestId("kiosk-spl-toggle").click();
  await expect(page.getByTestId("kiosk-spl-value")).toHaveText("—");
  await expect(page.getByTestId("kiosk-mark-btn")).toBeDisabled();
  await page.getByTestId("kiosk-exit").click();
  await expect(page).toHaveURL(base + "/perform");
  await expect(page.getByTestId("perform-session-row")).toHaveCount(2);
  checks.push(
    "Cambiar a FOH cierra el registro y conserva una única captura; marcas con unidad correcta y salida directa a Medición",
  );

  await page.getByTestId("spl-toggle-btn").click();
  await expect
    .poll(async () => (await snapshot()).mic.reading.timestamp)
    .toBeGreaterThan(0);
  // The stored profile is restored by the existing capture service for the same device.
  assert.equal((await snapshot()).mic.isCalibrated, true);
  await page.getByTestId("session-rec-btn").click();
  await page.waitForTimeout(350);
  await page.evaluate(async () =>
    (
      await import("/src/lib/audio/capture-service.ts")
    ).captureService.interrupt("Interrupción sintética"),
  );
  await expect(page.getByTestId("session-summary-overlay")).toBeVisible();
  assert(
    (await snapshot()).measurements
      .at(-1)
      .interruptions.includes("Interrupción sintética"),
  );
  await page.getByTestId("session-summary-close").click();
  await expect(page.getByTestId("spl-error")).toContainText(
    "Interrupción sintética",
  );
  await capture("captura-interrumpida", 390, ".glow-meter");
  checks.push(
    "Reinicio recupera perfil del dispositivo; interrupción finaliza el registro y conserva su motivo",
  );
  await page.evaluate(async () => {
    for (const c of window.__glowAudio.contexts) await c.close();
  });

  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.setState({
      room: null,
      acoustics: null,
      tops: [],
      subs: [],
      monitors: [],
      dspUnits: [],
      amps: [],
    });
    useAppStore.getState().updateAudit({ dsp: undefined, measurements: [] });
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  for (const [name, path] of [
    ["medicion-sin-recinto", "/perform"],
    ["operacion-sin-recinto", "/live"],
    ["foh-sin-salidas", "/kiosk"],
  ]) {
    await goto(path);
    await capture(name, 390);
  }
  await seed();
  for (const [name, path] of [
    ["inicio", "/"],
    ["equipos", "/design?step=pa"],
    ["spl", "/spl-analysis"],
    ["expediente", "/audit"],
  ]) {
    await goto(path);
    await capture(`${name}-navegacion`, 390);
  }
  checks.push(
    "Estados sin recinto/salidas y navegación de las etapas anteriores",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/qa.json`,
    JSON.stringify(
      {
        screens,
        checks,
        errors,
        physicalAndroidTest: false,
        audioInput: "Oscilador sintético a 1 kHz; no micrófono físico",
      },
      null,
      2,
    ),
  );
  console.log(
    `${screens.length} vistas; ${checks.length} recorridos funcionales; sin errores JavaScript`,
  );
} catch (error) {
  await page
    ?.screenshot({ path: `${out}/fallo.png`, fullPage: true })
    .catch(() => {});
  await writeFile(
    `${out}/fallo.json`,
    JSON.stringify({ error: String(error), errors, screens, checks }, null, 2),
  );
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
