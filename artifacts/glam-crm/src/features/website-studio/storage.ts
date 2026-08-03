import {
  STUDIO_IMAGE_SLOT_BY_ID,
  STUDIO_IMAGE_TYPES,
  STUDIO_MAX_IMAGE_BYTES,
  STUDIO_MENU_ITEM_BY_ID,
  type StudioMenuFieldKey,
} from "./catalog";

const DATABASE_NAME = "glam-by-yeasmin-studio";
const DATABASE_VERSION = 2;
const IMAGE_STORE_NAME = "image-overrides";
const MENU_STORE_NAME = "menu-drafts";
const EXPORT_VERSION = 2;

export interface StudioImageOverride {
  slotId: string;
  blob: Blob;
  fileName: string;
  mediaType: string;
  width: number;
  height: number;
  updatedAt: string;
}

export interface StudioMenuDraft {
  itemId: string;
  values: Partial<Record<StudioMenuFieldKey, string>>;
  updatedAt: string;
}

export interface StudioExportImageOverride
  extends Omit<StudioImageOverride, "blob"> {
  dataUrl: string;
}

export interface StudioExportPayload {
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  overrides: StudioExportImageOverride[];
  menuDrafts: StudioMenuDraft[];
}

export interface StudioImportResult {
  imageOverrides: StudioImageOverride[];
  menuDrafts: StudioMenuDraft[];
}

const acceptedMediaTypes = new Set<string>(STUDIO_IMAGE_TYPES);

export function isStudioStorageSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function requireStorageSupport() {
  if (!isStudioStorageSupported()) {
    throw new Error("Website Studio storage is unavailable in this browser.");
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("The Studio database request failed.")),
    );
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("abort", () =>
      reject(
        transaction.error ?? new Error("The Studio database update was aborted."),
      ),
    );
    transaction.addEventListener("error", () =>
      reject(
        transaction.error ?? new Error("The Studio database update failed."),
      ),
    );
  });
}

async function openStudioDatabase(): Promise<IDBDatabase> {
  requireStorageSupport();

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        database.createObjectStore(IMAGE_STORE_NAME, { keyPath: "slotId" });
      }
      if (!database.objectStoreNames.contains(MENU_STORE_NAME)) {
        database.createObjectStore(MENU_STORE_NAME, { keyPath: "itemId" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("blocked", () =>
      reject(
        new Error(
          "Website Studio storage is open in another tab. Close it and try again.",
        ),
      ),
    );
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("Website Studio storage could not open.")),
    );
  });
}

async function readAll<T>(storeName: string): Promise<T[]> {
  const database = await openStudioDatabase();
  try {
    const transaction = database.transaction(storeName, "readonly");
    return await requestResult<T[]>(transaction.objectStore(storeName).getAll());
  } finally {
    database.close();
  }
}

async function writeRecord<T>(storeName: string, record: T): Promise<void> {
  const database = await openStudioDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

async function deleteRecord(storeName: string, key: string): Promise<void> {
  const database = await openStudioDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

async function clearStore(storeName: string): Promise<void> {
  const database = await openStudioDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).clear();
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

export function readAllImageOverrides(): Promise<StudioImageOverride[]> {
  return readAll<StudioImageOverride>(IMAGE_STORE_NAME);
}

export function writeImageOverride(
  record: StudioImageOverride,
): Promise<void> {
  assertImageOverride(record);
  return writeRecord(IMAGE_STORE_NAME, record);
}

export function deleteImageOverride(slotId: string): Promise<void> {
  assertKnownSlot(slotId);
  return deleteRecord(IMAGE_STORE_NAME, slotId);
}

export function clearImageOverrides(): Promise<void> {
  return clearStore(IMAGE_STORE_NAME);
}

export function readAllMenuDrafts(): Promise<StudioMenuDraft[]> {
  return readAll<StudioMenuDraft>(MENU_STORE_NAME);
}

export function writeMenuDraft(record: StudioMenuDraft): Promise<void> {
  assertMenuDraft(record);
  return writeRecord(MENU_STORE_NAME, record);
}

export function deleteMenuDraft(itemId: string): Promise<void> {
  assertKnownMenuItem(itemId);
  return deleteRecord(MENU_STORE_NAME, itemId);
}

export function clearMenuDrafts(): Promise<void> {
  return clearStore(MENU_STORE_NAME);
}

export async function resetStudioStorage(): Promise<void> {
  const database = await openStudioDatabase();
  try {
    const transaction = database.transaction(
      [IMAGE_STORE_NAME, MENU_STORE_NAME],
      "readwrite",
    );
    transaction.objectStore(IMAGE_STORE_NAME).clear();
    transaction.objectStore(MENU_STORE_NAME).clear();
    await transactionComplete(transaction);
  } finally {
    database.close();
  }
}

function assertKnownSlot(slotId: string) {
  if (!STUDIO_IMAGE_SLOT_BY_ID.has(slotId)) {
    throw new Error(`Unknown Website Studio image slot: ${slotId || "missing ID"}.`);
  }
}

function assertKnownMenuItem(itemId: string) {
  if (!STUDIO_MENU_ITEM_BY_ID.has(itemId)) {
    throw new Error(`Unknown Website Studio menu item: ${itemId || "missing ID"}.`);
  }
}

function assertImageBlob(blob: Blob, fileName = "The selected image") {
  if (!acceptedMediaTypes.has(blob.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, AVIF, or GIF image.");
  }
  if (blob.size > STUDIO_MAX_IMAGE_BYTES) {
    throw new Error(`${fileName} is larger than 30 MB.`);
  }
}

function assertImageOverride(record: StudioImageOverride) {
  assertKnownSlot(record.slotId);
  assertImageBlob(record.blob, record.fileName);
  if (
    record.mediaType !== record.blob.type ||
    !Number.isInteger(record.width) ||
    record.width <= 0 ||
    !Number.isInteger(record.height) ||
    record.height <= 0
  ) {
    throw new Error("The selected image has invalid metadata.");
  }
}

function assertMenuDraft(record: StudioMenuDraft) {
  assertKnownMenuItem(record.itemId);
  const item = STUDIO_MENU_ITEM_BY_ID.get(record.itemId)!;
  const allowedFields = new Map(item.fields.map((field) => [field.key, field]));
  const entries = Object.entries(record.values);
  if (!entries.length) {
    throw new Error("A menu draft must contain at least one changed field.");
  }
  for (const [fieldKey, value] of entries) {
    const field = allowedFields.get(fieldKey as StudioMenuFieldKey);
    if (!field || typeof value !== "string" || value.length > field.maxLength) {
      throw new Error(`The menu draft contains an invalid ${fieldKey} field.`);
    }
  }
}

async function readImageDimensions(blob: Blob): Promise<{
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("The selected image has no readable dimensions.");
    }
    return { width: image.naturalWidth, height: image.naturalHeight };
  } catch {
    throw new Error("The selected file could not be decoded as an image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createImageOverride(
  slotId: string,
  file: File,
): Promise<StudioImageOverride> {
  assertKnownSlot(slotId);
  assertImageBlob(file, file.name || "The selected image");
  const dimensions = await readImageDimensions(file);
  return {
    slotId,
    blob: file,
    fileName: file.name || "replacement-image",
    mediaType: file.type,
    ...dimensions,
    updatedAt: new Date().toISOString(),
  };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("The selected image could not be read.")),
    );
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mediaType = header?.match(/^data:([^;]+);base64$/)?.[1];
  if (!mediaType || !payload || !acceptedMediaTypes.has(mediaType)) {
    throw new Error("The Studio import contains an unsupported image.");
  }

  let binary: string;
  try {
    binary = window.atob(payload);
  } catch {
    throw new Error("The Studio import contains a malformed image.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const blob = new Blob([bytes], { type: mediaType });
  assertImageBlob(blob, "An imported image");
  return blob;
}

export async function exportStudioSnapshot(): Promise<StudioExportPayload> {
  const [imageOverrides, menuDrafts] = await Promise.all([
    readAllImageOverrides(),
    readAllMenuDrafts(),
  ]);
  const overrides = await Promise.all(
    imageOverrides.map(async ({ blob, ...record }) => ({
      ...record,
      dataUrl: await blobToDataUrl(blob),
    })),
  );
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    overrides,
    menuDrafts,
  };
}

export async function downloadStudioSnapshot(): Promise<StudioExportPayload> {
  const snapshot = await exportStudioSnapshot();
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `glam-by-yeasmin-studio-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return snapshot;
}

async function readImportText(source: Blob | string): Promise<string> {
  return typeof source === "string" ? source : source.text();
}

export async function importStudioSnapshot(
  source: Blob | string,
): Promise<StudioImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readImportText(source));
  } catch {
    throw new Error("The selected file is not valid Studio JSON.");
  }

  const payload = parseImportPayload(parsed);
  for (const record of payload.imageOverrides) {
    await writeImageOverride(record);
  }
  for (const record of payload.menuDrafts) {
    await writeMenuDraft(record);
  }
  return payload;
}

function parseImportPayload(input: unknown): StudioImportResult {
  if (!input || typeof input !== "object") {
    throw new Error("This is not a supported Website Studio export.");
  }

  const payload = input as Record<string, unknown>;
  if (
    (payload.version !== 1 && payload.version !== EXPORT_VERSION) ||
    !Array.isArray(payload.overrides) ||
    (payload.version === EXPORT_VERSION && !Array.isArray(payload.menuDrafts))
  ) {
    throw new Error("This is not a supported Website Studio export.");
  }

  const imageOverrides = payload.overrides.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("The Studio import contains an invalid image record.");
    }
    const value = entry as Record<string, unknown>;
    const slotId = typeof value.slotId === "string" ? value.slotId : "";
    assertKnownSlot(slotId);
    const blob = dataUrlToBlob(
      typeof value.dataUrl === "string" ? value.dataUrl : "",
    );
    const record: StudioImageOverride = {
      slotId,
      blob,
      fileName:
        typeof value.fileName === "string" && value.fileName.trim()
          ? value.fileName
          : "imported-image",
      mediaType: blob.type,
      width: Number(value.width),
      height: Number(value.height),
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString(),
    };
    assertImageOverride(record);
    return record;
  });

  const menuDrafts = (
    payload.version === EXPORT_VERSION && Array.isArray(payload.menuDrafts)
      ? payload.menuDrafts
      : []
  ).map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("The Studio import contains an invalid menu draft.");
    }
    const value = entry as Record<string, unknown>;
    const itemId = typeof value.itemId === "string" ? value.itemId : "";
    const values = value.values;
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("The Studio import contains an invalid menu draft.");
    }
    const record: StudioMenuDraft = {
      itemId,
      values: { ...(values as Record<string, string>) },
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date().toISOString(),
    };
    assertMenuDraft(record);
    return record;
  });

  return { imageOverrides, menuDrafts };
}
