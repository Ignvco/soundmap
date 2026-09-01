// SoundMap — Stage Map 3D (Three.js / R3F)
// Cinematic 3D visualization of the stage deployment.
//
// Isolated as a .jsx (no TypeScript syntax) so that R3F v9's ambient JSX
// augmentation from @react-three/fiber does not leak into the main app's
// compilation unit. The public shape is declared in `stage-3d.d.ts`.
//
// REFACTOR ATTEMPTED (Feb 2026): converting this to .tsx cascades type
// errors across ~15 unrelated files (lucide-react icons compiled against
// ThreeElements namespace). Keeping .jsx + .d.ts isolation until R3F ships
// a fix (see https://github.com/pmndrs/react-three-fiber/issues around
// React 19 JSX namespace pollution).
import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Html, Text } from "@react-three/drei";
import * as THREE from "three";

const COLORS = {
  accent: "#00FF9E",
  info: "#5EEAD4",
  dsp: "#B794F6",
  live: "#FF3EA5",
  warning: "#FFB84D",
  destructive: "#FF4D6D",
};

// ── Room shell (transparent walls, floor grid) ──────────────────────────────
function Room({ room }) {
  const w = room.width;
  const l = room.length;
  const h = room.height;
  return (
    <group>
      <mesh position={[0, -0.005, 0]} receiveShadow>
        <boxGeometry args={[w, 0.01, l]} />
        <meshStandardMaterial color="#0A0D10" roughness={0.9} metalness={0.05} />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[w * 1.4, l * 1.4]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1F2429"
        sectionSize={5}
        sectionThickness={1.2}
        sectionColor="#3A4048"
        fadeDistance={Math.max(w, l) * 1.2}
        fadeStrength={1}
        infiniteGrid={false}
      />
      {[
        { pos: [0, h / 2, -l / 2], size: [w, h, 0.05] },
        { pos: [0, h / 2, l / 2], size: [w, h, 0.05] },
        { pos: [-w / 2, h / 2, 0], size: [0.05, h, l] },
        { pos: [w / 2, h / 2, 0], size: [0.05, h, l] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos}>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color="#5EEAD4"
            transparent
            opacity={0.03}
            roughness={0.4}
            emissive="#5EEAD4"
            emissiveIntensity={0.02}
          />
        </mesh>
      ))}
      <lineSegments position={[0, 0, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, l)]} />
        <lineBasicMaterial color="#3A4048" />
      </lineSegments>
    </group>
  );
}

function Stage({ room }) {
  const stageDepth = room.length * 0.12;
  const stageHeight = 0.6;
  return (
    <group>
      <mesh
        position={[0, stageHeight / 2, -room.length / 2 + stageDepth / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[room.width * 0.9, stageHeight, stageDepth]} />
        <meshStandardMaterial color="#111417" roughness={0.7} metalness={0.15} />
      </mesh>
      <Text
        position={[0, stageHeight + 0.05, -room.length / 2 + stageDepth / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color="#3A4048"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.2}
      >
        ESCENARIO
      </Text>
    </group>
  );
}

function TopCluster({ position, count, model, color, coverageH = 90, throwDist }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.005;
    }
  });
  const coneRadius = throwDist * Math.tan((coverageH / 2) * (Math.PI / 180));
  const coneHeight = throwDist;
  return (
    <group ref={ref} position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[0, -i * 0.42, 0]} castShadow>
          <boxGeometry args={[0.7, 0.4, 0.55]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.35}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, coneHeight / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[coneRadius, coneHeight, 32, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0.5]} color={color} intensity={0.6} distance={8} />
      <Html position={[0, 0.5, 0]} center distanceFactor={12} occlude={false}>
        <div
          className="pointer-events-none rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.28em] whitespace-nowrap"
          style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
        >
          {model}
        </div>
      </Html>
    </group>
  );
}

function SubArray({ position, count, color, model }) {
  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          position={[i * 0.85 - ((count - 1) * 0.85) / 2, 0.4, 0]}
          castShadow
        >
          <boxGeometry args={[0.75, 0.8, 0.7]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.35}
            roughness={0.35}
            metalness={0.7}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 3.5, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, 0.4, 0]} color={color} intensity={0.9} distance={5} />
      <Html position={[0, -0.05, 0]} center distanceFactor={12} occlude={false}>
        <div
          className="pointer-events-none rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.28em] whitespace-nowrap"
          style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
        >
          {model}
        </div>
      </Html>
    </group>
  );
}

function Monitor({ position, color }) {
  return (
    <group position={position} rotation={[Math.PI / 8, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.45, 0.28, 0.35]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.35}
          roughness={0.45}
        />
      </mesh>
    </group>
  );
}

function DelayTower({ position, color }) {
  return (
    <group position={position}>
      {[-0.4, 0.4].map((x, i) => (
        <mesh key={i} position={[x, position[1] > 0 ? -position[1] / 2 : 0, 0]}>
          <cylinderGeometry
            args={[0.03, 0.03, position[1] > 0 ? position[1] : 4, 8]}
          />
          <meshStandardMaterial color="#666" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {[0, -0.5, -1].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow>
          <boxGeometry args={[0.55, 0.35, 0.45]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      ))}
      <pointLight color={color} intensity={0.5} distance={6} />
    </group>
  );
}

function AudienceHeatmap({ room, splFront, splRear, splGrid }) {
  const geometry = useMemo(() => {
    const w = room.width;
    const l = room.length * 0.85;
    const gridW = 40;
    const gridL = 60;
    const geom = new THREE.PlaneGeometry(w, l, gridW, gridL);
    const colors = [];
    const pos = geom.attributes.position;

    // If we have a real SPL grid, use it (bilinear sample). Otherwise fallback
    // to the front→rear linear interpolation the previous implementation had.
    const hasGrid = splGrid && splGrid.rows > 0 && splGrid.cols > 0 && Array.isArray(splGrid.cells);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      let spl;
      if (hasGrid) {
        // Map plane coords (x in [-w/2, w/2], y in [-l/2, l/2]) → grid uv
        const u = (x + w / 2) / w; // 0..1 left→right
        const v = (y + l / 2) / l; // 0..1 front(stage)→rear(audience)
        const cu = Math.min(splGrid.cols - 1, Math.max(0, u * (splGrid.cols - 1)));
        const cv = Math.min(splGrid.rows - 1, Math.max(0, v * (splGrid.rows - 1)));
        const c0 = Math.floor(cu);
        const c1 = Math.min(splGrid.cols - 1, c0 + 1);
        const r0 = Math.floor(cv);
        const r1 = Math.min(splGrid.rows - 1, r0 + 1);
        const fx = cu - c0;
        const fy = cv - r0;
        const a = splGrid.cells[r0 * splGrid.cols + c0];
        const b = splGrid.cells[r0 * splGrid.cols + c1];
        const c = splGrid.cells[r1 * splGrid.cols + c0];
        const d = splGrid.cells[r1 * splGrid.cols + c1];
        spl = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
      } else {
        const t = (y + l / 2) / l;
        spl = splFront + (splRear - splFront) * t;
      }

      const col = new THREE.Color();
      if (spl > 105) col.set("#FF3EA5");
      else if (spl > 98) col.set("#FFB84D");
      else if (spl > 92) col.set("#00FF9E");
      else col.set("#5EEAD4");
      const edgeFalloff = 1 - Math.pow(Math.abs(x) / (w / 2), 2.5) * 0.5;
      col.multiplyScalar(edgeFalloff);
      colors.push(col.r, col.g, col.b);
    }
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geom;
  }, [room.width, room.length, splFront, splRear, splGrid]);

  const zOffset = room.length * 0.075;
  return (
    <mesh
      geometry={geometry}
      position={[0, 0.02, zOffset]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={0.28}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Scene3D({ room, config, tops, subs, monitors, splGrid }) {
  const stageDepthFrac = 0.12;
  const stageZ = -room.length / 2 + (room.length * stageDepthFrac) / 2;

  const topCount = tops.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const subCount = subs.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const monCount = Math.min(6, monitors.reduce((s, g) => s + (g.quantity ?? 1), 0));
  const topModel = tops[0]?.model ?? "Top";
  const subModel = subs[0]?.model ?? "Sub";
  const coverageH = tops[0]?.coverageH ?? 90;
  const throwDist = room.length * 0.7;
  const topsPerSide = Math.ceil(topCount / 2);
  const deployMode = config.deploymentMode;

  return (
    <>
      <color attach="background" args={["#04060A"]} />
      <fog attach="fog" args={["#04060A", 15, 60]} />

      <ambientLight intensity={0.35} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, room.height * 0.9, 0]} intensity={0.4} color="#5EEAD4" />

      <Room room={room} />
      <Stage room={room} />

      <AudienceHeatmap
        room={room}
        splFront={config.splFront}
        splRear={config.splRear}
        splGrid={splGrid}
      />

      {topCount > 0 && (
        <>
          <TopCluster
            position={[-room.width * 0.32, room.height * 0.75, stageZ + 0.6]}
            count={topsPerSide}
            model={topModel}
            color={COLORS.info}
            coverageH={coverageH}
            throwDist={throwDist}
          />
          {topCount > 1 && (
            <TopCluster
              position={[room.width * 0.32, room.height * 0.75, stageZ + 0.6]}
              count={topCount - topsPerSide}
              model={topModel}
              color={COLORS.info}
              coverageH={coverageH}
              throwDist={throwDist}
            />
          )}
        </>
      )}

      {subCount > 0 &&
        (() => {
          if (deployMode === "center-cluster" || subCount <= 2) {
            return (
              <SubArray
                position={[0, 0, stageZ + 1.2]}
                count={subCount}
                color={COLORS.dsp}
                model={subModel}
              />
            );
          }
          if (deployMode === "distributed" || deployMode === "wide-stereo") {
            const halfL = Math.ceil(subCount / 2);
            return (
              <>
                <SubArray
                  position={[-room.width * 0.28, 0, stageZ + 1.2]}
                  count={halfL}
                  color={COLORS.dsp}
                  model={subModel}
                />
                <SubArray
                  position={[room.width * 0.28, 0, stageZ + 1.2]}
                  count={subCount - halfL}
                  color={COLORS.dsp}
                  model={subModel}
                />
              </>
            );
          }
          return (
            <SubArray
              position={[0, 0, stageZ + 1.2]}
              count={subCount}
              color={COLORS.dsp}
              model={subModel}
            />
          );
        })()}

      {Array.from({ length: monCount }).map((_, i) => {
        const t =
          monCount === 1
            ? 0
            : (i - (monCount - 1) / 2) / Math.max(1, monCount - 1);
        return (
          <Monitor
            key={i}
            position={[t * room.width * 0.6, 0.65, stageZ + 0.4]}
            color={COLORS.accent}
          />
        );
      })}

      {config.needsDelayTowers && (
        <>
          <DelayTower
            position={[
              -room.width * 0.35,
              room.height * 0.6,
              -room.length / 2 + config.delayTowerDistance,
            ]}
            color={COLORS.warning}
          />
          <DelayTower
            position={[
              room.width * 0.35,
              room.height * 0.6,
              -room.length / 2 + config.delayTowerDistance,
            ]}
            color={COLORS.warning}
          />
        </>
      )}

      <Environment preset="night" background={false} />
    </>
  );
}

export function Stage3D(props) {
  const { room } = props;
  const cameraPos = [
    room.width * 0.55,
    room.height * 0.9,
    room.length * 0.65,
  ];
  const target = [0, room.height * 0.3, -room.length / 3];

  return (
    <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden border border-border bg-[#04060A]">
      <Canvas
        shadows
        camera={{ position: cameraPos, fov: 45, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        data-testid="stage-3d-canvas"
      >
        <Suspense fallback={null}>
          <Scene3D {...props} />
          <OrbitControls
            target={target}
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={Math.max(room.width, room.length) * 2.2}
            maxPolarAngle={Math.PI / 2 - 0.05}
            dampingFactor={0.08}
          />
        </Suspense>
      </Canvas>

      <div className="absolute top-3 left-3 rounded-2xl bg-black/60 border border-border backdrop-blur-md px-3 py-2 pointer-events-none">
        <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-info">
          Vista 3D
        </p>
        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
          {room.length}×{room.width}×{room.height}m · {room.capacity} pax
        </p>
      </div>
      <div className="absolute top-3 right-3 rounded-2xl bg-black/60 border border-border backdrop-blur-md px-3 py-2 pointer-events-none">
        <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Arrastrá · Zoom · Rotá
        </p>
      </div>

      <div className="absolute bottom-3 left-3 rounded-2xl bg-black/70 border border-border backdrop-blur-md px-3 py-2 pointer-events-none">
        <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-1.5">
          SPL Audiencia
        </p>
        <div className="flex items-center gap-1.5">
          {[
            { color: "#5EEAD4", label: "<92" },
            { color: "#00FF9E", label: "92-98" },
            { color: "#FFB84D", label: "98-105" },
            { color: "#FF3EA5", label: ">105" },
          ].map((step) => (
            <div key={step.label} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: step.color }} />
              <span className="text-[9px] font-mono text-muted-foreground">
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
