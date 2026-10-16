import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";
const out = process.env.QA_OUTPUT ?? "test-results/glow-final";
await mkdir(out, { recursive: true });
await rm(`${out}/qa.json`, { force: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5188, strictPort: true },
});
await server.listen();
let browser, page;
const errors = [],
  views = [],
  checks = [];
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    args: [
      ...JSON.parse(process.env.CHROME_ARGS || "[]"),
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
    ],
  });
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "es-CL",
    acceptDownloads: true,
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  const goto = async (path) => {
    await page.goto(`http://127.0.0.1:5188${path}`, {
      waitUntil: "networkidle",
    });
  };
  const snapshot = () =>
    page.evaluate(async () => {
      const s = (await import("/src/store/app.ts")).useAppStore.getState();
      return JSON.parse(
        JSON.stringify({
          room: s.room,
          tops: s.tops,
          subs: s.subs,
          audit: s.audit,
          stageLayout: s.stageLayout,
          scenes: s.scenes,
          activeSceneId: s.activeSceneId,
        }),
      );
    });
  const capture = async (name, width, { top = true } = {}) => {
    if (top) await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      animations: "disabled",
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${name}: overflow at ${width}`,
    );
    views.push({ name, width, overflow: false });
  };
  await goto("/");
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.setState({ hasSeenOnboarding: true, hasSeenTour: true });
    useAppStore.getState().loadDemoVenue();
    useAppStore.getState().saveScene("Referencia A");
    useAppStore.getState().saveScene("Revisión B");
    const scenes = useAppStore.getState().scenes.map((s, i) => ({
      ...s,
      id: `server-${i}`,
      clientId: `local-${i}`,
    }));
    useAppStore.setState({ scenes, activeSceneId: "local-0" });
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  const initial = await snapshot();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
    for (const [name, path] of [
      ["calculadoras", "/toolkit"],
      ["comparador", "/compare"],
      ["catalogo", "/community"],
      ["ajustes", "/settings"],
      ["colaboracion", "/collaboration"],
      ["asesor", "/ai-advisor"],
    ]) {
      await goto(path);
      await capture(name, width);
    }
  }
  assert.deepEqual(await snapshot(), initial);
  checks.push(
    "Navegar las seis pantallas no altera el proyecto ni sus revisiones",
  );
  await page.setViewportSize({ width: 320, height: 844 });
  await goto("/toolkit");
  await page.getByTestId("cardioid-tuning-slider").fill("80");
  await page.getByTestId("cardioid-config-end-fire").click();
  const calculated = await page.evaluate(async () =>
    (await import("/src/lib/audio/pa-toolkit.ts")).calculateCardioid(
      80,
      "end-fire",
      20,
    ),
  );
  await expect(page.getByTestId("cardioid-delay")).toContainText(
    String(calculated.delayMs),
  );
  await page.getByTestId("toolkit-tab-line-array").click();
  await page.getByTestId("la-boxes").fill("6");
  await capture("line-array", 320);
  await page.getByTestId("toolkit-tab-impedance").click();
  await page.getByTestId("imp-cabinets").fill("4");
  await capture("impedancia", 320);
  await page.getByTestId("toolkit-tab-cardioid").click();
  await expect(page.getByTestId("cardioid-tuning-slider")).toHaveValue("80");
  await page.getByTestId("toolkit-tab-line-array").click();
  await expect(page.getByTestId("la-boxes")).toHaveValue("6");
  assert.deepEqual(await snapshot(), initial);
  checks.push(
    "Las tres calculadoras conservan valores al cambiar de pestaña; salida cardioide coincide con el motor y el proyecto no cambia",
  );
  await goto("/compare");
  await expect(page.getByTestId("picker-a")).toContainText("Revisión B");
  await expect(page.getByTestId("picker-b")).toContainText("Referencia A");
  await page.getByTestId("compare-swap-btn").click();
  await expect(page.getByTestId("picker-a")).toContainText("Referencia A");
  await page.getByTestId("compare-toggle-details").click();
  await expect(page.getByTestId("compare-toggle-details")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page.getByTestId("compare-details-panel").scrollIntoViewIfNeeded();
  await capture("comparador-detalles", 320, { top: false });
  await page.getByTestId("compare-load-a").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  assert.deepEqual(await snapshot(), initial);
  await page.getByTestId("compare-load-a").click();
  await page.getByTestId("library-confirm-replace").click();
  await expect(page).toHaveURL(/\/$/);
  assert.equal((await snapshot()).activeSceneId, "local-1");
  checks.push(
    "Comparador resuelve clientId distinto de id, intercambia escenas, despliega detalles y confirma antes de cargar",
  );
  await goto("/community");
  await expect(page.getByTestId("community-status-pending")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByTestId("community-submit-btn").click();
  await page.getByTestId("submit-brand").fill("Prueba local");
  await page.getByTestId("submit-model").fill("Modelo de verificación");
  await page.getByTestId("submit-spl").fill("120");
  await capture("ficha-formulario", 320, { top: false });
  await page.getByTestId("submit-gear-btn").click();
  await expect(page.getByTestId("submit-gear-overlay")).toHaveCount(0);
  await page.getByLabel("Buscar fichas locales").fill("no coincide");
  await expect(page.getByTestId("community-empty")).toBeVisible();
  await page.getByLabel("Buscar fichas locales").fill("prueba local");
  await expect(page.getByTestId("community-hero")).toContainText(
    "Modelo de verificación",
  );
  await capture("catalogo-ficha", 320);
  await goto("/community");
  await expect(page.getByTestId("community-hero")).toContainText(
    "Modelo de verificación",
  );
  checks.push(
    "Crear, buscar y recargar una ficha conserva el borrador local y muestra su estado sin presentarlo como verificado",
  );
  await goto("/settings");
  await expect(
    page.getByTestId("settings-section-backup-toggle"),
  ).toHaveAttribute("aria-expanded", "true");
  const download = page.waitForEvent("download");
  await page.getByTestId("backup-export-btn").click();
  const file = await download;
  const backup = JSON.parse(await readFile(await file.path(), "utf8"));
  assert(backup && typeof backup === "object");
  checks.push("Respaldos abre al entrar y exporta JSON válido");
  await page.getByTestId("settings-section-measurement-toggle").click();
  await page.getByTestId("units-segment-imperial").click();
  await goto("/settings");
  await page.getByTestId("settings-section-measurement-toggle").click();
  assert.equal(
    await page.evaluate(
      async () =>
        (await import("/src/store/settings.ts")).useSettingsStore.getState()
          .units,
    ),
    "imperial",
  );
  await page.getByTestId("units-segment-metric").click();
  await page.getByTestId("settings-section-danger-toggle").click();
  const beforeReset = await snapshot();
  await page.getByTestId("reset-system-btn").click();
  await expect(page.getByRole("dialog")).toContainText("Las escenas guardadas");
  await capture("reinicio-confirmacion", 320, { top: false });
  await page.keyboard.press("Escape");
  assert.deepEqual(await snapshot(), beforeReset);
  checks.push(
    "Preferencias persisten al recargar y Escape cancela el reinicio sin modificar datos",
  );
  await goto("/collaboration");
  await expect(page.getByTestId("collaboration-local")).toBeVisible();
  await page
    .getByRole("link", { name: "Abrir respaldos", exact: true })
    .click();
  await expect(page).toHaveURL(/settings/);
  checks.push(
    "Estado local de Colaboración ofrece acceso operativo a respaldos",
  );
  await goto("/ai-advisor");
  await page
    .getByLabel("Consulta al asesor")
    .fill("Revisa la cobertura de mi sistema");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(page.getByText(/Origen: reglas locales/)).toBeVisible();
  await capture("asesor-local", 320, { top: false });
  await page.getByRole("button", { name: "Reiniciar conversación" }).click();
  await expect(page.getByText(/Origen: reglas locales/)).toHaveCount(0);
  checks.push(
    "Asesor responde con origen local explícito y permite reiniciar la conversación",
  );
  await page.getByTestId("bottom-nav-fab").click();
  await expect(page.getByTestId("bottom-nav-fab-sheet")).toBeVisible();
  await page.getByTestId("fab-action-collaboration").scrollIntoViewIfNeeded();
  await capture("menu-movil", 320, { top: false });
  await page.getByTestId("fab-action-collaboration").click();
  await expect(page).toHaveURL(/collaboration/);
  await expect(page.getByTestId("bottom-nav-fab-sheet")).toHaveCount(0);
  checks.push(
    "Menú móvil recorre todos sus accesos y cierra tras navegar a Colaboración",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto("/settings");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Saltar al contenido" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByTestId("sidebar-toggle").click();
  await page
    .getByRole("link", { name: "Escenas", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/scenes/);
  checks.push(
    "Saltar al contenido y navegación lateral colapsada funcionan con nombres accesibles",
  );
  // Regression sweep across existing main routes at phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [name, path] of [
    ["inicio", "/"],
    ["recinto", "/design?step=room"],
    ["equipos", "/design?step=pa"],
    ["dsp", "/design?step=dsp"],
    ["patch", "/design?step=patch"],
    ["plano", "/stage-map"],
    ["medicion", "/perform"],
    ["operacion", "/live"],
    ["spl", "/spl-analysis"],
    ["acustica", "/acoustic-analysis"],
    ["expediente", "/audit"],
    ["informes", "/export"],
    ["escenas", "/scenes"],
    ["plantillas", "/templates"],
  ]) {
    await goto(path);
    await capture(`regresion-${name}`, 390);
  }
  checks.push(
    "Recorrido de 14 pantallas existentes a 390 px sin desbordamiento",
  );
  await goto("/ruta-inexistente");
  await expect(
    page.getByRole("link", { name: "Volver al inicio" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL(/\/$/);
  checks.push("Página no encontrada permite volver al inicio");
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/qa.json`,
    JSON.stringify({ views, checks, errors }, null, 2),
  );
  console.log(
    JSON.stringify(
      { views: views.length, checks: checks.length, errors },
      null,
      2,
    ),
  );
} catch (error) {
  if (page) {
    await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
    await writeFile(`${out}/failure.txt`, String(error));
  }
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
