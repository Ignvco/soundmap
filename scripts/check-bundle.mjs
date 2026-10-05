import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import assert from "node:assert/strict";
const html = fs.readFileSync("dist/index.html", "utf8"),
  entry = html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
assert(entry, "Missing application entry");
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((f) =>
      f.isDirectory() ? walk(path.join(dir, f.name)) : [path.join(dir, f.name)],
    );
const files = walk("dist"),
  bytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0),
  entryGzip = zlib.gzipSync(fs.readFileSync("dist" + entry)).length;
assert(entryGzip <= 350 * 1024, `Entry exceeds 350 KiB gzip: ${entryGzip}`);
assert(bytes <= 12 * 1024 * 1024, `Offline release exceeds 12 MiB: ${bytes}`);
assert(!html.includes("fonts.googleapis.com"), "Remote startup font");
console.log(
  JSON.stringify(
    {
      entryGzip,
      releaseBytes: bytes,
      files: files.length,
      budgets: { entryGzip: 350 * 1024, releaseBytes: 12 * 1024 * 1024 },
    },
    null,
    2,
  ),
);
