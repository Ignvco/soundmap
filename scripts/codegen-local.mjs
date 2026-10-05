// Generate types from the installed Convex templates without connecting to a deployment.
import { serverCodegen } from "../node_modules/convex/dist/esm/cli/codegen_templates/server.js";
import { apiCodegen } from "../node_modules/convex/dist/esm/cli/codegen_templates/api.js";
import { writeFileSync } from "node:fs";
const keys = [
  "ANTHROPIC_API_KEY",
  "ADVISOR_MODEL",
  "ALLOWED_ORIGINS",
  "AUTH_ISSUER",
  "AUTH_AUDIENCE",
  "MODERATOR_IDS",
];
const server = serverCodegen({
  useTypeScript: false,
  envVars: keys.map((k) => [
    k,
    { type: "value", value: '{"type":"string"}', optional: true },
  ]),
});
const api = apiCodegen(
  ["aiAdvisor.ts", "http.ts", "quotas.ts", "workspaces.ts", "catalog.ts"],
  { useTypeScript: false },
);
for (const [name, result] of Object.entries({ server, api })) {
  writeFileSync(
    `convex/_generated/${name}.js`,
    result.JS.replace(/[ \t]+$/gm, "").trimEnd() + "\n",
  );
  writeFileSync(
    `convex/_generated/${name}.d.ts`,
    result.DTS.replace(/[ \t]+$/gm, "").trimEnd() + "\n",
  );
}
