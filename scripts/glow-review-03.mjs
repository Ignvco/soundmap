import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";

const out = process.env.QA_OUTPUT ?? "test-results/glow-03";
await mkdir(out, { recursive: true });
await rm(`${out}/qa.json`, { force: true });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5183, strictPort: true },
});
await server.listen();
let browser, page;
const errors = [],
  screens = [],
  checks = [];
const base = "http://127.0.0.1:5183";
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
  page.on("pageerror", (error) => errors.push(String(error)));
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
      return {
        tops: s.tops,
        subs: s.subs,
        monitors: s.monitors,
        mixers: s.mixers,
        mics: s.mics,
        room: s.room,
        stageLayout: s.stageLayout,
        dsp: s.audit.dsp,
      };
    });
  const flush = () =>
    page.evaluate(async () =>
      (await import("/src/lib/persistence.ts")).flushPersistence(),
    );
  const seed = () =>
    page.evaluate(async () => {
      const { useAppStore } = await import("/src/store/app.ts");
      useAppStore.setState({ hasSeenOnboarding: true, hasSeenTour: true });
      useAppStore.getState().loadDemoVenue();
      const s = useAppStore.getState();
      const { layoutSpeakers } = await import("/src/lib/speaker-layout.ts");
      const id = layoutSpeakers(s.room, s.tops, s.subs, s.monitors)[0].id;
      s.updateSpeakerPlacement(id, {
        normX: 23,
        normY: 18,
        heightM: 3.2,
        yawDeg: 14,
      });
      const layout = useAppStore.getState().stageLayout;
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
      dsp.outputs[0].gain = -7;
      dsp.outputs[0].delayMs = 4.3;
      dsp.outputs[0].polarity = false;
      s.updateAudit({ dsp });
      await (await import("/src/lib/persistence.ts")).flushPersistence();
    });
  const capture = async (name, width, selector) => {
    if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
    else await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    assert.equal(overflow, false, `${name}: desborda a ${width}px`);
    const activeVisible = await page
      .getByRole("navigation", { name: "Vistas del proyecto" })
      .evaluate((nav) => {
        const a = nav
            .querySelector('[aria-current="page"]')
            ?.getBoundingClientRect(),
          n = nav.getBoundingClientRect();
        return !!a && a.left >= n.left - 1 && a.right <= n.right + 1;
      });
    assert(activeVisible, `${name}: navegación activa fuera de vista`);
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      animations: "disabled",
    });
    screens.push({
      name,
      width,
      horizontalOverflow: false,
      activeNavigationVisible: true,
    });
  };

  await page.goto(base, { waitUntil: "networkidle" });
  await seed();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 768 ? 1000 : 844 });
    for (const [name, path] of [
      ["equipos", "/design?step=pa"],
      ["sistema-pa", "/pa"],
      ["spl", "/spl-analysis"],
      ["acustica", "/acoustic-analysis"],
    ]) {
      await goto(path);
      await capture(name, width);
    }
  }
  // Catalog interactions, category-scoped filters and persisted quantities.
  await page.setViewportSize({ width: 390, height: 844 });
  await goto("/design?step=pa");
  const beforeGear = await state();
  const search = page.getByLabel("Buscar marca o modelo", { exact: true });
  await search.fill("EON710");
  await expect(page.locator(".gear-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Agregar JBL EON710", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Aumentar cantidad de EON710", exact: true })
    .click();
  assert.equal(
    (await state()).tops.find((x) => x.id === "jbl-eon710").quantity,
    2,
  );
  await page
    .getByRole("button", { name: "Detalles de EON710", exact: true })
    .click();
  await expect(page.locator(".gear-row-details")).toContainText("SPL máximo");
  await capture("equipo-cantidad-detalle", 390, ".gear-row");
  await flush();
  await page.reload({ waitUntil: "networkidle" });
  await search.fill("EON710");
  await expect(
    page.getByLabel("Cantidad de EON710", { exact: true }),
  ).toHaveText("2");
  await page
    .getByRole("button", { name: "Reducir cantidad de EON710", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reducir cantidad de EON710", exact: true })
    .click();
  assert(!(await state()).tops.some((x) => x.id === "jbl-eon710"));
  assert.deepEqual((await state()).tops, beforeGear.tops);
  checks.push(
    "Buscar, agregar, detalles, cantidad, recarga y eliminación al llegar a cero sin afectar el resto del equipo",
  );

  await page
    .getByRole("button", { name: "Limpiar búsqueda", exact: true })
    .click();
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page
    .getByLabel("Filtrar amplificación", { exact: true })
    .selectOption("passive");
  const category = page.getByLabel("Categoría de equipo", { exact: true });
  await category.selectOption("mixer");
  await expect(
    page.getByLabel("Filtrar amplificación", { exact: true }),
  ).toHaveCount(0);
  const mixerCount = await page.evaluate(
    async () =>
      (await import("/src/lib/audio/gear-database.ts")).MIXERS_DATABASE.length,
  );
  assert.equal(await page.locator(".gear-row").count(), mixerCount);
  await page
    .getByLabel("Ordenar catálogo", { exact: true })
    .selectOption("name");
  const mixer = await page.evaluate(
    async () =>
      [
        ...(await import("/src/lib/audio/gear-database.ts")).MIXERS_DATABASE,
      ].sort((a, b) =>
        `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
      )[0],
  );
  await page
    .getByRole("button", {
      name: `Agregar ${mixer.brand} ${mixer.model}`,
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Ver equipo", exact: true }).click();
  await page
    .getByRole("button", {
      name: `Ver ${mixer.brand} ${mixer.model} en catálogo`,
      exact: true,
    })
    .click();
  await expect(search).toHaveValue(mixer.model);
  await capture("inventario-movil", 390, ".gear-inventory");
  await page
    .getByRole("button", {
      name: `Quitar ${mixer.brand} ${mixer.model} del inventario`,
      exact: true,
    })
    .click();
  assert.deepEqual((await state()).mixers, beforeGear.mixers);
  await search.fill("NO-EXISTE-EN-CATALOGO");
  await expect(
    page.getByRole("heading", { name: "Sin coincidencias", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restablecer búsqueda", exact: true })
    .click();
  await expect(page.locator(".gear-row")).toHaveCount(mixerCount);
  checks.push(
    "Filtro de amplificación aislado a cajas, cambio de categoría, orden, inventario global y búsqueda sin resultados",
  );
  const next = page.getByTestId("wizard-next");
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  assert(
    await next.evaluate(
      (el) =>
        el.getBoundingClientRect().bottom <=
        document.querySelector(".mobile-nav").getBoundingClientRect().top + 1,
    ),
  );
  checks.push(
    "Acción del asistente accesible sin superponer el catálogo en móvil",
  );

  // Match the existing evaluator and retain the custom DSP/layout on model change.
  await goto("/spl-analysis");
  const beforeAnalysis = await state();
  const verifyAnalysis = async (frequency) => {
    const expected = await page.evaluate(async (frequency) => {
      const s = (await import("/src/store/app.ts")).useAppStore.getState();
      return (await import("/src/lib/audio/audit-evaluator.ts")).evaluateAudit(
        {
          room: s.room,
          tops: s.tops,
          subs: s.subs,
          stageLayout: s.stageLayout,
          dsp: s.audit.dsp,
        },
        frequency,
      );
    }, frequency);
    const shown = await page
      .getByTestId("spl-metrics")
      .locator("dd")
      .allTextContents();
    assert.deepEqual(
      shown.map((x) => x.trim().replace(/\s+/g, " ")),
      [
        `${expected.grid.mean.toFixed(1)} dB`,
        `${expected.grid.max.toFixed(1)} dB`,
        `${expected.grid.uniformityPct} %`,
        `${expected.grid.spread.toFixed(1)} dB`,
      ],
    );
    await expect(page.getByTestId("spl-foh")).toHaveText(
      `${expected.fohSpl.toFixed(1)} dB`,
    );
    const cells = page.locator("[data-spl-cell]");
    assert.equal(
      await cells.count(),
      expected.grid.validCells.filter(Boolean).length,
    );
    const firstIndex = Number(
      await cells.first().getAttribute("data-spl-cell"),
    );
    assert.equal(
      await cells.first().locator("title").textContent(),
      `${expected.grid.cells[firstIndex].toFixed(1)} dB`,
    );
    return expected;
  };
  await verifyAnalysis(1000);
  await page
    .getByLabel("Frecuencia de análisis", { exact: true })
    .selectOption("63");
  await verifyAnalysis(63);
  await page
    .getByLabel("Modelo de suma", { exact: true })
    .selectOption("coherent");
  await verifyAnalysis(63);
  const afterAnalysis = await state();
  assert.deepEqual(afterAnalysis.stageLayout, beforeAnalysis.stageLayout);
  assert.deepEqual(afterAnalysis.dsp, beforeAnalysis.dsp);
  assert.deepEqual(afterAnalysis.tops, beforeAnalysis.tops);
  await capture("spl-mapa-63hz", 390, ".analysis-preview");
  await flush();
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("Modelo de suma", { exact: true })).toHaveValue(
    "coherent",
  );
  await verifyAnalysis(1000);
  checks.push(
    "Métricas y celdas 2D coinciden con el evaluador a 1 kHz y 63 Hz; modo coherente persiste y conserva DSP/plano",
  );

  await goto("/pa");
  const expectedPA = await page.evaluate(async () => {
    const s = (await import("/src/store/app.ts")).useAppStore.getState();
    return (await import("/src/lib/audio/audit-evaluator.ts")).evaluateAudit({
      room: s.room,
      tops: s.tops,
      subs: s.subs,
      stageLayout: s.stageLayout,
      dsp: s.audit.dsp,
    });
  });
  await expect(page.getByTestId("pa-metrics")).toContainText(
    expectedPA.fohSpl.toFixed(1),
  );
  await expect(
    page.getByText("Inventario PA registrado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir vista 3D", exact: true })
    .click();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30000 });
  await capture("pa-visor-3d", 390, ".analysis-preview");
  checks.push(
    "Resumen PA usa la evaluación con el DSP y plano actuales; visor 3D abre bajo demanda",
  );

  await goto("/acoustic-analysis");
  const acoustics = await page.evaluate(
    async () =>
      (await import("/src/store/app.ts")).useAppStore.getState().acoustics,
  );
  await expect(page.getByTestId("acoustic-metrics")).toContainText(
    acoustics.rt60Occupied.toFixed(2),
  );
  assert.deepEqual(
    (await page.locator(".acoustic-modes dd").allTextContents()).map((x) =>
      x.trim(),
    ),
    [
      acoustics.axialModes.x,
      acoustics.axialModes.y,
      acoustics.axialModes.z,
    ].map((x) => `${x.toFixed(1)} Hz`),
  );
  await capture("acustica-reverberacion", 390, ".acoustic-reverb");
  checks.push("RT60 y modos se presentan sin cambiar los resultados acústicos");

  // Concave room: show only valid evaluator cells and clip the room perimeter.
  await page.evaluate(async () => {
    const s = (await import("/src/store/app.ts")).useAppStore.getState();
    const w = s.room.width / 2,
      l = s.room.length / 2;
    const room = {
      ...s.room,
      geometry: {
        outline: [
          { x: -w, z: -l },
          { x: w, z: -l },
          { x: w, z: 0 },
          { x: 0, z: 0 },
          { x: 0, z: l },
          { x: -w, z: l },
        ],
        balconies: [],
        exclusions: [],
        source: "Prueba de recinto en L",
      },
    };
    s.applyRoomScan(
      room,
      (await import("/src/lib/audio/acoustics.ts")).calculateAcoustics(room),
    );
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  await goto("/spl-analysis");
  const concave = await verifyAnalysis(1000);
  assert(
    concave.grid.validCells.filter(Boolean).length < concave.grid.cells.length,
  );
  await capture("spl-recinto-irregular", 390, ".analysis-preview");
  checks.push(
    "Recinto en L: el mapa excluye las muestras fuera del contorno y conserva los valores del evaluador",
  );

  // Empty rig: a dash instead of fictitious zero headroom and actionable coverage state.
  await page.evaluate(async () => {
    const s = (await import("/src/store/app.ts")).useAppStore.getState();
    s.setGear("tops", []);
    s.setGear("subs", []);
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  await goto("/pa");
  const emptyPA = await page
    .getByTestId("pa-metrics")
    .locator("dd")
    .allTextContents();
  assert(
    emptyPA[1].includes("—") &&
      emptyPA[2].includes("—") &&
      emptyPA[3].includes("—"),
  );
  await capture("pa-sin-cajas", 390);
  await goto("/spl-analysis");
  await expect(page.getByTestId("spl-plan")).toHaveCount(0);
  await expect(
    page.getByText("Agregá tops o subs para calcular la cobertura.", {
      exact: false,
    }),
  ).toBeVisible();
  await capture("spl-sin-cajas", 390, ".analysis-preview");
  await page.evaluate(async () => {
    (await import("/src/store/app.ts")).useAppStore.setState({
      room: null,
      acoustics: null,
    });
    await (await import("/src/lib/persistence.ts")).flushPersistence();
  });
  for (const [name, path] of [
    ["pa", "/pa"],
    ["spl", "/spl-analysis"],
    ["acustica", "/acoustic-analysis"],
  ]) {
    await goto(path);
    await expect(
      page.getByRole("heading", { name: "Primero, tu recinto", exact: true }),
    ).toBeVisible();
    await capture(`${name}-sin-recinto`, 390);
  }
  checks.push(
    "Sin cajas y sin recinto: estados vacíos accionables, sin métricas inventadas",
  );

  await seed();
  for (const [name, path] of [
    ["inicio", "/"],
    ["plano", "/stage-map"],
    ["dsp", "/dsp"],
    ["patch", "/channels"],
    ["expediente", "/audit"],
  ]) {
    await goto(path);
    await capture(`${name}-navegacion`, 390);
  }
  checks.push("Navegación compartida conserva los accesos a Glow Up 01 y 02");
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
