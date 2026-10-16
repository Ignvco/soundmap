import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.QA_OUTPUT ?? "test-results/glow-05";
await mkdir(out, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5185, strictPort: true },
});
await server.listen();
let browser;
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
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    locale: "es-CL",
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  const goto = async (path) => {
    await page.goto(`http://127.0.0.1:5185${path}`, {
      waitUntil: "networkidle",
    });
  };
  const snapshot = () =>
    page.evaluate(async () => {
      const s = (await import("/src/store/app.ts")).useAppStore.getState();
      return JSON.parse(
        JSON.stringify({
          room: s.room,
          audit: s.audit,
          stageLayout: s.stageLayout,
          scenes: s.scenes,
          tops: s.tops,
          activeSceneId: s.activeSceneId,
        }),
      );
    });
  const capture = async (name, width) => {
    if (!(await page.getByRole("dialog").count()))
      await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      animations: "disabled",
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${name} overflow ${width}`,
    );
    const dialog = page.getByRole("dialog");
    if (await dialog.count())
      assert(
        await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${name} dialog overflow`,
      );
    views.push({ name, width, overflow: false });
  };
  await goto("/");
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.setState({
      hasSeenOnboarding: true,
      hasSeenTour: true,
      scenes: [],
    });
    useAppStore.getState().resetSystem();
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  await goto("/scenes");
  await expect(page.getByTestId("scenes-empty")).toBeVisible();
  await capture("escenas-vacio", 390);
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    useAppStore.getState().loadDemoVenue();
    useAppStore.getState().replaceSpeakerLayout({
      "tops:jbl-srx906:0": { normX: 22, normY: 18, heightM: 3, yawDeg: 10 },
    });
    useAppStore.getState().saveScene("A · Sala principal");
    useAppStore
      .getState()
      .saveScene(
        "Z · Festival de música y encuentro de equipos con un nombre largo para revisar la biblioteca",
      );
    useAppStore.setState({
      room: { ...useAppStore.getState().room, name: "Borrador pendiente" },
    });
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  const initial = await snapshot();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
    await goto("/scenes");
    await expect(page.getByTestId("scenes-grid")).toBeVisible();
    await capture("escenas", width);
    await page
      .getByTestId(`scene-load-btn-${initial.scenes[1].clientId}`)
      .click();
    await expect(page.getByTestId("library-save-continue")).toBeVisible();
    await capture("escena-confirmacion", width);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await goto("/templates");
    await capture("plantillas", width);
    await page.getByTestId("tpl-apply-church-sunday").click();
    await page.getByText(/Inventario incluido/).click();
    await capture("plantilla-detalle", width);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  }
  assert.deepEqual(await snapshot(), initial);
  checks.push(
    "Explorar, previsualizar detalles y cancelar no modifica borrador ni escenas",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/scenes");
  await page.getByLabel("Buscar escenas").fill("  Sala principal  ");
  await expect(page.locator('[data-testid^="scene-card-"]')).toHaveCount(1);
  await page.getByLabel("Buscar escenas").fill("no-existe");
  await expect(page.getByText("No encontramos esa escena")).toBeVisible();
  await capture("escenas-sin-resultados", 390);
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await page.getByLabel("Ordenar escenas").selectOption("name");
  await expect(page.locator('[data-testid^="scene-name-"]').first()).toHaveText(
    "A · Sala principal",
  );
  await expect(page.locator(".library-metrics").first()).toContainText("11");
  checks.push(
    "Búsqueda con espacios, resultado vacío, orden alfabético y cantidades reales del inventario",
  );
  await page
    .getByTestId(`scene-load-btn-${initial.scenes[1].clientId}`)
    .click();
  await page.getByTestId("library-save-continue").click();
  await expect(page).toHaveURL(/stage-map/);
  const loaded = await snapshot();
  assert.equal(loaded.scenes.length, 3);
  assert.equal(loaded.room.name, initial.scenes[1].room.name);
  assert.equal(loaded.scenes[0].room.name, "Borrador pendiente");
  assert.deepEqual(loaded.stageLayout, initial.scenes[1].stageLayout);
  await goto("/scenes");
  assert.deepEqual((await snapshot()).scenes, loaded.scenes);
  checks.push(
    "Guardar antes de abrir crea una revisión recuperable, carga plano y persiste al recargar",
  );
  const removeId = loaded.scenes[0].clientId;
  await page.getByTestId(`scene-delete-btn-${removeId}`).click();
  await page.getByTestId(`scene-delete-cancel-${removeId}`).click();
  assert.equal((await snapshot()).scenes.length, 3);
  await page.getByTestId(`scene-delete-btn-${removeId}`).click();
  await capture("eliminar-confirmacion", 390);
  await page.getByTestId(`scene-delete-confirm-${removeId}`).click();
  await expect(page.locator('[data-testid^="scene-card-"]')).toHaveCount(2);
  await goto("/scenes");
  const deleted = await snapshot();
  assert.equal(deleted.scenes.length, 2);
  assert.deepEqual(deleted.room, loaded.room);
  checks.push(
    "Borrado local cancelable y persistente, sin llamadas al proveedor deshabilitado ni cambios al recinto abierto",
  );
  await page
    .getByRole("button", {
      name: `Ver ${deleted.scenes[0].name} en 3D`,
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Abrir vista 3D", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("canvas")).toBeVisible();
  await capture("escena-3d", 390);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.deepEqual(await snapshot(), deleted);
  checks.push(
    "Vista 3D abre dentro del diálogo y Escape cierra sin modificar el proyecto",
  );
  await goto("/templates");
  await page.getByLabel("Tipo de montaje").selectOption("church");
  await expect(page.locator('[data-testid^="tpl-name-"]')).toHaveCount(1);
  await page.getByLabel("Buscar plantillas").fill("xxxx");
  await expect(page.getByText("Sin plantillas con esos filtros")).toBeVisible();
  await page.getByRole("button", { name: "Restablecer filtros" }).click();
  await expect(page.locator('[data-testid^="tpl-name-"]')).toHaveCount(5);
  await page.getByTestId("tpl-apply-church-sunday").click();
  await expect(page.getByTestId("library-save-continue")).toHaveCount(0);
  await page.getByTestId("library-confirm-replace").click();
  await expect(page).toHaveURL(/design\?step=room/);
  const templated = await snapshot();
  assert.equal(templated.room.name, "Templo — Domingo Mañana");
  assert.deepEqual(templated.stageLayout, {});
  assert.notEqual(templated.audit.id, deleted.audit.id);
  assert.deepEqual(templated.scenes, deleted.scenes);
  await goto("/templates");
  assert.equal((await snapshot()).room.name, templated.room.name);
  checks.push(
    "Filtros de plantilla, aplicación revisada, expediente nuevo y conservación de escenas tras recargar",
  );
  // A full archive must block the save-and-replace path rather than lose the draft.
  await page.evaluate(async () => {
    const { useAppStore } = await import("/src/store/app.ts");
    const scene = useAppStore.getState().scenes[0];
    useAppStore.setState({
      scenes: Array.from({ length: 500 }, (_, i) => ({
        ...scene,
        id: `limit-${i}`,
        clientId: `limit-${i}`,
      })),
    });
  });
  const full = await snapshot();
  await page.getByTestId("tpl-apply-church-sunday").click();
  await page.getByTestId("library-save-continue").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  assert.deepEqual(await snapshot(), full);
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  checks.push(
    "Límite de 500 revisiones bloquea Guardar y continuar sin reemplazar el borrador",
  );
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
} finally {
  await browser?.close();
  await server.close();
}
