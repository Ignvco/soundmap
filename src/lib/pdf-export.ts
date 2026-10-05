import fontUrl from "@/assets/fonts/DejaVuSans.ttf?url";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMetric, type AuditReport } from "./audit/report";
import { layoutSpeakers } from "./speaker-layout";

/** Light, paginated report, with embedded Unicode font and a frozen input DTO. */
export async function generateTechnicalPDF(
  r: AuditReport,
  save = true,
  suppliedFont?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const font =
    suppliedFont ??
    (await fetch(fontUrl).then(async (res) => {
      if (!res.ok)
        throw new Error("No se pudo cargar la tipografía del informe.");
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }));
  doc.addFileToVFS("SoundMap.ttf", font!);
  doc.addFont("SoundMap.ttf", "SoundMap", "normal");
  doc.setFont("SoundMap");
  doc.setProperties({
    title: `SoundMap - ${r.source.room.name}`,
    author: r.source.audit.technician || "SoundMap",
    subject: `${r.source.audit.id} / ${r.fingerprint}`,
  });
  const left = 16,
    width = 178,
    bottom = 275;
  let y = 24;
  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = 24;
    }
  };
  const paragraph = (text: string, size = 9) => {
    doc.setFontSize(size);
    doc.setTextColor(36, 43, 51);
    const lines = doc.splitTextToSize(text || "Pendiente", width) as string[];
    for (const line of lines) {
      ensure(5);
      doc.text(line, left, y);
      y += 5;
    }
    y += 3;
  };
  const heading = (title: string) => {
    ensure(35);
    y += 3;
    doc.setTextColor(17, 75, 70);
    doc.setFontSize(13);
    doc.text(title, left, y);
    y += 9;
  };
  const table = (head: string[], body: (string | number)[][]) => {
    if (!body.length) {
      paragraph("Sin datos registrados.");
      return;
    }
    ensure(20);
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { top: 24, bottom: 22, left, right: 16 },
      styles: {
        font: "SoundMap",
        fontStyle: "normal",
        fontSize: 8,
        cellPadding: 2.5,
        overflow: "linebreak",
        textColor: [35, 43, 51],
        lineColor: [216, 226, 222],
        lineWidth: 0.1,
      },
      headStyles: {
        font: "SoundMap",
        fontStyle: "normal",
        fillColor: [224, 237, 232],
        textColor: [17, 75, 70],
      },
      alternateRowStyles: { fillColor: [247, 249, 248] },
      didDrawPage: (data) => {
        y = data.cursor?.y ?? 24;
      },
    });
    y += 7;
  };
  const { room, audit } = r.source;
  heading(`Auditoría de sonido: ${room.name}`);
  paragraph(
    `Revisión ${r.revision ?? "sin guardar"}${r.draft ? " - BORRADOR" : ""} | ${r.generatedAt}`,
  );
  paragraph(
    `Expediente: ${audit.id}\nTécnico: ${audit.technician || "Pendiente"}\nCliente: ${audit.client || "Pendiente"}`,
  );
  paragraph(
    `Motor ${r.engineVersion} | Catálogo ${r.catalogRevision}\nSHA-256 de entradas: ${r.fingerprint}`,
    8,
  );
  heading("Objetivo y alcance");
  paragraph(audit.objective);
  heading("Conclusión del técnico");
  paragraph(audit.conclusion);
  heading("Estado de las revisiones");
  const labels: Record<string, string> = {
    room: "Recinto",
    pa: "Inventario",
    dsp: "DSP",
    patch: "Ruteo",
    measurement: "Medición",
    findings: "Hallazgos",
    save: "Informe",
  };
  const status = {
    pending: "Pendiente",
    verified: "Verificado por el técnico",
    "not-applicable": "No aplica",
  };
  table(
    ["Apartado", "Estado", "Evidencia / motivo"],
    Object.entries(labels).map(([k, l]) => [
      l,
      status[audit.reviews[k]?.state ?? "pending"],
      audit.reviews[k]?.note || "Pendiente",
    ]),
  );
  heading("Recinto y estimaciones acústicas");
  table(
    ["Dato", "Valor"],
    [
      [
        "Ancho x largo x alto",
        `${room.width} x ${room.length} x ${room.height} m`,
      ],
      [
        "Materiales",
        `${room.wallMaterial} / ${room.floorType} / ${room.ceilingType}`,
      ],
      ["Volumen", formatMetric(r.acoustics.volume, "m³")],
      [
        "Ocupación",
        `${r.acoustics.occupancyPct}% de ${room.capacity} personas`,
      ],
      [
        "Ambiente",
        `${r.acoustics.temperature} °C / ${r.acoustics.humidity}% HR`,
      ],
      [
        "RT vacío / ocupado actual / aforo completo",
        `${r.acoustics.rt60Empty} / ${r.acoustics.rt60Occupied} / ${r.acoustics.rt60Audience} s`,
      ],
      [
        "Nivel máximo orientativo en receptor",
        formatMetric(r.evaluation.fohSpl, "dB"),
      ],
      ["Margen sobre objetivo", formatMetric(r.evaluation.headroomDb, "dB")],
      [
        "Área sobre objetivo / uniformidad ±3 dB",
        `${formatMetric(r.evaluation.coveragePct, "%")} / ${formatMetric(r.evaluation.uniformityPct, "%")}`,
      ],
    ],
  );
  if (r.acoustics.rt60Bands)
    table(
      ["Banda", "RT estimado", "Absorción"],
      r.acoustics.rt60Bands.map((b) => [
        `${b.frequency} Hz`,
        `${b.rt60.toFixed(2)} s`,
        `${b.absorption.toFixed(2)} m²`,
      ]),
    );
  for (const line of r.evaluation.assumptions) paragraph(line, 8);
  heading("Plano del montaje actual");
  ensure(125);
  const scale = Math.min(150 / room.width, 100 / room.length),
    w = room.width * scale,
    h = room.length * scale,
    x0 = left + (width - w) / 2,
    y0 = y;
  doc.setDrawColor(70, 85, 78);
  doc.setLineWidth(0.3);
  doc.rect(x0, y0, w, h);
  const px = (x: number) => x0 + (x + room.width / 2) * scale,
    pz = (z: number) => y0 + (z + room.length / 2) * scale;
  doc.setFontSize(7);
  const speakers = layoutSpeakers(
    room,
    r.source.tops,
    r.source.subs,
    r.source.monitors,
    r.source.stageLayout,
  );
  const polygon = (outline: { x: number; z: number }[]) =>
    outline.forEach((p, i) => {
      const next = outline[(i + 1) % outline.length];
      doc.line(px(p.x), pz(p.z), px(next.x), pz(next.z));
    });
  if (room.geometry) {
    polygon(room.geometry.outline);
    room.geometry.balconies.forEach((b) => polygon(b.outline));
  }
  speakers.forEach((s, i) => {
    const x = px(s.x),
      z = pz(s.z),
      rad = (s.yawDeg * Math.PI) / 180;
    doc.setFillColor(
      s.kind === "subs" ? 190 : 38,
      s.kind === "subs" ? 112 : 117,
      86,
    );
    doc.circle(x, z, 1.3, "F");
    doc.line(x, z, x + Math.sin(rad) * 4, z + Math.cos(rad) * 4);
    doc.text(String(i + 1), x + 2, z - 1);
  });
  const receiver = r.evaluation.receiver;
  doc.setDrawColor(190, 66, 46);
  doc.circle(px(receiver.x), pz(receiver.z), 2);
  doc.text("R", px(receiver.x) + 3, pz(receiver.z));
  y += h + 8;
  paragraph(
    `Escala gráfica: ${Math.min(5, room.width / 4).toFixed(1)} m. R: receptor a ${receiver.y.toFixed(2)} m de altura. Origen: centro del suelo; +z hacia el fondo.`,
    8,
  );
  const bar = Math.min(5, room.width / 4);
  doc.setDrawColor(30);
  doc.line(left, y, left + bar * scale, y);
  y += 7;
  table(
    ["Unidad", "Modelo", "x / y / z (m)", "Azimut / inclinación"],
    speakers.map((s, i) => [
      `${i + 1}. ${s.label}`,
      `${s.gear.brand} ${s.gear.model}`,
      `${s.x.toFixed(2)} / ${s.y.toFixed(2)} / ${s.z.toFixed(2)}`,
      `${s.yawDeg}° / ${s.tiltDeg}°`,
    ]),
  );
  heading("Inventario y procedencia");
  const gear = [
    ...r.source.tops,
    ...r.source.subs,
    ...r.source.monitors,
    ...r.source.dspUnits,
    ...r.source.amps,
    ...r.source.mixers,
    ...r.source.mics,
  ];
  table(
    ["Modelo / cantidad", "Estado documental", "Campos revisados"],
    gear.map((g) => [
      `${g.brand} ${g.model} x${g.quantity ?? 1}`,
      g.catalog?.status === "reviewed-fields"
        ? "Revisión parcial"
        : "Sin contrastar",
      g.catalog?.reviewedFields.join(", ") || "Ninguno",
    ]),
  );
  for (const g of gear)
    for (const src of g.catalog?.sources ?? [])
      paragraph(
        `${g.model}: ${typeof src === "string" ? src : JSON.stringify(src)}`,
        7,
      );
  heading("Procesamiento aceptado");
  paragraph(
    `Estado: ${audit.dspState}. ${audit.dspVerifiedAt ? `Verificación declarada: ${audit.dspVerifiedAt}` : "Sin verificación registrada en el equipo."}`,
  );
  table(
    [
      "Salida / destino",
      "Ganancia / tiempo",
      "HPF / LPF",
      "Polaridad",
      "Techo eléctrico",
    ],
    (r.dsp?.outputs ?? []).map((o) => [
      `${o.id} / ${o.destination}`,
      `${o.gain} dB / ${o.delayMs} ms`,
      `${o.hpfHz} / ${o.lpfHz} Hz`,
      o.polarity ? "Normal" : "Invertida",
      o.limiterDb === null
        ? "Pendiente"
        : `${o.limiterDb.toFixed(2)} dBFS (RMS)`,
    ]),
  );
  for (const o of r.dsp?.outputs ?? []) {
    paragraph(`${o.id}: ${o.dynamics.protection.reasons.join(" ")}`, 8);
    if (o.eq.length)
      table(
        [`${o.id} EQ`, "Frecuencia", "Ganancia", "Q"],
        o.eq.map((b) => [b.type, `${b.freq} Hz`, `${b.gain} dB`, b.q]),
      );
  }
  heading("Ruteo físico");
  table(
    ["Entrada / bus", "Salida DSP", "Etapa / canal", "Unidades"],
    audit.routes.map((v) => [
      v.input,
      v.outputId,
      `${v.amplifierId || "Activa / pendiente"} ${v.amplifierUnit ?? ""} / ${v.channel ?? ""}`,
      v.speakerIds.join(", "),
    ]),
  );
  heading("Canales de entrada");
  table(
    ["Canal", "Fuente", "Micrófono / conexión", "Notas"],
    (audit.channels ?? []).map((c) => [c.ch, c.source, c.name, c.eqHint]),
  );
  heading("Mediciones y evidencias");
  if (!audit.measurements.length)
    paragraph(
      "Sin mediciones capturadas. Las estimaciones anteriores no son mediciones.",
    );
  for (const m of audit.measurements) {
    heading(m.label);
    paragraph(
      `${m.startedAt} a ${m.endedAt}\n${m.method}\n${m.device} - ${m.sampleRate} Hz - ${m.unit}`,
    );
    paragraph(
      `Receptor: ${m.receiver.x} / ${m.receiver.y} / ${m.receiver.z} m. ${m.profile ? `Perfil ${m.profile.id}: ${m.profile.reference}, ${m.profile.calibratedAt}` : "Sin calibración trazable."}`,
    );
    table(
      ["Resultado", "Valor"],
      Object.entries(m.summary).map(([k, v]) => [
        k,
        v === null ? "No calculable" : String(v),
      ]),
    );
    for (const note of m.interruptions) paragraph(`Interrupción: ${note}`);
    paragraph(
      `${m.samples.length} muestras conservadas en el archivo de evidencias JSON asociado.`,
      8,
    );
  }
  heading("Hallazgos y acciones");
  table(
    ["Prioridad / estado", "Hallazgo", "Evidencia", "Acción"],
    audit.findings.map((f) => [
      `${f.priority} / ${f.state}`,
      f.title,
      f.evidence || "Pendiente",
      f.action || "Pendiente",
    ]),
  );
  heading("Limitaciones y comprobaciones pendientes");
  for (const limit of r.limits) paragraph(limit);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("SoundMap");
    doc.setFontSize(8);
    doc.setTextColor(75, 90, 85);
    doc.text("SOUNDMAP / INFORME TÉCNICO", left, 12);
    doc.text(`Motor ${r.engineVersion}`, 194, 12, { align: "right" });
    doc.setDrawColor(190, 204, 198);
    doc.line(left, 16, 194, 16);
    doc.line(left, 282, 194, 282);
    doc.setFontSize(7);
    doc.text(
      `${r.draft ? "Borrador" : "Revisión " + r.revision} - ${r.fingerprint.slice(0, 20)}`,
      left,
      288,
    );
    doc.text(`${page} / ${pages}`, 194, 288, { align: "right" });
  }
  if (save) doc.save(`soundmap-${r.fingerprint.slice(0, 12)}.pdf`);
  return doc;
}
