import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Check, Download, FileImage, FileText, Gem, PencilLine, Printer, Share2, Sparkles } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { ServiceMenuDocument } from "@/components/service-menu/ServiceMenuDocument";
import { useToast } from "@/hooks/use-toast";
import { type ServiceMenuKey, useGetServiceMenuDocument } from "@workspace/api-client-react";
import { Link } from "wouter";

type MenuEdition = "general" | "florida";
type MenuType = "bridal" | "party";

const editionDetails: Record<MenuEdition, { label: string; description: string }> = {
  general: {
    label: "General",
    description: "The standard bridal collection for inquiries and events outside Florida.",
  },
  florida: {
    label: "Florida",
    description: "The Florida edition with its regional bridal bundle price.",
  },
};

const menuDetails: Record<MenuType, {
  label: string;
  shortLabel: string;
  description: string;
  key: ServiceMenuKey;
  editions: MenuEdition[];
}> = {
  bridal: {
    label: "Bridal services",
    shortLabel: "Bridal",
    description: "Bridal makeup, hair, setups, packages, travel, and timing.",
    key: "bridal-services",
    editions: ["general", "florida"],
  },
  party: {
    label: "Party & event services",
    shortLabel: "Party & event",
    description: "Party glam, hair, setups, travel, and early-morning fees.",
    key: "party-services",
    editions: ["general"],
  },
};

function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export default function ServiceMenusPage() {
  const initialParams = new URLSearchParams(window.location.search);
  const initialMenu = initialParams.get("menu") === "party-services" ? "party" : "bridal";
  const [menuType, setMenuType] = useState<MenuType>(initialMenu);
  const [edition, setEdition] = useState<MenuEdition>(initialMenu === "bridal" && initialParams.get("edition") === "florida" ? "florida" : "general");
  const { toast } = useToast();
  const selectedMenu = menuDetails[menuType];
  const { data: menuContent, isLoading } = useGetServiceMenuDocument(selectedMenu.key);
  const slug = `glambyeasmin-services-${edition}`;
  const assets = useMemo(
    () => ({
      pdf: publicAsset(`service-menus/${slug}.pdf`),
      pages: [1, 2].map((page) => publicAsset(`service-menus/${slug}-page-${page}.png`)),
    }),
    [slug],
  );

  function chooseMenu(nextMenu: MenuType) {
    setMenuType(nextMenu);
    setEdition("general");
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("menu", menuDetails[nextMenu].key);
    nextUrl.searchParams.delete("edition");
    window.history.replaceState({}, "", nextUrl);
  }

  function chooseEdition(nextEdition: MenuEdition) {
    setEdition(nextEdition);
    const nextUrl = new URL(window.location.href);
    if (nextEdition === "florida") nextUrl.searchParams.set("edition", nextEdition);
    else nextUrl.searchParams.delete("edition");
    window.history.replaceState({}, "", nextUrl);
  }

  function saveOrShareMenu() {
    toast({
      title: "Choose save or share on the next screen",
      description: "Your device’s print screen can save this current menu as a PDF or share it from your phone.",
    });
    window.print();
  }

  async function downloadOrShareOriginal() {
    const absolutePdfUrl = new URL(assets.pdf, window.location.href).toString();
    try {
      const response = await fetch(assets.pdf);
      const file = new File([await response.blob()], `${slug}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `GLAMBYEASMIN ${editionDetails[edition].label} Services Menu`, files: [file] });
        return;
      }
      window.open(assets.pdf, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.open(absolutePdfUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <Shell>
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Shareable collateral</span>
            <h1 className="crm-page-title mt-2">Service menus</h1>
            <p className="crm-page-subtitle">
              Choose what the client needs, confirm the location, then edit, save, or share one polished menu.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
        </header>

        <section className="crm-section overflow-hidden" aria-labelledby="choose-menu-heading">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="border-b border-card-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">1</span>
                <div>
                  <h2 id="choose-menu-heading" className="font-serif text-2xl text-foreground">What does the client need?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Start with the kind of services you want to send.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(Object.keys(menuDetails) as MenuType[]).map((option) => {
                  const active = menuType === option;
                  const details = menuDetails[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseMenu(option)}
                      aria-pressed={active}
                      data-testid={`menu-type-${option}`}
                      className={`group min-h-32 rounded-xl border p-4 text-left transition-all duration-200 ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_16px_30px_-22px_hsl(var(--primary)/0.75)]"
                          : "border-card-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/25"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-3">
                        {option === "bridal" ? <Gem className="h-5 w-5" strokeWidth={1.5} /> : <Sparkles className="h-5 w-5" strokeWidth={1.5} />}
                        {active && <Check className="h-5 w-5" />}
                      </span>
                      <strong className="mt-5 block font-serif text-xl">{details.shortLabel}</strong>
                      <span className={`mt-1 block text-xs leading-5 ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{details.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 text-sm font-semibold text-primary">2</span>
                <div>
                  <h2 className="font-serif text-2xl text-foreground">Where is the event?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Only confirmed location versions are shown.</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2" role="group" aria-label="Menu location">
                {selectedMenu.editions.map((option) => {
                  const active = edition === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => chooseEdition(option)}
                      aria-pressed={active}
                      data-testid={`menu-edition-${option}`}
                      className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-card-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {editionDetails[option].label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {menuType === "party" ? "Party pricing currently has one approved General edition." : editionDetails[edition].description}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px] xl:items-start">
          <section className="overflow-hidden rounded-[28px] border border-card-border bg-[hsl(var(--primary)/0.95)] shadow-[0_28px_70px_-36px_var(--elevate-3)]">
            <div className="flex items-center justify-between border-b border-primary-foreground/15 px-5 py-4 text-primary-foreground sm:px-7">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">Current menu</div>
                <div className="mt-1 font-serif text-xl">{selectedMenu.shortLabel} · {editionDetails[edition].label}</div>
              </div>
              <span className="rounded-full border border-primary-foreground/20 px-3 py-1 text-xs text-primary-foreground/75">2 pages</span>
            </div>
            <div className="max-h-[78dvh] space-y-4 overflow-y-auto bg-[#251116] p-3 sm:p-6 lg:p-8" data-testid="service-menu-preview">
              {menuContent ? <ServiceMenuDocument edition={edition} items={menuContent.items} menuType={menuType} /> : <div className="flex min-h-64 items-center justify-center text-sm text-white/70">{isLoading ? "Loading printable menu…" : "Menu unavailable"}</div>}
            </div>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-6">
            <section className="crm-section p-5">
              <span className="crm-eyebrow">Ready to send</span>
              <h2 className="mt-2 font-serif text-2xl text-foreground">{selectedMenu.label}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{editionDetails[edition].label} edition · current saved prices</p>
              <Button onClick={saveOrShareMenu} disabled={!menuContent} className="mt-5 min-h-12 w-full gap-2" data-testid="button-share-service-menu">
                <Share2 className="h-4 w-4" /> Save or share menu
              </Button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="min-h-11 gap-2">
                  <Link href={`/service-menus/edit/${selectedMenu.key}`} data-testid="button-edit-service-menu"><PencilLine className="h-4 w-4" /> Edit</Link>
                </Button>
                <Button onClick={() => window.print()} disabled={!menuContent} variant="outline" className="min-h-11 gap-2" data-testid="button-print-service-menu">
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </div>
            </section>

            {menuType === "bridal" && (
              <details className="crm-section group overflow-hidden" data-testid="archived-originals">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 text-sm font-semibold text-foreground">
                  <Archive className="h-4 w-4 text-primary" />
                  <span className="flex-1">Archived originals</span>
                  <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
                  <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Hide</span>
                </summary>
                <div className="space-y-2 border-t border-card-border p-3">
                  <p className="px-2 pb-1 text-xs leading-5 text-muted-foreground">Backup files with the original approved Bridal prices. Use the current menu above for recent edits.</p>
                  <Button asChild variant="ghost" className="min-h-11 w-full justify-start gap-3 px-3">
                    <a href={assets.pdf} download={`${slug}.pdf`}><FileText className="h-4 w-4 text-primary" /><span className="flex-1 text-left">Original PDF</span><Download className="h-4 w-4 text-muted-foreground" /></a>
                  </Button>
                  {assets.pages.map((page, index) => (
                    <Button key={page} asChild variant="ghost" className="min-h-11 w-full justify-start gap-3 px-3">
                      <a href={page} download={`${slug}-page-${index + 1}.png`}><FileImage className="h-4 w-4 text-primary" /><span className="flex-1 text-left">Original page {index + 1}</span><Download className="h-4 w-4 text-muted-foreground" /></a>
                    </Button>
                  ))}
                  <Button variant="ghost" onClick={downloadOrShareOriginal} className="min-h-11 w-full justify-start gap-3 px-3 text-muted-foreground">
                    <Share2 className="h-4 w-4" /> Open or share original
                  </Button>
                </div>
              </details>
            )}
          </aside>
        </div>
      </div>
      </Shell>
      {menuContent && createPortal(
        <div className="service-menu-print-portal" aria-hidden="true">
          <ServiceMenuDocument edition={edition} items={menuContent.items} menuType={menuType} />
        </div>,
        document.body,
      )}
    </>
  );
}
