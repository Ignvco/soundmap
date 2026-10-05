import { Field } from "@/components/soundmap/audit-fields";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { calculateAcoustics } from "@/lib/audio/acoustics";
import { sceneSchema } from "@/lib/audit/validation";
import { cloudConfigured } from "@/lib/cloud-session";
import { hasUnsavedRevision, useAppStore, type Scene } from "@/store/app";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { CatalogPanel } from "./catalog-panel";
export default function Collaboration() {
  const auth = useAuth();
  return (
    <main className="audit-page space-y-5">
      <h1 className="text-2xl font-semibold">Colaboración privada</h1>
      <p>
        Publica revisiones guardadas en un espacio con permisos. La edición
        local conserva su copia y los conflictos no sobrescriben revisiones.
      </p>
      {!cloudConfigured ? (
        <p>
          Esta instalación funciona localmente. La conexión de cuentas y el
          servicio privado requieren configurar el proveedor de identidad y el
          backend antes de su despliegue.
        </p>
      ) : !auth.isAuthenticated ? (
        <>
          <button
            className="audit-button"
            disabled={auth.isLoading}
            onClick={() => auth.signIn().catch((e) => toast.error(e.message))}
          >
            Conectar cuenta
          </button>
          {auth.error && <p role="alert">{auth.error.message}</p>}
        </>
      ) : (
        <>
          <button className="audit-button" onClick={auth.signOut}>
            Desconectar cuenta
          </button>
          <Connected />
        </>
      )}
    </main>
  );
}
function Connected() {
  const auth = useConvexAuth();
  return auth.isAuthenticated ? (
    <>
      <Workspace />
      <CatalogPanel />
    </>
  ) : (
    <p role="status">Verificando permisos del servicio…</p>
  );
}
function Workspace() {
  const workspaces = useQuery(api.workspaces.list),
    me = useQuery(api.workspaces.whoami),
    create = useMutation(api.workspaces.create),
    append = useMutation(api.workspaces.append),
    setMember = useMutation(api.workspaces.setMember);
  const [selected, setSelected] = useState<Id<"workspaces"> | null>(null),
    [name, setName] = useState(""),
    [member, setMemberId] = useState(""),
    [role, setRole] = useState<"editor" | "viewer">("viewer");
  const revisions = useQuery(
      api.workspaces.revisions,
      selected ? { workspaceId: selected } : "skip",
    ),
    members = useQuery(
      api.workspaces.members,
      selected ? { workspaceId: selected } : "skip",
    ),
    state = useAppStore(),
    workspace = workspaces?.find((w) => w._id === selected),
    scene = state.scenes.find((s) => s.id === state.activeSceneId);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success("Operación completada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <p className="text-xs break-all">
        Tu identificador para recibir acceso: {me}
      </p>
      <div className="flex gap-2">
        <input
          className="audit-input"
          aria-label="Nombre del espacio"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
        <button
          className="audit-button"
          disabled={!name.trim()}
          onClick={() => run(async () => setSelected(await create({ name })))}
        >
          Crear espacio
        </button>
      </div>
      <Field label="Espacio">
        <select
          className="audit-input"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value as Id<"workspaces">)}
        >
          <option value="">Seleccionar</option>
          {workspaces?.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name} · {w.role}
            </option>
          ))}
        </select>
      </Field>
      {workspace && (
        <>
          <p>Revisión remota actual: {workspace.head}</p>
          <button
            className="audit-button"
            disabled={
              !scene || hasUnsavedRevision(state) || workspace.role === "viewer"
            }
            onClick={() =>
              run(() =>
                append({
                  workspaceId: workspace._id,
                  expectedHead: workspace.head,
                  clientId: scene!.id,
                  data: JSON.stringify(scene),
                }),
              )
            }
          >
            Publicar revisión local guardada
          </button>
          <p className="text-sm text-muted-foreground">
            Incluye técnico, cliente, hallazgos y mediciones del expediente.
            Solo los miembros pueden leerlo. Archivos superiores a 700 kB se
            comparten mediante backup.
          </p>
          {revisions?.map((r) => (
            <div
              key={r._id}
              className="border border-border rounded-xl p-3 flex flex-wrap items-center gap-3"
            >
              <span>
                Revisión {r.revision} ·{" "}
                {new Date(r._creationTime).toLocaleString()}
              </span>
              <button
                className="audit-button"
                onClick={() => {
                  if (
                    hasUnsavedRevision(state) &&
                    !window.confirm(
                      "¿Reemplazar el borrador local con esta revisión?",
                    )
                  )
                    return;
                  try {
                    const parsed = sceneSchema.parse(JSON.parse(r.data));
                    const s = {
                      ...parsed,
                      acoustics: calculateAcoustics(parsed.room),
                    } as Scene;
                    state.upsertScene(s);
                    state.loadScene(s.id);
                  } catch {
                    toast.error("Revisión incompatible");
                  }
                }}
              >
                Cargar copia local
              </button>
            </div>
          ))}
          <h2 className="text-lg font-semibold">Miembros</h2>
          {members?.map((m) => (
            <div
              key={m._id}
              className="flex flex-wrap gap-2 items-center text-xs break-all"
            >
              <span>
                {m.identity} · {m.role}
              </span>
              {workspace.role === "owner" && m.role !== "owner" && (
                <button
                  className="audit-button"
                  onClick={() =>
                    run(() =>
                      setMember({
                        workspaceId: workspace._id,
                        memberIdentifier: m.identity,
                        role: "remove",
                      }),
                    )
                  }
                >
                  Retirar acceso
                </button>
              )}
            </div>
          ))}
          {workspace.role === "owner" && (
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Identificador de cuenta">
                <input
                  className="audit-input"
                  value={member}
                  onChange={(e) => setMemberId(e.target.value)}
                />
              </Field>
              <Field label="Permiso">
                <select
                  className="audit-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                >
                  <option value="viewer">Lectura</option>
                  <option value="editor">Edición y publicación</option>
                </select>
              </Field>
              <button
                className="audit-button"
                disabled={!member.trim()}
                onClick={() =>
                  run(() =>
                    setMember({
                      workspaceId: workspace._id,
                      memberIdentifier: member,
                      role,
                    }),
                  )
                }
              >
                Conceder acceso
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
