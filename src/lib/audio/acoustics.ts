// Acoustics Engine — SoundMap
// Calculates RT60, Schroeder frequency, critical distance, flutter echo risk, speech intelligibility

export type RoomMaterial = "concrete" | "wood" | "carpet" | "glass" | "brick" | "drywall" | "foam";
export type CeilingType = "flat" | "vaulted" | "domed" | "industrial" | "acoustic-tile";
export type FloorType = "concrete" | "wood" | "carpet" | "tile";
export type VenueType = "club" | "festival" | "theatre" | "conference";

export interface RoomScanInput {
  name: string;
  length: number; // meters
  width: number;  // meters
  height: number; // meters
  capacity: number;
  ceilingType: CeilingType;
  wallMaterial: RoomMaterial;
  floorType: FloorType;
  windowCount: number;
  // Tipo de recinto para absorción de público diferenciada (ISO 9921 / AES)
  venueType?: VenueType;
  /** Temperatura ambiente en °C. Afecta velocidad del sonido y absorción del aire. Default: 20 °C. */
  temperature?: number;
  /** Humedad relativa (%). Afecta absorción del aire, especialmente en altas frecuencias. Default: 50 %. */
  humidity?: number;
  /** Nivel de ocupación actual (0–100 %). Interpola entre rt60Empty y rt60Audience. Default: 100 %. */
  occupancyPct?: number;
}

export interface AcousticsResult {
  volume: number;
  rt60Empty: number;
  rt60Audience: number;
  echoRisk: "low" | "medium" | "high";
  schroederFreq: number;
  criticalDistance: number;
  flutterEchoRisk: boolean;
  sbirRisk: boolean;
  lowMidBuildupRisk: boolean;
  speechScore: number; // 0-100 — basado en RT60 vs rangos óptimos STI (IEC 60268-16)
  musicScore: number;  // 0-100 — basado en RT60 vs rangos óptimos para música en vivo
  recommendations: string[];
  axialModes: { x: number; y: number; z: number };
  aspectRatio: number; // largo/ancho — relevante para modos y flutter echo
  /** Velocidad del sonido calculada a partir de la temperatura del recinto (m/s). */
  speedOfSound: number;
  /** RT60 interpolado al nivel de ocupación actual (entre rt60Empty y rt60Audience). */
  rt60Occupied: number;
  /** Nivel de ocupación usado en este cálculo (0–100 %). */
  occupancyPct: number;
  /** Temperatura usada (°C). */
  temperature: number;
  /** Humedad relativa usada (%). */
  humidity: number;
}

// Sabine absorption coefficients (mid-frequency ~1kHz)
const absorptionCoefficients: Record<RoomMaterial, number> = {
  concrete: 0.02,
  brick: 0.03,
  drywall: 0.05,
  wood: 0.1,
  glass: 0.03,
  carpet: 0.35,
  foam: 0.7,
};

const floorAbsorption: Record<FloorType, number> = {
  concrete: 0.02,
  tile: 0.02,
  wood: 0.1,
  carpet: 0.35,
};

const ceilingAbsorption: Record<CeilingType, number> = {
  "flat": 0.03,
  "vaulted": 0.04,
  "domed": 0.06,
  "industrial": 0.03,
  "acoustic-tile": 0.7,
};

/**
 * Velocidad del sonido en función de la temperatura (ISO 9613-1).
 * v = 331.3 · √(1 + T/273.15)   [m/s]
 */
export function speedOfSoundFromTemp(tempC: number): number {
  return 331.3 * Math.sqrt(1 + tempC / 273.15);
}

export function calculateAcoustics(input: RoomScanInput, coverageH?: number): AcousticsResult {
  const {
    length, width, height, capacity,
    ceilingType, wallMaterial, floorType, windowCount,
    venueType = "club",
    temperature = 20,
    humidity = 50,
    occupancyPct = 100,
  } = input;

  // ── Condiciones ambientales ─────────────────────────────────────────────────
  const speedOfSound = speedOfSoundFromTemp(temperature);
  // Nota: a 35°C el sonido viaja ~4 m/s más rápido → los delays cambian ~1 ms cada 10 m.
  // La absorción del aire varía principalmente con la humedad (ver spl-grid.ts).

  const volume = length * width * height;

  // Surface areas
  const floorArea = length * width;
  const ceilingArea = length * width;
  const wallArea = 2 * (length * height) + 2 * (width * height);
  const windowArea = windowCount * 1.8; // ~1.8 m² por ventana (promedio)

  // Total absorption (Sabine units)
  const wallAbs = absorptionCoefficients[wallMaterial];
  const totalAbsorption =
    floorArea * floorAbsorption[floorType] +
    ceilingArea * ceilingAbsorption[ceilingType] +
    (wallArea - windowArea) * wallAbs +
    windowArea * 0.04; // vidrio

  // ── Absorción del público diferenciada por tipo de recinto ──────────────────
  // Fuente: ISO 9921, AES, Kuttruff "Room Acoustics" 5th ed.
  // Club/festival: personas paradas, ropa ligera → 0.4 sabins/persona
  // Conference: sillas tapizadas ligeras → 0.65 sabins/persona
  // Theatre: butacas tapizadas → 0.85 sabins/persona
  // El error de usar 0.5 fijo puede cambiar el RT60 calculado hasta ±30%.
  const audienceAbsPerPerson: Record<VenueType, number> = {
    club:       0.40,
    festival:   0.35,
    conference: 0.65,
    theatre:    0.85,
  };
  const audienceAbsorption = capacity * audienceAbsPerPerson[venueType];

  // Sabine RT60 = 0.161·V / A
  const rt60Empty    = (0.161 * volume) / Math.max(totalAbsorption, 1);
  const rt60Audience = (0.161 * volume) / Math.max(totalAbsorption + audienceAbsorption, 1);

  // Schroeder: fS = (c/π)·√(π·RT60/V) ≈ (c/5.55)·√(RT60/V)
  // A 20°C: c=343 → 343/5.55 ≈ 61.8; ×√(RT60/V) = 2000·√(RT60/V) (aprox. tradicional)
  // Con temperatura real: factor = (speedOfSound / 343) * 2000
  const schroederFactor = (speedOfSound / 343) * 2000;
  const schroederFreq = Math.round(schroederFactor * Math.sqrt(rt60Audience / Math.max(volume, 1)));

  // ── RT60 interpolado por ocupación ──────────────────────────────────────────
  // El público es el mayor absorbente de alta frecuencia en la sala.
  // A sala llena (occupancyPct=100) → rt60Audience. Vacía (0%) → rt60Empty.
  // Interpolación lineal: rt60Occupied = rt60Empty − (rt60Empty − rt60Audience) × occ/100
  const occ = Math.max(0, Math.min(100, occupancyPct));
  const rt60Occupied = rt60Empty - (rt60Empty - rt60Audience) * (occ / 100);

  // ── Distancia crítica con factor de directividad Q ──────────────────────────
  // Dc = 0.057·√(Q·V / RT60)  — Kuttruff, Room Acoustics 5th ed. eq. 9.4
  // Q se deriva del ángulo de cobertura horizontal real del top seleccionado.
  // Relación aproximada: Q ≈ (180/coverageH)² × π/4  (modelo esférico simplificado)
  // Valores de referencia: 120° → Q≈2, 90° → Q≈4, 60° → Q≈8, 40° → Q≈14
  // Si no hay gear seleccionado, usar Q=4 (top 90° típico de club).
  const effectiveCoverageH = coverageH ?? (venueType === "theatre" ? 60 : 90);
  const Q_speaker = Math.max(1.5, Math.min(16, Math.round((180 / effectiveCoverageH) ** 2 * (Math.PI / 4) * 10) / 10));
  const criticalDistance = 0.057 * Math.sqrt(Q_speaker * volume / Math.max(rt60Audience, 0.1));

  // Echo risk
  let echoRisk: "low" | "medium" | "high" = "low";
  if (rt60Audience > 2.5) echoRisk = "high";
  else if (rt60Audience > 1.5) echoRisk = "medium";

  // ── Flutter echo ────────────────────────────────────────────────────────────
  // Flutter echo requiere DOS condiciones: paredes paralelas Y reflectivas.
  // Además, la severidad crece con la relación largo/ancho — salas muy simétricas
  // (ratio cercano a 1:1) son más propensas que salas rectangulares largas.
  // Fuente: Barron "Auditorium Acoustics and Architectural Design" cap. 3.
  const isReflectiveWall = wallMaterial === "concrete" || wallMaterial === "brick" || wallMaterial === "glass";
  // Salas muy cuadradas (ratio < 1.4) tienen el peor flutter: las reflexiones
  // laterales coinciden en frecuencia con las frontales.
  const aspectRatio = Math.max(length, width) / Math.min(length, width);
  const hasProblematicGeometry = aspectRatio < 2.0; // paredes opuestas bien paralelas
  const flutterEchoRisk = isReflectiveWall && hasProblematicGeometry;

  // ── SBIR (Sub-Bass Interference Response) ───────────────────────────────────
  // SBIR ocurre cuando un sub está cerca de una pared reflectiva y su longitud
  // de onda crea cancelación a λ/4 de la distancia a la pared.
  // Riesgo alto: sala baja (techo < 4m) O sala pequeña (ancho < 10m).
  // En ambos casos el sub estará inevitablemente a menos de λ/4 de un límite.
  const sbirRisk = height < 4.0 || width < 10 || length < 12;

  // Low-mid buildup
  const lowMidBuildupRisk = rt60Audience > 1.8 || (wallMaterial === "concrete" && floorType === "concrete");

  // Axial modes (first mode) — usa velocidad del sonido real
  const axialModes = {
    x: Math.round(speedOfSound / (2 * length)),
    y: Math.round(speedOfSound / (2 * width)),
    z: Math.round(speedOfSound / (2 * height)),
  };

  // ── Speech Transmission Index aproximado (basado en RT60 y Schroeder) ────────
  // El STI real requiere medición, pero el RT60 es el predictor más fuerte.
  // Rango ideal para inteligibilidad de voz amplificada: RT60 0.4–0.8s (IEC 60268-16)
  // Cada 0.1s por encima de 0.8s reduce el STI ~0.05 (correlación de Peutz, 1971).
  // La fórmula lineal anterior era demasiado agresiva — un RT60 de 1.2s daba score 70
  // cuando en realidad sigue siendo usable con un buen sistema de PA.
  let speechScore: number;
  if (rt60Audience <= 0.8) {
    // Zona ideal: penalizar levemente salas muy secas (< 0.4s)
    speechScore = rt60Audience < 0.4
      ? Math.round(70 + rt60Audience * 75)  // muy seca → algo artificial
      : 100;
  } else if (rt60Audience <= 1.5) {
    // Zona aceptable con buen PA: degradación gradual
    speechScore = Math.round(100 - (rt60Audience - 0.8) * 43);
  } else {
    // Zona problemática: degradación acelerada
    speechScore = Math.round(70 - (rt60Audience - 1.5) * 40);
  }
  speechScore = Math.max(0, Math.min(100, speechScore));

  // Music score: ideal para música en vivo es 1.0–1.8s (ISO 3382, Beranek 2004)
  // Clubs/festivales: RT60 0.8–1.2s es perfectamente funcional
  // Salas de concierto clásico: 1.8–2.2s (no aplica para PA)
  let musicScore: number;
  if (rt60Audience >= 0.8 && rt60Audience <= 1.8) {
    // Zona ideal para música amplificada en vivo
    const center = 1.2;
    musicScore = Math.round(100 - Math.abs(rt60Audience - center) * 25);
  } else if (rt60Audience < 0.8) {
    musicScore = Math.round(75 - (0.8 - rt60Audience) * 60);
  } else {
    musicScore = Math.round(75 - (rt60Audience - 1.8) * 35);
  }
  musicScore = Math.max(0, Math.min(100, musicScore));

  const recommendations: string[] = [];
  if (rt60Audience > 2.0) recommendations.push("RT60 elevado — agregar tratamiento acústico en paredes y cielorraso");
  else if (rt60Audience > 1.5) recommendations.push("RT60 moderado — tratamiento acústico mejoraría inteligibilidad vocal");
  if (flutterEchoRisk) recommendations.push(`Riesgo de flutter echo — sala ${aspectRatio < 1.4 ? "casi cuadrada" : "rectangular"} con paredes reflectivas: difusores recomendados`);
  if (sbirRisk) recommendations.push("Riesgo de SBIR — alejar los subs de las paredes y esquinas al menos λ/4 (≈1.4m a 60Hz)");
  if (lowMidBuildupRisk) recommendations.push("Acumulación de medios-bajos probable — cortar 200–400 Hz en DSP con notch o shelf");
  if (rt60Audience < 0.4) recommendations.push("Sala muy seca (RT60 < 0.4s) — agregar reverberación artificial si es necesario para música");
  if (criticalDistance < 4) recommendations.push(`Distancia crítica corta (${criticalDistance.toFixed(1)} m) — público más allá de esa distancia estará en campo difuso: considerar delays o sistema distribuido`);
  if (windowCount > 4) recommendations.push("Múltiples ventanas — reflexiones de vidrio pueden causar comb filtering: colocar absorbentes o deflectores en cristales grandes");
  if (aspectRatio < 1.2 && !flutterEchoRisk) recommendations.push("Sala casi cuadrada — modos de sala muy pronunciados en baja frecuencia: prestar atención al modal EQ");
  if (recommendations.length === 0) recommendations.push("Buenas condiciones acústicas — configuración de PA estándar aplicable sin tratamiento adicional");

  return {
    volume: Math.round(volume),
    rt60Empty: Math.round(rt60Empty * 100) / 100,
    rt60Audience: Math.round(rt60Audience * 100) / 100,
    rt60Occupied: Math.round(rt60Occupied * 100) / 100,
    occupancyPct: occ,
    speedOfSound: Math.round(speedOfSound * 10) / 10,
    temperature,
    humidity,
    echoRisk,
    schroederFreq,
    criticalDistance: Math.round(criticalDistance * 10) / 10,
    flutterEchoRisk,
    sbirRisk,
    lowMidBuildupRisk,
    speechScore,
    musicScore,
    recommendations,
    axialModes,
    aspectRatio: Math.round(aspectRatio * 100) / 100,
  };
}
