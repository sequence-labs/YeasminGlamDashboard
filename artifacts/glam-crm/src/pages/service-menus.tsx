import { useMemo, useState } from "react";
import { Download, ExternalLink, FileImage, FileText, PencilLine, Printer, Share2, Sparkles } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { ServiceMenuDocument } from "@/components/service-menu/ServiceMenuDocument";
import { useToast } from "@/hooks/use-toast";
import { useGetServiceMenuContent } from "@workspace/api-client-react";
import { Link } from "wouter";

type MenuEdition = "general" | "florida";

const menuDetails: Record<MenuEdition, { label: string; description: string }> = {
  general: {
    label: "General",
    description: "The standard bridal collection for inquiries and events outside Florida.",
  },
  florida: {
    label: "Florida",
    description: "The Florida edition with its regional bridal bundle price.",
  },
};

function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export default function ServiceMenusPage() {
  const [edition, setEdition] = useState<MenuEdition>("general");
  const { toast } = useToast();
  const { data: menuContent, isLoading } = useGetServiceMenuContent();
  const details = menuDetails[edition];
  const bundleValues = menuContent?.items.find((item) => item.id === "bridal-bundle")?.values;
  const bundlePrice = edition === "florida" ? bundleValues?.["price-florida"] : bundleValues?.["price-general"];
  const slug = `glambyeasmin-services-${edition}`;
  const assets = useMemo(
    () => ({
      pdf: publicAsset(`service-menus/${slug}.pdf`),
      pages: [1, 2].map((page) => publicAsset(`service-menus/${slug}-page-${page}.png`)),
    }),
    [slug],
  );

  async function shareOriginalMenu() {
    const absolutePdfUrl = new URL(assets.pdf, window.location.href).toString();
    try {
      const response = await fetch(assets.pdf);
      const file = new File([await response.blob()], `${slug}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `GLAMBYEASMIN ${details.label} Services Menu`, files: [file] });
        return;
      }
      if (navigator.share) {
        await navigator.share({
          title: `GLAMBYEASMIN ${details.label} Services Menu`,
          text: "Bridal services and pricing",
          url: absolutePdfUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(absolutePdfUrl);
      toast({ title: "Menu link copied", description: "Paste it into a text, email, or message." });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await navigator.clipboard.writeText(absolutePdfUrl);
      toast({ title: "Menu link copied", description: "Native sharing was unavailable, so the PDF link was copied." });
    }
  }

  return (
    <Shell>
      <div className="space-y-7">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Shareable collateral</span>
            <h1 className="crm-page-title mt-2">Service menus</h1>
            <p className="crm-page-subtitle">
              Preview the current bridal pricing, choose the right region, and send a polished client-ready menu.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="min-h-11 gap-2 px-5">
              <Link href="/website-studio?tab=menu" data-testid="button-edit-service-menu"><PencilLine className="h-4 w-4" /> Edit menu details</Link>
            </Button>
            <Button onClick={() => window.print()} disabled={!menuContent} className="min-h-11 gap-2 px-5" data-testid="button-print-service-menu">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-5 xl:sticky xl:top-6">
            <section className="crm-section overflow-hidden">
              <div className="border-b border-card-border/70 px-5 py-5">
                <span className="crm-eyebrow">Choose edition</span>
                <h2 className="crm-section-title mt-1">Where is the event?</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3">
                {(Object.keys(menuDetails) as MenuEdition[]).map((option) => {
                  const active = edition === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEdition(option)}
                      aria-pressed={active}
                      data-testid={`menu-edition-${option}`}
                      className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-all duration-200 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.65)]"
                          : "border-card-border bg-card text-foreground hover:border-primary/35 hover:bg-accent/30"
                      }`}
                    >
                      {menuDetails[option].label}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-card-border/70 px-5 py-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  <span className="font-serif text-xl">{bundlePrice ?? (isLoading ? "Loading…" : "Price unavailable")}</span>
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{details.description}</p>
              </div>
            </section>

            <section className="space-y-2" aria-label="Menu downloads">
              <div className="px-1 pb-1">
                <div className="crm-eyebrow">Reviewed original files</div>
                {menuContent?.customized && <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-300">These archived downloads keep the original prices. Use Print / Save PDF above for the current edited menu.</p>}
              </div>
              <Button asChild variant="outline" className="min-h-12 w-full justify-start gap-3 px-4">
                <a href={assets.pdf} download={`${slug}.pdf`}>
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-left">Download PDF</span>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              </Button>
              {assets.pages.map((page, index) => (
                <Button key={page} asChild variant="outline" className="min-h-12 w-full justify-start gap-3 px-4">
                  <a href={page} download={`${slug}-page-${index + 1}.png`}>
                    <FileImage className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-left">Share page {index + 1}</span>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </a>
                </Button>
              ))}
              <Button asChild variant="ghost" className="min-h-11 w-full justify-start gap-3 px-4 text-muted-foreground">
                <a href={assets.pdf} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open full PDF
                </a>
              </Button>
              <Button variant="ghost" onClick={shareOriginalMenu} className="min-h-11 w-full justify-start gap-3 px-4 text-muted-foreground" data-testid="button-share-original-service-menu">
                <Share2 className="h-4 w-4" /> Share reviewed original
              </Button>
            </section>

            <p className="px-1 text-xs leading-5 text-muted-foreground">Print / Save PDF uses the current saved details. The original PDF and page images remain available as a fallback.</p>
          </aside>

          <section className="overflow-hidden rounded-[28px] border border-card-border bg-[hsl(var(--primary)/0.95)] shadow-[0_28px_70px_-36px_var(--elevate-3)]">
            <div className="flex items-center justify-between border-b border-primary-foreground/15 px-5 py-4 text-primary-foreground sm:px-7">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">Live preview</div>
                <div className="mt-1 font-serif text-xl">{details.label} services menu</div>
              </div>
              <span className="rounded-full border border-primary-foreground/20 px-3 py-1 text-xs text-primary-foreground/75">2 pages</span>
            </div>
            <div className="max-h-[78dvh] space-y-4 overflow-y-auto bg-[#251116] p-3 sm:p-6 lg:p-8" data-testid="service-menu-preview">
              {menuContent ? <ServiceMenuDocument edition={edition} items={menuContent.items} /> : <div className="flex min-h-64 items-center justify-center text-sm text-white/70">Loading printable menu…</div>}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
