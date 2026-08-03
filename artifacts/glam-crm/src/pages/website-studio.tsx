import * as React from "react";
import { ExternalLink, ImagePlus, LockKeyhole, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";

type PreviewRoute = { id: string; label: string; path: string };
type ImageSlot = { id: string; section: string; title: string; sourceFile: string; path: string };

const routes: PreviewRoute[] = [
  { id: "homepage", label: "Homepage", path: "/" },
  { id: "services", label: "Services menu", path: "/services/" },
];

// This inventory mirrors YeasminWebsite/src/data/studio-image-slots.ts. The API-backed
// asset replacement layer is intentionally the next migration step; these controls are
// useful now for auditing every source location without exposing a public editor route.
const imageSlots: ImageSlot[] = [
  { id: "hero-primary", section: "Homepage · Hero", title: "Hero portrait", sourceFile: "src/data/portfolio.json · hero-primary", path: "/images/hero-primary.jpg" },
  { id: "hero-detail-one", section: "Homepage · Hero", title: "Hero detail one", sourceFile: "src/data/portfolio.json · hero-detail-one", path: "/images/hero-detail-one.jpg" },
  { id: "hero-detail-two", section: "Homepage · Hero", title: "Hero detail two", sourceFile: "src/data/portfolio.json · hero-detail-two", path: "/images/hero-detail-two.jpg" },
  { id: "service-menu-hero", section: "Services menu · Masthead", title: "Services menu still life", sourceFile: "src/components/menu/ServiceMenuPage.astro", path: "/images/service-menu-hero.jpg" },
  { id: "ornament-peony", section: "Homepage · Hero", title: "Peony engraving", sourceFile: "src/components/BotanicalLineArt.astro · hero", path: "/ornaments/peony-engraving.png" },
  { id: "ornament-branch", section: "Homepage · Bridal edit", title: "Branch engraving", sourceFile: "src/components/BotanicalLineArt.astro · branch", path: "/ornaments/branch-engraving.png" },
];

const publicWebsiteUrl = import.meta.env.VITE_YEASMIN_WEBSITE_URL || "http://127.0.0.1:4321";

export default function WebsiteStudioPage() {
  const [route, setRoute] = React.useState(routes[0]);
  const [viewport, setViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedSlot, setSelectedSlot] = React.useState<ImageSlot | null>(null);
  const [draftImages, setDraftImages] = React.useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("yeasmin-studio-draft-images") || "{}"); } catch { return {}; }
  });

  const previewUrl = `${publicWebsiteUrl.replace(/\/$/, "")}${route.path}?studioPreview=1`;
  const frameClass = viewport === "mobile" ? "w-[390px]" : viewport === "tablet" ? "w-[768px]" : "w-full";

  function chooseImage(slot: ImageSlot, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...draftImages, [slot.id]: String(reader.result) };
      setDraftImages(next);
      localStorage.setItem("yeasmin-studio-draft-images", JSON.stringify(next));
    };
    reader.readAsDataURL(file);
  }

  function resetDraft() {
    setDraftImages({});
    localStorage.removeItem("yeasmin-studio-draft-images");
  }

  return (
    <Shell>
      <div className="space-y-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="crm-eyebrow">GLAMBYEASMIN · Protected Studio</span>
              <LockKeyhole className="h-3.5 w-3.5 text-primary" aria-label="Authenticated dashboard only" />
            </div>
            <h1 className="crm-page-title mt-2">Website Studio</h1>
            <p className="crm-page-subtitle">Review the exact public-site preview, audit every image source, and prepare edits from the sister dashboard. The public GitHub Pages site does not contain this route.</p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <Button asChild variant="outline" className="min-h-11 gap-2 px-5">
            <a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open public preview</a>
          </Button>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="crm-section overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border/70 px-5 py-4">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Preview route">
                {routes.map((item) => <button key={item.id} type="button" onClick={() => setRoute(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${route.id === item.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>{item.label}</button>)}
              </div>
              <div className="flex gap-1 rounded-lg border border-card-border p-1" aria-label="Preview viewport">
                {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([id, Icon]) => <button key={id} type="button" aria-label={`${id} preview`} onClick={() => setViewport(id)} className={`rounded-md p-2 ${viewport === id ? "bg-accent text-foreground" : "text-muted-foreground"}`}><Icon className="h-4 w-4" /></button>)}
              </div>
            </div>
            <div className="flex min-h-[620px] justify-center overflow-auto bg-muted/30 p-4 sm:p-8">
              <iframe title={`${route.label} exact public preview`} src={previewUrl} className={`${frameClass} min-h-[760px] shrink-0 rounded-lg border border-card-border bg-background shadow-xl`} />
            </div>
            <p className="border-t border-card-border/70 px-5 py-3 text-xs text-muted-foreground">Preview URL: <code>{previewUrl}</code></p>
          </div>

          <aside className="space-y-5">
            <section className="crm-section overflow-hidden">
              <div className="border-b border-card-border/70 px-5 py-4"><span className="crm-eyebrow">Image inventory</span><h2 className="crm-section-title mt-1">Replaceable source map</h2><p className="mt-2 text-sm text-muted-foreground">Each slot records where the image is defined in YeasminWebsite.</p></div>
              <div className="max-h-[520px] divide-y divide-card-border/60 overflow-y-auto">
                {imageSlots.map((slot) => <button key={slot.id} type="button" onClick={() => setSelectedSlot(slot)} className={`block w-full px-5 py-4 text-left hover:bg-muted/40 ${selectedSlot?.id === slot.id ? "bg-accent/40" : ""}`}><div className="flex items-start gap-3"><ImagePlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><div className="text-sm font-semibold text-foreground">{slot.title}</div><div className="mt-1 text-xs text-muted-foreground">{slot.section}</div><code className="mt-2 block truncate text-[10px] text-muted-foreground">{slot.sourceFile}</code></div></div></button>)}
              </div>
            </section>
            <section className="crm-section p-5">
              <span className="crm-eyebrow">Draft controls</span>
              <h2 className="crm-section-title mt-1">{selectedSlot?.title || "Choose an image slot"}</h2>
              {selectedSlot ? <><p className="mt-2 text-sm text-muted-foreground">Current source: <code>{selectedSlot.path}</code></p><label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-card-border bg-card px-3 text-sm font-semibold hover:border-primary/40"><ImagePlus className="h-4 w-4" /> Choose replacement<input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) chooseImage(selectedSlot, file); }} /></label>{draftImages[selectedSlot.id] && <img src={draftImages[selectedSlot.id]} alt="Selected replacement preview" className="mt-4 max-h-40 w-full rounded-lg object-cover" />}</> : <p className="mt-2 text-sm text-muted-foreground">Select a slot to inspect its source path and stage a local replacement preview.</p>}
              <Button variant="ghost" className="mt-4 w-full gap-2" onClick={resetDraft}><RotateCcw className="h-4 w-4" /> Reset local drafts</Button>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">These staged files stay in this browser only until the authenticated media API and publish workflow are connected. No private dashboard data is sent to GitHub Pages.</p>
            </section>
          </aside>
        </section>
      </div>
    </Shell>
  );
}
