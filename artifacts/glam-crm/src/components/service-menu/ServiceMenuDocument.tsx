import type { ServiceMenuContentItem, ServiceMenuContentValues } from "@workspace/api-client-react";

export type ServiceMenuEdition = "general" | "florida";
export type ServiceMenuType = "bridal" | "party";

type Props = {
  edition: ServiceMenuEdition;
  items: ServiceMenuContentItem[];
  menuType?: ServiceMenuType;
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

function Brand({ edition, page, menuType }: { edition: ServiceMenuEdition; page: number; menuType: ServiceMenuType }) {
  return (
    <>
      <div className="service-menu-brand"><strong>G L A M B Y E A S M I N</strong><span>{edition.toUpperCase()} EDITION</span></div>
      <div className="service-menu-footer"><span>{menuType === "party" ? "PARTY SERVICES & PRICING" : "BRIDAL SERVICES & PRICING"}</span><span>0{page}</span></div>
    </>
  );
}

function Essential({ values, edition = "general" }: { values: ServiceMenuContentValues; edition?: ServiceMenuEdition }) {
  return (
    <article className="service-menu-essential">
      <div className="service-menu-title-price"><h3>{values.title}</h3><strong>{price(values, edition)}</strong></div>
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

function Detail({ values, edition = "general" }: { values: ServiceMenuContentValues; edition?: ServiceMenuEdition }) {
  return (
    <article className="service-menu-detail">
      <div className="service-menu-detail-heading"><strong>{values.title}</strong><span>{price(values, edition)}</span></div>
      <p>{values.description}</p>
    </article>
  );
}

export function ServiceMenuDocument({ edition, items, menuType = "bridal" }: Props) {
  const content = itemMap(items);
  const get = (id: string) => content.get(id) ?? {};
  const editionLabel = edition === "general" ? "General" : "Florida";

  if (menuType === "party") {
    return (
      <div className="service-menu-print-pages" data-testid="dynamic-service-menu-document">
        <section className="service-menu-sheet service-menu-party-sheet" aria-label="Party services menu page 1">
          <Brand edition="general" page={1} menuType="party" />
          <div className="service-menu-party-hero">
            <div className="service-menu-kicker">Event-ready beauty, personally tailored</div>
            <h2>Party Services</h2>
            <p>Polished makeup and hair for every celebration</p>
          </div>
          <div className="service-menu-party-content">
            <div className="service-menu-section-label">Choose your glam</div>
            <div className="service-menu-party-feature">
              <div className="service-menu-party-feature-images" aria-label="Simple Glam reference looks">
                <img src={publicAsset("service-menus/party-simple-glam-01.jpg")} alt="Simple Glam reference look with soft peach tones" />
                <img src={publicAsset("service-menus/party-simple-glam-02.jpg")} alt="Simple Glam reference look with neutral tones" />
              </div>
              <article>
                <span>Simple Glam</span>
                <div className="service-menu-title-price"><h3>{get("party-simple-glam").title}</h3><strong>{price(get("party-simple-glam"), "general")}</strong></div>
                <div className="service-menu-gold-line" />
                <p>{get("party-simple-glam").description}</p>
              </article>
            </div>
            <div className="service-menu-party-feature is-soft-glam">
              <article>
                <span>Soft, diffused definition</span>
                <div className="service-menu-title-price"><h3>{get("party-soft-glam").title}</h3><strong>{price(get("party-soft-glam"), "general")}</strong></div>
                <div className="service-menu-gold-line" />
                <p>{get("party-soft-glam").description}</p>
              </article>
              <div className="service-menu-party-feature-images" aria-label="Soft Glam reference looks">
                <img src={publicAsset("service-menus/party-soft-glam-01.jpg")} alt="Soft Glam reference look with softly defined eyes" />
                <img src={publicAsset("service-menus/party-soft-glam-02.jpg")} alt="Soft Glam reference look with luminous pink tones" />
              </div>
            </div>
            <div className="service-menu-party-feature is-party-glam">
              <div className="service-menu-party-feature-images is-triptych" aria-label="Party Glam reference looks">
                <img src={publicAsset("service-menus/party-glam-01.jpg")} alt="Party Glam reference look with glitter eyeshadow and winged liner" />
                <img src={publicAsset("service-menus/party-glam-02.jpg")} alt="Party Glam reference look with silver shimmer and smoky liner" />
                <img src={publicAsset("service-menus/party-glam-03.jpg")} alt="Party Glam reference look with luminous shimmer and rosy cheeks" />
              </div>
              <article>
                <span>A more expressive finish</span>
                <div className="service-menu-title-price"><h3>{get("party-full-glam").title}</h3><strong>{price(get("party-full-glam"), "general")}</strong></div>
                <div className="service-menu-gold-line" />
                <p>{get("party-full-glam").description}</p>
              </article>
            </div>
            <div className="service-menu-party-callout">
              <span>Every makeup service includes</span>
              <p>Luxury skin preparation, a customized complexion, polished finishing details, and professional lashes.</p>
            </div>
          </div>
        </section>

        <section className="service-menu-sheet service-menu-party-sheet" aria-label="Party services menu page 2">
          <Brand edition="general" page={2} menuType="party" />
          <div className="service-menu-page-two-content service-menu-party-page-two">
            <div className="service-menu-section-label">Complete the look</div>
            <h2>Hair, setup &amp; details</h2>
            <p className="service-menu-intro">Add the finishing touches, then review travel and timing before booking.</p>
            <div className="service-menu-party-addons">
              {["party-hair", "party-setup", "party-hijab-setup"].map((id) => (
                <Essential key={id} values={get(id)} />
              ))}
            </div>
            <div className="service-menu-section-label service-menu-travel-label">Travel &amp; timing</div>
            <div className="service-menu-detail-grid">
              <div>
                <Detail values={get("party-travel-10-15")} />
                <Detail values={get("party-travel-20-plus")} />
              </div>
              <div>
                <Detail values={get("party-early-3-5")} />
                <Detail values={get("party-early-6-7")} />
              </div>
            </div>
            <article className="service-menu-style-note">
              <strong>{get("party-style-note").title}</strong>
              <p>{get("party-style-note").description}</p>
            </article>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="service-menu-print-pages" data-testid="dynamic-service-menu-document">
      <section className="service-menu-sheet" aria-label={`${editionLabel} services menu page 1`}>
        <Brand edition={edition} page={1} menuType="bridal" />
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
        <Brand edition={edition} page={2} menuType="bridal" />
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
