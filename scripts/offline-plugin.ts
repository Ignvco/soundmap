import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import type { Plugin } from "vite";
export function offlinePlugin(): Plugin {
  let out = "dist";
  return {
    name: "soundmap-complete-offline",
    apply: "build",
    configResolved(c) {
      out = c.build.outDir;
    },
    closeBundle() {
      const walk = (dir: string): string[] =>
        readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory()
            ? walk(path.join(dir, e.name))
            : [path.join(dir, e.name)],
        );
      const files = walk(out).filter(
        (f) => !f.endsWith("sw.js") && !f.endsWith(".map"),
      );
      const hash = createHash("sha256");
      for (const f of files.sort()) {
        hash.update(f);
        hash.update(readFileSync(f));
      }
      const version = hash.digest("hex").slice(0, 16),
        urls = files.map(
          (f) => "/" + path.relative(out, f).replaceAll(path.sep, "/"),
        );
      const template = readFileSync("scripts/sw-template.js", "utf8");
      writeFileSync(
        path.join(out, "sw.js"),
        `const VERSION=${JSON.stringify(version)};\nconst URLS=${JSON.stringify(urls)};\n${template}`,
      );
    },
  };
}
