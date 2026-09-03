import * as React from "react";
import {
  Download,
  ChevronLeft,
  ExternalLink,
  FileUp,
  ImagePlus,
  LockKeyhole,
  Monitor,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetServiceMenuContentQueryKey,
  useGetServiceMenuContent,
  useUpdateServiceMenuContent,
} from "@workspace/api-client-react";
import {
  STUDIO_IMAGE_SLOTS,
  STUDIO_MENU_ITEMS,
  STUDIO_PREVIEW_ROUTES,
  blobToDataUrl,
  clearMenuDrafts,
  createImageOverride,
  deleteImageOverride,
  deleteMenuDraft,
  downloadStudioSnapshot,
  importStudioSnapshot,
  readAllImageOverrides,
  readAllMenuDrafts,
  buildServiceMenuItems,
  printableMenuValidationError,
  publishedMenuValues,
  resolvedMenuValues,
  resetStudioStorage,
  writeImageOverride,
  writeMenuDraft,
  type StudioImageOverride,
  type StudioMenuDraft,
  type StudioMenuFieldKey,
  type StudioMenuItem,
} from "@/features/website-studio";

const publicWebsiteUrl = import.meta.env.VITE_YEASMIN_WEBSITE_URL || "http://127.0.0.1:4321";

type EditorTab = "images" | "menu";
type PreviewViewport = "desktop" | "tablet" | "mobile";

function previewPageUrl(path: string) {
  const base = publicWebsiteUrl.endsWith("/") ? publicWebsiteUrl : `${publicWebsiteUrl}/`;
  const url = new URL(path.replace(/^\//, ""), base);
  url.searchParams.set("studioPreview", "1");
  return url.toString();
}

function publicAssetUrl(path: string) {
  const base = publicWebsiteUrl.endsWith("/") ? publicWebsiteUrl : `${publicWebsiteUrl}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
}

export default function WebsiteStudioPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startsOnMenu = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "menu";
  const [route, setRoute] = React.useState(STUDIO_PREVIEW_ROUTES[startsOnMenu ? 1 : 0]);
  const [viewport, setViewport] = React.useState<PreviewViewport>("desktop");
  const [editorTab, setEditorTab] = React.useState<EditorTab>(startsOnMenu ? "menu" : "images");
  const [imageOverrides, setImageOverrides] = React.useState<Record<string, StudioImageOverride>>({});
  const [menuDrafts, setMenuDrafts] = React.useState<Record<string, StudioMenuDraft>>({});
  const [search, setSearch] = React.useState("");
  const [sectionFilter, setSectionFilter] = React.useState("");
  const [status, setStatus] = React.useState("Loading saved Studio choices…");
  const [storageReady, setStorageReady] = React.useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const { data: savedMenuContent, isLoading: isMenuContentLoading } = useGetServiceMenuContent();
  const updateSavedMenu = useUpdateServiceMenuContent();
  const savedMenuValues = React.useMemo(() => publishedMenuValues(savedMenuContent), [savedMenuContent]);

  const previewUrl = previewPageUrl(route.path);
  const frameClass = viewport === "mobile" ? "w-[390px]" : viewport === "tablet" ? "w-[768px]" : "w-full";
  const sections = React.useMemo(() => [...new Set(STUDIO_IMAGE_SLOTS.map((slot) => slot.section))], []);
  const filteredSlots = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return STUDIO_IMAGE_SLOTS.filter((slot) => {
      const matchesSection = !sectionFilter || slot.section === sectionFilter;
      const matchesSearch = !term || `${slot.title} ${slot.section} ${slot.role} ${slot.id}`.toLowerCase().includes(term);
      return matchesSection && matchesSearch;
    });
  }, [search, sectionFilter]);
  const objectUrls = React.useMemo(
    () => Object.fromEntries(Object.values(imageOverrides).map((record) => [record.slotId, URL.createObjectURL(record.blob)])),
    [imageOverrides],
  );
  const changeCount = Object.keys(imageOverrides).length + Object.keys(menuDrafts).length;

  React.useEffect(() => () => Object.values(objectUrls).forEach((url) => URL.revokeObjectURL(url)), [objectUrls]);

  const loadSavedState = React.useCallback(async () => {
    try {
      const [images, menu] = await Promise.all([readAllImageOverrides(), readAllMenuDrafts()]);
      setImageOverrides(Object.fromEntries(images.map((record) => [record.slotId, record])));
      setMenuDrafts(Object.fromEntries(menu.map((record) => [record.itemId, record])));
      setStatus(`${images.length + menu.length} saved change${images.length + menu.length === 1 ? "" : "s"} loaded.`);
      setStorageReady(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Website Studio storage could not load.";
      setStatus(message);
      toast({ title: "Studio storage unavailable", description: message, variant: "destructive" });
    }
  }, [toast]);

  React.useEffect(() => { void loadSavedState(); }, [loadSavedState]);

  const sendPreviewState = React.useCallback(async () => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const images = Object.fromEntries(
      await Promise.all(Object.values(imageOverrides).map(async (record) => [record.slotId, await blobToDataUrl(record.blob)])),
    );
    const menu = Object.fromEntries(Object.values(menuDrafts).map((record) => [record.itemId, record.values]));
    target.postMessage(
      { type: "glambyeasmin:studio-preview-state", version: 1, images, menu },
      new URL(previewUrl).origin,
    );
  }, [imageOverrides, menuDrafts, previewUrl]);

  React.useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      if (event.origin !== new URL(previewUrl).origin || event.source !== iframeRef.current?.contentWindow) return;
      const type = event.data?.type;
      if (type === "glambyeasmin:studio-preview-ready") {
        setStatus("Preview connected. Applying saved changes…");
        void sendPreviewState();
      } else if (type === "glambyeasmin:studio-preview-applied") {
        setStatus(`Preview updated · ${event.data.appliedImages ?? 0} images · ${event.data.appliedMenuFields ?? 0} menu fields.`);
      } else if (type === "glambyeasmin:studio-preview-rejected") {
        setStatus(`Preview rejected the update: ${event.data.reason ?? "unknown reason"}`);
      }
    };
    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [previewUrl, sendPreviewState]);

  React.useEffect(() => { if (storageReady) void sendPreviewState(); }, [storageReady, sendPreviewState]);

  async function chooseImage(slotId: string, file: File) {
    try {
      const record = await createImageOverride(slotId, file);
      await writeImageOverride(record);
      setImageOverrides((current) => ({ ...current, [slotId]: record }));
      setStatus(`${record.fileName} is saved locally and ready for preview.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The image could not be saved.";
      toast({ title: "Image not replaced", description: message, variant: "destructive" });
    }
  }

  async function resetImage(slotId: string) {
    await deleteImageOverride(slotId);
    setImageOverrides((current) => {
      const next = { ...current };
      delete next[slotId];
      return next;
    });
    setStatus("Image restored to the current project asset.");
  }

  async function updateMenuField(item: StudioMenuItem, fieldKey: StudioMenuFieldKey, value: string) {
    const original = savedMenuValues[item.id]?.[fieldKey] ?? item.fields.find((field) => field.key === fieldKey)?.value ?? "";
    const existing = menuDrafts[item.id]?.values ?? {};
    const values = { ...existing };
    if (value === original) delete values[fieldKey];
    else values[fieldKey] = value;
    if (!Object.keys(values).length) {
      await deleteMenuDraft(item.id).catch(() => undefined);
      setMenuDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      return;
    }
    const record: StudioMenuDraft = { itemId: item.id, values, updatedAt: new Date().toISOString() };
    await writeMenuDraft(record);
    setMenuDrafts((current) => ({ ...current, [item.id]: record }));
    setStatus(`${item.fields.find((field) => field.key === fieldKey)?.label ?? "Menu field"} saved locally.`);
  }

  function savePrintableMenu() {
    if (!savedMenuContent) {
      toast({ title: "Printable menu is still loading", variant: "destructive" });
      return;
    }
    const items = buildServiceMenuItems(menuDrafts, savedMenuValues);
    const validationError = printableMenuValidationError(items);
    if (validationError) {
      toast({ title: "Menu is not ready to save", description: validationError, variant: "destructive" });
      return;
    }

    updateSavedMenu.mutate(
      { data: { expectedRevision: savedMenuContent.revision, items } },
      {
        onSuccess: async (saved) => {
          queryClient.setQueryData(getGetServiceMenuContentQueryKey(), saved);
          await clearMenuDrafts();
          setMenuDrafts({});
          setStatus(`Printable menu saved · revision ${saved.revision}.`);
          toast({ title: "Printable menu saved", description: "The General and Florida previews now use these details." });
        },
        onError: () => {
          toast({ title: "Printable menu was not saved", description: "Reload to check for a newer saved version, then try again.", variant: "destructive" });
        },
      },
    );
  }

  async function resetMenuItem(itemId: string) {
    await deleteMenuDraft(itemId);
    setMenuDrafts((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    setStatus("Menu item restored to its reviewed value.");
  }

  async function resetMenu() {
    await clearMenuDrafts();
    setMenuDrafts({});
    setStatus("All menu wording and prices restored.");
  }

  async function resetEverything() {
    if (!window.confirm("Reset every local image and menu change? This cannot be undone.")) return;
    await resetStudioStorage();
    setImageOverrides({});
    setMenuDrafts({});
    setStatus("Every local Studio change was reset.");
  }

  async function importSnapshot(file: File) {
    try {
      const result = await importStudioSnapshot(file);
      setImageOverrides(Object.fromEntries(result.imageOverrides.map((record) => [record.slotId, record])));
      setMenuDrafts(Object.fromEntries(result.menuDrafts.map((record) => [record.itemId, record])));
      setStatus(`Imported ${result.imageOverrides.length + result.menuDrafts.length} saved changes.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The Studio file could not be imported.";
      toast({ title: "Import failed", description: message, variant: "destructive" });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-5 bg-background p-4 sm:p-6">
        <header className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card px-5 py-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Link href="/" className="mr-2 inline-flex min-h-9 items-center gap-1 rounded-lg border border-card-border px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Dashboard</Link>
              <span className="crm-eyebrow">GLAMBYEASMIN · Protected Studio</span>
              <LockKeyhole className="h-3.5 w-3.5 text-primary" aria-label="Authenticated dashboard only" />
            </div>
            <h1 className="crm-page-title mt-2">Website Studio</h1>
            <p className="crm-page-subtitle">Replace website images and review them instantly across desktop, tablet, and mobile. Client-ready pricing now lives in Service menus.</p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={importInputRef} type="file" accept="application/json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSnapshot(file); }} />
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => importInputRef.current?.click()}><FileUp className="h-4 w-4" /> Import</Button>
            <Button variant="outline" className="min-h-11 gap-2" onClick={() => void downloadStudioSnapshot()}><Download className="h-4 w-4" /> Export</Button>
            <Button variant="destructive" className="min-h-11 gap-2" disabled={!changeCount} onClick={() => void resetEverything()}><RotateCcw className="h-4 w-4" /> Reset all</Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="crm-section min-h-0 overflow-hidden xl:max-h-[calc(100dvh-154px)]">
            <div className="border-b border-card-border/70 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div><span className="crm-eyebrow">Editing library</span><h2 className="crm-section-title mt-1">Edit the site in place</h2></div>
                <span className="rounded-full border border-card-border bg-muted/40 px-3 py-1 text-xs font-semibold text-muted-foreground">{changeCount} change{changeCount === 1 ? "" : "s"}</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">Image drafts stay in this browser. Prior menu drafts remain available here for recovery.</p>
            </div>

            <div className="grid grid-cols-2 border-b border-card-border/70 p-2" role="tablist" aria-label="Website editing tools">
              <button type="button" role="tab" aria-selected={editorTab === "images"} onClick={() => setEditorTab("images")} className={`min-h-11 rounded-lg text-sm font-semibold ${editorTab === "images" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>Images <span className="ml-1 opacity-70">{STUDIO_IMAGE_SLOTS.length}</span></button>
              <button type="button" role="tab" aria-selected={editorTab === "menu"} onClick={() => setEditorTab("menu")} className={`min-h-11 rounded-lg text-sm font-semibold ${editorTab === "menu" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>Saved drafts <span className="ml-1 opacity-70">{Object.keys(menuDrafts).length}</span></button>
            </div>

            {editorTab === "images" ? (
              <div>
                <div className="grid gap-2 border-b border-card-border/70 p-3 sm:grid-cols-[minmax(0,1fr)_150px] xl:grid-cols-1">
                  <label className="flex min-h-11 items-center gap-2 rounded-lg border border-card-border bg-card px-3"><Search className="h-4 w-4 text-muted-foreground" /><span className="sr-only">Search image slots</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search images" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label>
                  <label><span className="sr-only">Filter image slots by section</span><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)} className="min-h-11 w-full rounded-lg border border-card-border bg-card px-3 text-sm text-foreground"><option value="">All sections</option>{sections.map((section) => <option key={section} value={section}>{section}</option>)}</select></label>
                </div>
                <div className="max-h-[calc(100dvh-392px)] min-h-[360px] divide-y divide-card-border/60 overflow-y-auto">
                  {filteredSlots.map((slot) => {
                    const override = imageOverrides[slot.id];
                    const currentPath = import.meta.env.DEV ? slot.developmentPath : slot.productionPath;
                    return (
                      <article key={slot.id} className="p-4">
                        <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
                          <div className="relative h-24 overflow-hidden rounded-lg border border-card-border bg-muted"><img src={objectUrls[slot.id] || publicAssetUrl(currentPath)} alt="" className="h-full w-full object-cover" />{override && <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">Local</span>}</div>
                          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{slot.section}</p><h3 className="mt-1 text-sm font-semibold text-foreground">{slot.title}</h3><p className="mt-1 text-xs text-muted-foreground">{slot.role} · {slot.width} × {slot.height}</p>{override && <p className="mt-1 truncate text-xs text-muted-foreground">{override.fileName} · {override.width} × {override.height}</p>}</div>
                        </div>
                        <details className="mt-3 rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-semibold text-foreground">All source locations</summary><dl className="mt-2 space-y-2"><div><dt className="font-semibold">Development</dt><dd><code className="break-all">{slot.developmentPath}</code></dd></div><div><dt className="font-semibold">Production</dt><dd><code className="break-all">{slot.productionPath}</code></dd></div><div><dt className="font-semibold">Defined in</dt><dd><code className="break-all">{slot.sourceFile}</code></dd></div></dl></details>
                        <div className="mt-3 grid grid-cols-2 gap-2"><label className="flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-card-border bg-card px-2 text-xs font-semibold hover:border-primary/40"><ImagePlus className="h-3.5 w-3.5" /> Replace image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void chooseImage(slot.id, file); event.currentTarget.value = ""; }} /></label><button type="button" disabled={!override} onClick={() => void resetImage(slot.id)} className="min-h-10 rounded-lg border border-card-border px-2 text-xs font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-35">Reset</button></div>
                      </article>
                    );
                  })}
                  {!filteredSlots.length && <p className="p-8 text-center text-sm text-muted-foreground">No image slots match that search.</p>}
                </div>
              </div>
            ) : (
              <div>
                <div className="space-y-3 border-b border-card-border/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="crm-eyebrow">Prior menu drafts</p><p className="mt-1 text-sm text-muted-foreground">Recover browser-local edits, then move to the current Service menus workspace.</p></div>
                    <Button variant="ghost" size="sm" disabled={updateSavedMenu.isPending || !Object.keys(menuDrafts).length} onClick={() => void resetMenu()}>Discard drafts</Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <Button className="min-h-11 gap-2" disabled={isMenuContentLoading || updateSavedMenu.isPending || !Object.keys(menuDrafts).length} onClick={savePrintableMenu} data-testid="button-save-printable-menu"><Save className="h-4 w-4" />{updateSavedMenu.isPending ? "Saving…" : "Save printable menu"}</Button>
                    <Button asChild variant="outline" className="min-h-11"><Link href="/service-menus" data-testid="button-preview-printable-menu">Preview printable menu</Link></Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{savedMenuContent?.customized ? `Saved revision ${savedMenuContent.revision}` : "Using the reviewed menu defaults"}. Save before sharing or printing.</p>
                </div>
                <div className="max-h-[calc(100dvh-360px)] min-h-[420px] divide-y divide-card-border/60 overflow-y-auto">
                  {STUDIO_MENU_ITEMS.map((item) => {
                    const draft = menuDrafts[item.id];
                    const values = resolvedMenuValues(item.id, menuDrafts, savedMenuValues);
                    return <article key={item.id} className="space-y-4 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{item.sectionLabel}</p><h3 className="mt-1 font-serif text-xl text-foreground">{values.title}</h3></div><button type="button" disabled={updateSavedMenu.isPending || !draft} onClick={() => void resetMenuItem(item.id)} className="text-xs font-semibold text-muted-foreground disabled:opacity-30">Reset</button></div><div className="space-y-3">{item.fields.map((field) => { const value = values[field.key] ?? ""; const common = { value, disabled: updateSavedMenu.isPending, maxLength: field.maxLength, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void updateMenuField(item, field.key, event.target.value), className: "mt-1 w-full rounded-lg border border-card-border bg-card px-3 py-2 text-sm leading-5 text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:cursor-wait disabled:opacity-60" }; return <label key={field.key} className="block text-xs font-semibold text-muted-foreground">{field.label}{field.multiline ? <textarea {...common} rows={4} /> : <input {...common} />}</label>; })}</div></article>;
                  })}
                </div>
              </div>
            )}
          </aside>

          <section className="crm-section min-h-0 min-w-0 overflow-hidden xl:max-h-[calc(100dvh-154px)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border/70 px-5 py-4">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Preview route">
                {STUDIO_PREVIEW_ROUTES.map((item) => <button key={item.id} type="button" onClick={() => setRoute(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${route.id === item.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
              </div>
              <div className="flex gap-1 rounded-lg border border-card-border p-1" aria-label="Preview viewport">
                {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([id, Icon]) => <button key={id} type="button" aria-label={`${id} preview`} onClick={() => setViewport(id)} className={`rounded-md p-2 ${viewport === id ? "bg-accent text-foreground" : "text-muted-foreground"}`}><Icon className="h-4 w-4" /></button>)}
              </div>
              <Button asChild variant="ghost" size="sm"><a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open page</a></Button>
            </div>
            <div className="flex min-h-[620px] justify-center overflow-auto bg-muted/30 p-4 sm:p-6 xl:h-[calc(100dvh-265px)] xl:min-h-0">
              <iframe ref={iframeRef} title={`${route.label} exact public preview`} src={previewUrl} onLoad={() => { setStatus("Preview loaded. Connecting editor…"); void sendPreviewState(); }} className={`${frameClass} min-h-[780px] shrink-0 rounded-lg border border-card-border bg-background shadow-xl xl:h-full xl:min-h-0`} />
            </div>
            <div className="flex flex-col gap-1 border-t border-card-border/70 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite">{status}</p><p>{Object.keys(menuDrafts).length} unsaved menu change{Object.keys(menuDrafts).length === 1 ? "" : "s"} · {Object.keys(imageOverrides).length} local image change{Object.keys(imageOverrides).length === 1 ? "" : "s"}</p></div>
          </section>
        </div>
      </div>
  );
}
