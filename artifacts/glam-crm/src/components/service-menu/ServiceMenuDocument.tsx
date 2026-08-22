import type { ServiceMenuContentItem, ServiceMenuContentValues } from "@workspace/api-client-react";

export type ServiceMenuEdition = "general" | "florida";

type Props = {
  edition: ServiceMenuEdition;
  items: ServiceMenuContentItem[];
};

function publicAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function itemMap(items: ServiceMenuContentItem[]) {
  return new Map(items.map((item) => [item.id, item.values]));
}

function price(values: ServiceMenuContentValues, edition: ServiceMenuEdition) {
  if (edition === "florida" && values["price-florida"]) return values["price-florida"];
  return values["price-general"] ?? values.price ?? "";
}

function Brand({ edition, page }: { edition: ServiceMenuEdition; page: number }) {
  return (
    <>
      <div className="service-menu-brand"><strong>G L A M B Y E A S M I N</strong><span>{edition.toUpperCase()} EDITION</span></div>
      <div className="service-menu-footer"><span>BRIDAL SERVICES &amp; PRICING</span><span>0{page}</span></div>
    </>
  );
}

function Essential({ values }: { values: ServiceMenuContentValues }) {
  return (
    <article className="service-menu-essential">
      <div className="service-menu-title-price"><h3>{values.title}</h3><strong>{values.price}</strong></div>
      <div className="service-menu-gold-line" />
      <p>{values.description}</p>
      {values.note && <p className="service-menu-muted">{values.note}</p>}
    </article>
  );
}

function Package({ values, edition }: { values: ServiceMenuContentValues; edition: ServiceMenuEdition }) {
  return (
    <article className="service-menu-package">
      <div className="service-menu-kicker">{values.kicker}</div>
      <div className="service-menu-title-price"><h3>{values.title}</h3><strong>{price(values, edition)}</strong></div>
      <p>{values.description}</p>
    </article>
  );
}

function Detail({ values }: { values: ServiceMenuContentValues }) {
  return (
    <article className="service-menu-detail">
      <div className="service-menu-detail-heading"><strong>{values.title}</strong><span>{values.price}</span></div>
      <p>{values.description}</p>
    </article>
  );
}

export function ServiceMenuDocument({ edition, items }: Props) {
  const content = itemMap(items);
  const get = (id: string) => content.get(id) ?? {};
  const editionLabel = edition === "general" ? "General" : "Florida";

  return (
    <div className="service-menu-print-pages" data-testid="dynamic-service-menu-document">
      <section className="service-menu-sheet" aria-label={`${editionLabel} services menu page 1`}>
        <Brand edition={edition} page={1} />
        <div className="service-menu-hero" style={{ backgroundImage: `url(${publicAsset("service-menus/bridal-editorial.png")})` }}>
          <div className="service-menu-hero-card">
            <div className="service-menu-kicker">Bridal artistry, thoughtfully tailored</div>
            <h2>Services &amp; Pricing</h2>
            <p>{editionLabel} collection</p>
            <div className="service-menu-gold-line" />
          </div>
        </div>
        <div className="service-menu-page-one-content">
          <div className="service-menu-section-label">The bridal essentials</div>
          <div className="service-menu-essential-grid">
            <div>
              {[
                "bridal-makeup",
                "bridal-setup",
                "makeup-trial",
              ].map((id) => <Essential key={id} values={get(id)} />)}
            </div>
            <div>
              {[
                "bridal-hair",
                "synthetic-bun-extension",
                "bridal-hijab-setup",
              ].map((id) => <Essential key={id} values={get(id)} />)}
            </div>
          </div>
        </div>
      </section>

      <section className="service-menu-sheet" aria-label={`${editionLabel} services menu page 2`}>
        <Brand edition={edition} page={2} />
        <div className="service-menu-page-two-content">
          <div className="service-menu-section-label">Curated experiences</div>
          <h2>Packages for a seamless celebration</h2>
          <p className="service-menu-intro">Thoughtfully combined services for a polished, stress-free bridal experience.</p>
          <div className="service-menu-package-grid">
            <Package values={get("signature-bridal-package")} edition={edition} />
            <Package values={get("bridal-bundle")} edition={edition} />
          </div>
          <article className="service-menu-offer">
            <div className="service-menu-kicker">{get("bridal-makeup-package").kicker}</div>
            <div className="service-menu-title-price"><h3>{get("bridal-makeup-package").title}</h3><strong>{get("bridal-makeup-package").price}</strong></div>
            <p>{get("bridal-makeup-package").description}</p>
          </article>
          <div className="service-menu-section-label service-menu-travel-label">Travel &amp; timing</div>
          <div className="service-menu-detail-grid">
            <div>
              <Detail values={get("travel-10-15-miles")} />
              <Detail values={get("travel-20-plus-miles")} />
            </div>
            <div>
              <Detail values={get("early-morning-3-5")} />
              <Detail values={get("early-morning-6-7")} />
            </div>
          </div>
          <article className="service-menu-style-note">
            <strong>{get("style-note").title}</strong>
            <p>{get("style-note").description}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
