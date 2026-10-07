import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.QA_OUTPUT ?? "test-results/glow-02";
await mkdir(out, { recursive: true });
await rm(`${out}/qa.json`, { force: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5182, strictPort: true },
});
await server.listen();
let browser, page;
const errors = [],
  screens = [],
  checks = [];
const base = "http://127.0.0.1:5182";
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
    viewport: { width: 1440, height: 1000 },
    locale: "es-CL",
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  const goto = async (path) => {
    await page.goto(base + path, { waitUntil: "networkidle" });
    await expect(page.getByTestId("project-context")).toBeVisible();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-testid^="wizard-body-"]')].every(
        (el) => Number(getComputedStyle(el).opacity) >= 0.99,
      ),
    );
  };
  const state = () =>
    page.evaluate(async () => {
      const s = (await import("/src/store/app.ts")).useAppStore.getState();
      return { audit: s.audit, room: s.room, activeSceneId: s.activeSceneId };
    });
  const capture = async (name, width) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      animations: "disabled",
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, `${name} desborda a ${width}px`);
    const activeVisible = await page
      .getByRole("navigation", { name: "Vistas del proyecto" })
      .evaluate((nav) => {
        const active = nav.querySelector('[aria-current="page"]');
        if (!active) return false;
        const a = active.getBoundingClientRect(),
          n = nav.getBoundingClientRect();
        return a.left >= n.left - 1 && a.right <= n.right + 1;
      });
    assert(activeVisible, `${name}: pestaña activa fuera del área visible`);
    screens.push({
      name,
      width,
      horizontalOverflow: false,
      activeNavigationVisible: true,
    });
  };

  await page.goto(base, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.setState({ hasSeenOnboarding: true, hasSeenTour: true });
    useAppStore.getState().loadDemoVenue();
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  await goto("/channels");
  await page
    .getByRole("button", {
      name: "Cargar plantilla de banda (ejemplo)",
      exact: true,
    })
    .click();
  const originalChannels = (await state()).audit.channels;
  assert(originalChannels.length > 1);
  await page
    .getByRole("navigation", { name: "Entradas del patch" })
    .getByRole("button")
    .nth(1)
    .click();
  await page.getByLabel("Nombre", { exact: true }).fill("Voz principal");
  await page
    .getByLabel("Fuente / micrófono / DI", { exact: true })
    .fill("Micrófono vocal · escenario");
  assert.deepEqual((await state()).audit.channels[0], originalChannels[0]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("Entrada del patch", { exact: true })
    .selectOption(String(originalChannels[1].ch));
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(
    "Voz principal",
  );
  await page.getByText("Phantom y compatibilidad", { exact: false }).click();
  const safe = page.getByLabel(
    "Compatibilidad phantom comprobada en fuente y cableado",
    { exact: true },
  );
  const phantom = page.getByLabel("Phantom previsto en el plan", {
    exact: true,
  });
  await expect(phantom).toBeDisabled();
  await safe.check();
  await phantom.check();
  await safe.uncheck();
  await expect(phantom).not.toBeChecked();
  await expect(phantom).toBeDisabled();
  await page
    .getByRole("button", { name: "Añadir entrada", exact: true })
    .click();
  const added = (await state()).audit.channels.at(-1).ch;
  await expect(
    page.getByLabel("Entrada del patch", { exact: true }),
  ).toHaveValue(String(added));
  await page
    .getByRole("button", { name: `Quitar entrada ${added}`, exact: true })
    .click();
  assert.equal((await state()).audit.channels.length, originalChannels.length);
  checks.push(
    "Selección móvil/escritorio, edición aislada, añadir/quitar entrada y protección phantom",
  );

  await page
    .getByRole("navigation", { name: "Secciones del patch" })
    .getByRole("button", { name: /Rutas/ })
    .click();
  await page.getByRole("button", { name: "Añadir ruta", exact: true }).click();
  const route = page.getByTestId("patch-route").first();
  await route
    .getByLabel("Salida de consola / bus", { exact: true })
    .fill("Consola · Matrix L");
  await route
    .getByLabel("Salida DSP", { exact: true })
    .selectOption({ index: 1 });
  await route.getByRole("checkbox").first().check();
  await route
    .getByLabel("Cableado / carga / observaciones", { exact: true })
    .fill("Línea balanceada · revisar en montaje");
  const savedRoute = (await state()).audit.routes[0];
  assert.equal(savedRoute.speakerIds.length, 1);
  assert(savedRoute.outputId);
  await page.getByRole("button", { name: "Añadir ruta", exact: true }).click();
  await page
    .getByTestId("patch-route")
    .last()
    .getByRole("button", { name: "Quitar ruta", exact: true })
    .click();
  assert.deepEqual((await state()).audit.routes, [savedRoute]);
  await page.reload({ waitUntil: "networkidle" });
  assert.deepEqual((await state()).audit.routes, [savedRoute]);
  assert.equal((await state()).audit.channels[1].name, "Voz principal");
  checks.push(
    "Asignación de DSP y cajas, eliminación aislada de rutas y persistencia al recargar",
  );

  await goto("/audit");
  await page.getByTestId("audit-reviews").locator("summary").first().click();
  const firstReview = page.getByLabel("Recinto", { exact: true });
  await expect(firstReview.locator('option[value="verified"]')).toHaveAttribute(
    "disabled",
    "",
  );
  await page
    .getByLabel("Técnico responsable", { exact: true })
    .fill("Técnico demo");
  await page
    .getByLabel("Cliente / organización", { exact: true })
    .fill("Sala de demostración");
  await page
    .getByLabel("Objetivo y alcance", { exact: true })
    .fill("Revisar dimensiones y documentar el sistema de audio.");
  await page
    .getByLabel("Evidencia / motivo", { exact: true })
    .first()
    .fill("Dimensiones contrastadas con el plano de referencia.");
  await firstReview.selectOption("verified");
  await page
    .getByLabel("Nuevo hallazgo", { exact: true })
    .fill("Revisar cobertura al fondo de la sala");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await page
    .getByLabel("Evidencia (medición, foto o referencia)", { exact: true })
    .fill("Pendiente de medición en montaje.");
  await page
    .getByLabel("Acción propuesta / realizada", { exact: true })
    .fill("Comparar la estimación con una captura en el receptor.");
  await page.getByTestId("project-save").click();
  await expect(page.getByTestId("project-state")).toHaveText("Guardado");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal((await state()).audit.reviews.room.state, "verified");
  assert.equal((await state()).audit.findings.length, 1);
  await expect(
    page.getByLabel("Técnico responsable", { exact: true }),
  ).toHaveValue("Técnico demo");
  checks.push(
    "Verificación exige responsable/evidencia; hallazgos y revisión guardada sobreviven recarga",
  );

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const [name, path] of [
      ["recinto", "/design?step=room"],
      ["patch", "/channels"],
      ["expediente", "/audit"],
      ["informe", "/export"],
    ]) {
      await goto(path);
      if (name === "informe") {
        await page
          .getByRole("button", { name: "Preparar vista previa", exact: true })
          .click();
        await expect(page.getByTestId("report-preview")).toBeVisible();
      }
      await capture(name, width);
      if (name === "patch") {
        await page
          .getByRole("navigation", { name: "Secciones del patch" })
          .getByRole("button", { name: /Rutas/ })
          .click();
        await capture("rutas", width);
      }
    }
  }

  // All three download controls use the exact report currently previewed.
  await page.getByText("Identificación de la copia", { exact: true }).click();
  const fingerprint = (
    await page.getByTestId("report-fingerprint").textContent()
  )
    .replace("SHA-256: ", "")
    .trim();
  for (const [label, file] of [
    ["Descargar PDF", "informe-demo.pdf"],
    ["Descargar texto", "informe-demo.md"],
    ["Descargar evidencias JSON", "evidencias-demo.json"],
  ]) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    const download = await downloadPromise;
    await download.saveAs(`${out}/${file}`);
  }
  const json = JSON.parse(
    await readFile(`${out}/evidencias-demo.json`, "utf8"),
  );
  assert.equal(json.fingerprint, fingerprint);
  assert(
    (await readFile(`${out}/informe-demo.md`, "utf8")).includes(fingerprint),
  );
  assert(
    (await readFile(`${out}/informe-demo.pdf`)).subarray(0, 4).toString() ===
      "%PDF",
  );
  checks.push("Descargas PDF, texto y JSON; huella de la copia conservada");

  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/design?step=room");
  await expect(page.locator(".glow-room-preview")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Mostrar vista del recinto", exact: true })
    .click();
  await expect(page.locator(".glow-room-preview")).toBeVisible();
  await page
    .locator(".glow-room-preview")
    .getByRole("button", { name: "Abrir vista 3D", exact: true })
    .click();
  await expect(page.locator(".glow-room-preview canvas")).toBeVisible();
  await capture("recinto-vista", 390);
  await page
    .getByRole("button", { name: "Ocultar vista del recinto", exact: true })
    .click();
  await page.getByTestId("open-ar-scan-btn").click();
  const dialog = page.getByTestId("ar-scan-overlay");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({
      path: `${out}/escaneo-${width}.png`,
      animations: "disabled",
    });
    assert(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1));
  }
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException("Permiso denegado", "NotAllowedError"));
  });
  await page.getByTestId("ar-start-btn").click();
  await expect(dialog.getByRole("alert")).toContainText("No se permitió");
  await dialog
    .getByRole("button", { name: "Entrada manual", exact: true })
    .click();
  const oldHeight = await page
    .getByLabel("Altura", { exact: true })
    .inputValue();
  await page.getByTestId("ar-value-length").fill("18");
  await page.getByTestId("ar-value-width").fill("12");
  await page.getByTestId("ar-value-height").fill("999");
  await expect(page.getByTestId("ar-apply-btn")).toBeDisabled();
  await page.getByTestId("ar-value-height").fill("");
  await page.screenshot({
    path: `${out}/escaneo-manual-390.png`,
    animations: "disabled",
  });
  await page.getByTestId("ar-apply-btn").click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Largo", { exact: true })).toHaveValue("18");
  await expect(page.getByLabel("Ancho", { exact: true })).toHaveValue("12");
  await expect(page.getByLabel("Altura", { exact: true })).toHaveValue(
    oldHeight,
  );
  await page.getByTestId("room-name-input").fill("Sala de revisión");
  await page.getByTestId("room-continue-step1").click();
  await expect(page.getByTestId("room-continue-step2")).toBeVisible();
  await capture("recinto-materiales", 390);
  await page.getByTestId("room-continue-step2").click();
  await expect(page.getByTestId("room-calculate")).toBeVisible();
  await capture("recinto-revision", 390);
  await page.getByTestId("room-calculate").click();
  await expect(page.locator(".room-results")).toBeVisible();
  assert.equal((await state()).room.length, 18);
  assert.equal((await state()).room.width, 12);
  await page.getByTestId("project-save").click();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("Largo", { exact: true })).toHaveValue("18");
  checks.push(
    "Vista 3D desplegable, cámara denegada, alternativa manual, validación de medidas, cálculo y guardado del recinto",
  );

  // Shared navigation must keep the original pilot screens usable.
  for (const [name, path] of [
    ["inicio", "/"],
    ["plano", "/stage-map"],
    ["dsp", "/dsp"],
    ["revisar-asistente", "/design?step=findings"],
    ["informe-asistente", "/design?step=save"],
  ]) {
    await goto(path);
    await capture(name, 390);
  }
  // The wizard actions remain reachable without covering the mobile fields.
  const next = page.getByTestId("wizard-next");
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  assert.equal(
    await next.evaluate(
      (el) =>
        el.getBoundingClientRect().bottom <=
        document.querySelector(".mobile-nav").getBoundingClientRect().top + 1,
    ),
    true,
  );
  checks.push(
    "Acciones del asistente accesibles al final del formulario móvil",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/qa.json`,
    JSON.stringify(
      { screens, checks, errors, physicalAndroidTest: false },
      null,
      2,
    ),
  );
  console.log(
    `${screens.length} vistas responsive; ${checks.length} recorridos funcionales; sin errores JavaScript`,
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
