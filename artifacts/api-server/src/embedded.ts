export async function createGlamApiApp() {
  if (!process.env.DATABASE_URL && process.env.GLAM_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.GLAM_DATABASE_URL;
  }

  const { createApp } = await import("./app");
  const apiPrefix = process.env.GLAM_API_PREFIX ?? "/glam-api/api";
  return createApp({ apiPrefix });
}
