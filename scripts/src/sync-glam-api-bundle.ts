import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const sourceDir = path.join(repoRoot, "artifacts/api-server/dist");
const targetDir = process.env.GLAM_API_BUNDLE_TARGET
  ? path.resolve(process.env.GLAM_API_BUNDLE_TARGET)
  : path.resolve(repoRoot, "../WhisperSpeechServer/glam-api");

async function ensureDirectory(directory: string) {
  const info = await stat(directory).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`Expected directory to exist: ${directory}`);
  }
}

async function main() {
  await ensureDirectory(sourceDir);
  await mkdir(targetDir, { recursive: true });

  const files = await readdir(sourceDir);
  const bundleFiles = files.filter((file) => file.endsWith(".mjs") || file.endsWith(".mjs.map"));

  if (bundleFiles.length === 0) {
    throw new Error(`No built API bundle files found in ${sourceDir}. Run pnpm --filter @workspace/api-server run build first.`);
  }

  await Promise.all(
    bundleFiles.map((file) => copyFile(path.join(sourceDir, file), path.join(targetDir, file))),
  );

  console.log(`Synced ${bundleFiles.length} Glam API bundle files to ${targetDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
