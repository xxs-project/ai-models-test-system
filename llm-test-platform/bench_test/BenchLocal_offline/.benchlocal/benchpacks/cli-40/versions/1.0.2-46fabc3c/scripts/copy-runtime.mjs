import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const distVerificationDir = path.join(distDir, "verification");

await mkdir(distDir, { recursive: true });
await cp(path.join(rootDir, "verification"), distVerificationDir, {
  recursive: true,
  force: true
});
