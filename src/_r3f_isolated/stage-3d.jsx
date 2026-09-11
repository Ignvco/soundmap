// R3F stays isolated from the application's TypeScript JSX namespace.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import {
  Box,
  Eye,
  EyeOff,
  Minus,
  Plus,
  RotateCcw,
  Layers3,
} from "lucide-react";
import * as THREE from "three";
import {
  coverageVertices,
  SPL_STOPS,
  venueSpeakers,
} from "@/lib/venue-visual.ts";

function Block({
  position,
  size,
  color = "#151719",
  edge = "#3a3d3f",
  opacity = 1,
  rotation,
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity === 1}
      />
      <Edges color={edge} transparent opacity={0.6} />
    </mesh>
  );
}

function Architecture({ room }) {
  const { width: w, length: l, height: h } = room;
  const stageDepth = l * 0.12;
  const ribs = Math.min(16, Math.max(4, Math.round(l / 2)));
  return (
    <group>
      <Block
        position={[0, -0.13, 0]}
        size={[w, 0.24, l]}
        color="#111314"
        edge="#666a6b"
      />
      <Block position={[0, h / 2, -l / 2]} size={[w, h, 0.1]} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[(side * w) / 2, h / 2, 0]}
            size={[0.035, h, l]}
            opacity={0.08}
          />
          {[0.04, h * 0.5, h].map((y) => (
            <Block
              key={y}
              position={[(side * w) / 2, y, 0]}
              size={[0.035, 0.035, l]}
              color="#45484a"
            />
          ))}
          {Array.from({ length: ribs + 1 }, (_, i) => (
            <Block
              key={i}
              position={[(side * w) / 2, h / 2, -l / 2 + (i * l) / ribs]}
              size={[0.035, h, 0.035]}
              color="#383b3c"
            />
          ))}
        </group>
      ))}
      <gridHelper
        args={[1, 20, "#343738", "#242728"]}
        scale={[w, 1, l]}
        position={[0, 0.005, 0]}
      />
      <Block
        position={[0, 0.3, -l / 2 + stageDepth / 2]}
        size={[w * 0.87, 0.6, stageDepth]}
        color="#232527"
        edge="#696d70"
      />
      <Block
        position={[0, 0.605, -l / 2 + stageDepth]}
        size={[w * 0.86, 0.025, 0.035]}
        color="#C9F03E"
        edge="#C9F03E"
      />
      <Block
        position={[0, h * 0.89, -l / 2 + stageDepth]}
        size={[w * 0.86, 0.12, 0.12]}
        color="#373a3c"
      />
      {Array.from({ length: 7 }, (_, i) => (
        <Block
          key={i}
          position={[(i / 6 - 0.5) * w * 0.78, h * 0.88, -l / 2 + stageDepth]}
          size={[0.14, 0.22, 0.2]}
          color="#7b823a"
          edge="#C9F03E"
        />
      ))}
    </group>
  );
}

function Audience({ room }) {
  const seats = useRef(),
    backs = useRef();
  const layout = useMemo(() => {
    const cols = Math.min(30, Math.max(2, Math.floor(room.width / 0.85)));
    const rows = Math.min(
      32,
      Math.max(2, Math.floor((room.length * 0.64) / 1.05)),
    );
    const count = Math.min(cols * rows, Math.max(0, Math.round(room.capacity)));
    return { cols, rows: Math.ceil(count / cols), count };
  }, [room.width, room.length, room.capacity]);
  useLayoutEffect(() => {
    const object = new THREE.Object3D();
    for (let i = 0; i < layout.count; i++) {
      const col = i % layout.cols,
        row = Math.floor(i / layout.cols);
      const x = ((col + 0.5) / layout.cols - 0.5) * room.width * 0.8;
      const z =
        -room.length * 0.22 +
        (row / Math.max(1, layout.rows - 1)) * room.length * 0.63;
      object.position.set(x + Math.sign(x) * room.width * 0.025, 0.3, z);
      object.updateMatrix();
      seats.current.setMatrixAt(i, object.matrix);
      object.position.y = 0.55;
      object.position.z += 0.2;
      object.updateMatrix();
      backs.current.setMatrixAt(i, object.matrix);
    }
    for (const mesh of [seats.current, backs.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [layout, room.width, room.length]);
  return (
    <group>
      <instancedMesh ref={seats} args={[undefined, undefined, layout.count]}>
        <boxGeometry args={[0.45, 0.12, 0.43]} />
        <meshStandardMaterial color="#343735" roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={backs} args={[undefined, undefined, layout.count]}>
        <boxGeometry args={[0.45, 0.46, 0.085]} />
        <meshStandardMaterial color="#41443e" roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

function splColor(db) {
  const hi = SPL_STOPS.findIndex((s) => s.db >= db);
  if (hi === 0) return new THREE.Color(SPL_STOPS[0].color);
  if (hi < 0) return new THREE.Color(SPL_STOPS.at(-1).color);
  const a = SPL_STOPS[hi - 1],
    b = SPL_STOPS[hi];
  return new THREE.Color(a.color).lerp(
    new THREE.Color(b.color),
    (db - a.db) / (b.db - a.db),
  );
}

function Coverage({ grid }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      positions = [],
      colors = [],
      indices = [];
    coverageVertices(grid).forEach((p) => {
      positions.push(p.x, 0.085, p.z);
      const c = splColor(p.db);
      colors.push(c.r, c.g, c.b);
    });
    for (let r = 0; r < grid.rows - 1; r++)
      for (let c = 0; c < grid.cols - 1; c++) {
        const i = r * grid.cols + c;
        indices.push(
          i,
          i + grid.cols,
          i + 1,
          i + 1,
          i + grid.cols,
          i + grid.cols + 1,
        );
      }
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [grid]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.63}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function Speaker({ speaker, labels, onSelect, selected }) {
  const sub = speaker.kind === "subs",
    monitor = speaker.kind === "monitors";
  const count = Math.max(1, Math.min(16, speaker.count));
  return (
    <group
      position={[speaker.x, speaker.y, speaker.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(speaker.id);
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <group
          key={i}
          position={
            sub
              ? [(i - (count - 1) / 2) * 0.84, 0, 0]
              : [0, -i * 0.36, i * 0.015]
          }
          rotation={monitor ? [-0.35, Math.PI, 0] : [0.1, 0, 0]}
        >
          <Block
            size={sub ? [0.76, 0.76, 0.68] : [0.72, 0.32, 0.46]}
            color="#171b1b"
            edge={selected ? "#C9F03E" : "#545b44"}
          />
          <mesh
            position={[0, 0, sub ? 0.345 : 0.235]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[sub ? 0.24 : 0.095, sub ? 0.24 : 0.095, 0.012, 16]}
            />
            <meshBasicMaterial color="#A5BD51" />
          </mesh>
        </group>
      ))}
      {labels && (
        <Html position={[0, 0.7, 0]} center style={{ pointerEvents: "none" }}>
          <span className="venue-label">
            {speaker.label}
            {speaker.count > 1 ? ` ×${speaker.count}` : ""}
          </span>
        </Html>
      )}
    </group>
  );
}

function CameraRig({ room, command, interactive }) {
  const controls = useRef();
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    if (!controls.current) return;
    const radius = Math.hypot(room.width, room.length, room.height) / 2;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov =
      2 *
      Math.atan((Math.tan(vFov / 2) * size.width) / Math.max(1, size.height));
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 0.95;
    const target = new THREE.Vector3(0, room.height * 0.23, 0);
    camera.position
      .copy(target)
      .add(
        new THREE.Vector3(0.7, 0.67, 1).normalize().multiplyScalar(distance),
      );
    camera.near = 0.05;
    camera.far = Math.max(500, distance * 5);
    camera.updateProjectionMatrix();
    controls.current.target.copy(target);
    controls.current.minDistance = Math.max(1, radius * 0.4);
    controls.current.maxDistance = distance * 2;
    controls.current.update();
    controls.current.saveState();
    invalidate();
  }, [
    room.width,
    room.length,
    room.height,
    size.width,
    size.height,
    camera,
    invalidate,
  ]);
  useEffect(() => {
    if (!controls.current || !command) return;
    if (command.type === "reset") controls.current.reset();
    else {
      const delta = camera.position.clone().sub(controls.current.target);
      const distance = THREE.MathUtils.clamp(
        delta.length() * (command.type === "in" ? 0.8 : 1.25),
        controls.current.minDistance,
        controls.current.maxDistance,
      );
      camera.position
        .copy(controls.current.target)
        .add(delta.setLength(distance));
      controls.current.update();
    }
    invalidate();
  }, [command, camera, invalidate]);
  return (
    <OrbitControls
      ref={controls}
      enabled={interactive}
      enableDamping
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}

export function Stage3D({
  room,
  tops = [],
  subs = [],
  monitors = [],
  splGrid,
  speakers,
  className = "",
  compact = false,
  interactive = true,
  selectedId,
  onSelect,
}) {
  const [webgl, setWebgl] = useState(null);
  const [labels, setLabels] = useState(!compact),
    [coverage, setCoverage] = useState(true),
    [command, setCommand] = useState(null);
  useEffect(() => {
    try {
      const probe = document.createElement("canvas").getContext("webgl2");
      setWebgl(Boolean(probe));
      probe?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setWebgl(false);
    }
  }, []);
  const units = useMemo(
    () => speakers ?? venueSpeakers(room, tops, subs, monitors),
    [speakers, room, tops, subs, monitors],
  );
  const action = (type) => setCommand({ type, time: performance.now() });
  return (
    <section
      className={`venue-view ${compact ? "venue-view-compact" : ""} ${className}`}
      aria-label={`Escenario 3D · ${room.name || "Recinto"}`}
      data-testid="venue-3d"
    >
      <div className="venue-canvas">
        {webgl === true ? (
          <Canvas
            frameloop="demand"
            dpr={[1, 1.5]}
            camera={{ fov: 38 }}
            gl={{ antialias: true, powerPreference: "default" }}
            data-testid="stage-3d-canvas"
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                "webglcontextlost",
                () => setWebgl(false),
                { once: true },
              );
            }}
          >
            <color attach="background" args={["#0a0b0c"]} />
            <ambientLight intensity={1.5} />
            <directionalLight
              position={[4, 14, 8]}
              intensity={2.5}
              color="#f1f2e7"
            />
            <directionalLight
              position={[-8, 7, -10]}
              intensity={1.3}
              color="#b4b99e"
            />
            <Architecture room={room} />
            <Audience room={room} />
            {coverage && splGrid && <Coverage grid={splGrid} />}
            {units.map((s) => (
              <Speaker
                key={s.id}
                speaker={s}
                labels={labels}
                selected={selectedId === s.id}
                onSelect={onSelect}
              />
            ))}
            <CameraRig
              room={room}
              command={command}
              interactive={interactive}
            />
          </Canvas>
        ) : (
          <div
            className="h-full flex flex-col items-center justify-center gap-3 px-8 text-center"
            role="status"
          >
            <Box size={28} className="text-muted-foreground" />
            <p className="text-sm">
              {webgl === null
                ? "Preparando escenario 3D…"
                : "WebGL no está disponible en este navegador"}
            </p>
            {webgl === false && (
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Abrí SoundMap en un navegador con WebGL 2 para explorar el
                recinto. El plano de Stage Map y los cálculos siguen
                disponibles.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="venue-topline">
        <span>
          <Box size={13} /> {room.name || "Recinto"}
        </span>
        <span className="font-mono">
          3D · {room.width} × {room.length} × {room.height} m
        </span>
      </div>
      {interactive && webgl === true && (
        <div
          className="venue-tools"
          role="toolbar"
          aria-label="Controles del escenario 3D"
        >
          <button onClick={() => action("in")} aria-label="Acercar">
            <Plus size={15} />
          </button>
          <button onClick={() => action("out")} aria-label="Alejar">
            <Minus size={15} />
          </button>
          <button
            onClick={() => action("reset")}
            aria-label="Restablecer cámara"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => setLabels((v) => !v)}
            aria-label="Etiquetas de equipos"
            aria-pressed={labels}
          >
            {labels ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          {splGrid && (
            <button
              onClick={() => setCoverage((v) => !v)}
              aria-label="Cobertura SPL"
              aria-pressed={coverage}
            >
              <Layers3 size={14} />
            </button>
          )}
        </div>
      )}
      <div className="venue-footer">
        {coverage && splGrid ? (
          <div className="venue-legend">
            <span>SPL estimado</span>
            <span className="venue-ramp" />
            <span className="font-mono">70—150+ dB</span>
          </div>
        ) : (
          <span>Geometría del recinto</span>
        )}
        <span className="hidden sm:inline">
          {interactive && webgl ? "Arrastrá para orbitar · " : ""}Audiencia
          esquemática
        </span>
      </div>
    </section>
  );
}
