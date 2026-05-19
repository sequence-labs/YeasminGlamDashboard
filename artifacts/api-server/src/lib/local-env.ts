import fs from "node:fs";
import path from "node:path";

const localEnvRelativePath = path.join(".local", "deployment-secrets.env");

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex <= 0) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function findLocalEnvFile(startDir: string) {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, localEnvRelativePath);
    if (fs.existsSync(candidate)) return candidate;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

export function loadLocalDeploymentEnv() {
  if (process.env.NODE_ENV === "production") return;

  const envFile = findLocalEnvFile(process.cwd());
  if (!envFile) return;

  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] != null) continue;
    process.env[parsed.key] = parsed.value;
  }
}

loadLocalDeploymentEnv();
