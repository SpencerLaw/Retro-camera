import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Layers, Send } from 'lucide-react';
import { VanglamNavbar } from './VanglamNavbar';
import { VanglamFooter } from './VanglamFooter';
import {
  APPLICATION_DETAILS,
  ARTCARD_ITEMS,
  ATELIER_FEATURES,
  ATELIER_STORY_POINTS,
  COLLECTION_DETAILS,
  COLOR_FAMILIES,
  COLOR_GUIDANCE,
  REQUEST_SAMPLE_FIELDS,
  SIGNATURE_COLORS,
  SURFACE_DETAILS,
} from './vanglamData';
import type { RequestSampleField, VanglamDetailCard } from './vanglamData';
import './vanglam.css';

interface PageFrameProps {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}

const PageFrame: React.FC<PageFrameProps> = ({ eyebrow, title, body, children, aside }) => (
  <div className="vanglam-v1-page vanglam-inner-page">
    <VanglamNavbar />
    <main>
      <section className="vanglam-page-hero">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{body}</p>
        </div>
        {aside && <aside>{aside}</aside>}
      </section>
      {children}
    </main>
    <VanglamFooter />
  </div>
);

const DetailGrid: React.FC<{ items: VanglamDetailCard[]; imageMode?: boolean }> = ({ items, imageMode = false }) => (
  <section className={`vanglam-editorial-grid ${imageMode ? 'vanglam-editorial-grid-image' : ''}`}>
    {items.map((item) => (
      <article key={item.id} className="vanglam-spec-card">
        {item.image && (
          <div className="vanglam-spec-card-image">
            <img src={item.image} alt={item.title} />
          </div>
        )}
        <span>{item.eyebrow}</span>
        <h2>{item.title}</h2>
        <p>{item.body}</p>
      </article>
    ))}
  </section>
);

const FieldControl: React.FC<{ field: RequestSampleField }> = ({ field }) => {
  if (field.type === 'textarea') {
    return (
      <label className="vanglam-form-field vanglam-form-field-wide">
        <span>{field.label}</span>
        <textarea name={field.id} rows={5} />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="vanglam-form-field">
        <span>{field.label}</span>
        <select name={field.id} defaultValue="">
          <option value="" disabled />
          {(field.options || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="vanglam-form-field">
      <span>{field.label}</span>
      <input name={field.id} type={field.type} />
    </label>
  );
};

export const VanglamColorSystemPage: React.FC = () => (
  <PageFrame
    eyebrow="Color System"
    title="A language of color, crafted in paper."
    body="Overview / Signature Colors / Six Families / Full Color Index / Color Guidance / Color Deck"
    aside={
      <div className="vanglam-page-color-stack">
        {SIGNATURE_COLORS.map((color) => (
          <div key={color.id} style={{ backgroundColor: color.tone }}>
            <span>{color.name}</span>
          </div>
        ))}
      </div>
    }
  >
    <DetailGrid items={COLOR_GUIDANCE} imageMode />

    <section className="vanglam-color-index">
      <div className="vanglam-page-section-heading">
        <span>Full Color Index</span>
        <h2>42 Core Colors - 6 Families - 3 Signature Colors.</h2>
      </div>
      {COLOR_FAMILIES.map((family) => (
        <article key={family.id} className="vanglam-color-family-block">
          <header>
            <span>{family.nameZh}</span>
            <h3>{family.nameEn}</h3>
            <p>{family.description}</p>
          </header>
          <div className="vanglam-color-chip-grid">
            {family.chips.map((chip) => (
              <div key={chip.id} className="vanglam-color-chip">
                <div style={{ backgroundColor: chip.hex }} />
                <span>{chip.id}</span>
                <strong>{chip.nameZh}</strong>
                <em>{chip.nameEn}</em>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  </PageFrame>
);

export const VanglamCollectionsPage: React.FC = () => (
  <PageFrame
    eyebrow="Collections"
    title="Curated families for every expression."
    body="Color Print / Touch / Pearl / Coated / Digital Coated / Bag / Label / Bespoke"
    aside={<img className="vanglam-page-aside-image" src="/vanglam/color-deck-fan.png" alt="VANGLAM color deck" />}
  >
    <DetailGrid items={COLLECTION_DETAILS} />
  </PageFrame>
);

export const VanglamSurfacesPage: React.FC = () => (
  <PageFrame
    eyebrow="Surfaces"
    title="Texture and finishes that bring ideas to life."
    body="Texture / Tactility / Pearlescent / Embossing / Coating / Foil & Stamping / UV & Special"
    aside={<img className="vanglam-page-aside-image" src="/vanglam/surface-tile.png" alt="embossed paper texture" />}
  >
    <DetailGrid items={SURFACE_DETAILS} imageMode />
  </PageFrame>
);

export const VanglamApplicationsPage: React.FC = () => (
  <PageFrame
    eyebrow="Applications"
    title="Find the right paper for each brand project."
    body="Wine & Spirits Labels / Beauty & Fragrance / Luxury Packaging / Premium Shopping Bags / Invitation & Cards / Hotel & Lifestyle"
    aside={<img className="vanglam-page-aside-image" src="/vanglam/application-bags.png" alt="VANGLAM bags and box" />}
  >
    <DetailGrid items={APPLICATION_DETAILS} imageMode />
  </PageFrame>
);

export const VanglamArtcardLabPage: React.FC = () => (
  <PageFrame
    eyebrow="Artcard Lab"
    title="Paper for emotion."
    body="Invitation cards, greeting cards, postcards and paper objects."
    aside={<img className="vanglam-page-aside-image" src="/vanglam/artcard-thanks.png" alt="embossed thank you card" />}
  >
    <DetailGrid items={ARTCARD_ITEMS} imageMode />
  </PageFrame>
);

export const VanglamAtelierPage: React.FC = () => (
  <PageFrame
    eyebrow="Atelier"
    title="Real manufacturing. Thoughtful process. Lasting quality."
    body="Manufacturing / Sample Making / Quality Control / Material Philosophy / Founder Story"
    aside={<img className="vanglam-page-aside-image" src="/vanglam/atelier-roll.png" alt="paper roll in production" />}
  >
    <section className="vanglam-process-strip">
      {ATELIER_FEATURES.map((feature) => (
        <article key={feature.id}>
          <Layers size={28} strokeWidth={1.2} />
          <h2>{feature.title}</h2>
          <p>{feature.body}</p>
        </article>
      ))}
    </section>
    <DetailGrid items={ATELIER_STORY_POINTS} />
  </PageFrame>
);

export const VanglamRequestSampleKitPage: React.FC = () => {
  const [sampleFormSubmitted, setSampleFormSubmitted] = useState(false);

  return (
    <PageFrame
      eyebrow="Request Sample Kit"
      title="Experience the difference. Request Your Sample Kit."
      body="Touch the difference. Start your story with VANGLAM."
      aside={
        <div className="vanglam-request-aside">
          <Check size={22} strokeWidth={1.3} />
          <p>Sample requests are routed by project, application and finishing needs.</p>
        </div>
      }
    >
      <section className="vanglam-sample-form-section">
        <div className="vanglam-page-section-heading">
          <span>Project Intake</span>
          <h2>Tell us what your material needs to do.</h2>
        </div>
        <form
          className="vanglam-sample-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSampleFormSubmitted(true);
          }}
        >
          {REQUEST_SAMPLE_FIELDS.map((field) => (
            <FieldControl key={field.id} field={field} />
          ))}
          <button type="submit" className="vanglam-form-submit">
            REQUEST SAMPLE KIT <Send size={15} strokeWidth={1.8} />
          </button>
          {sampleFormSubmitted && (
            <p className="vanglam-form-success" role="status">
              Sample kit request received
            </p>
          )}
        </form>
      </section>
      <section className="vanglam-request-links">
        <Link to="/vanglam/color-system">
          Explore Color System <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
        <Link to="/vanglam/collections">
          Browse Collections <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
        <Link to="/vanglam/surfaces">
          Study Surfaces <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
      </section>
    </PageFrame>
  );
};
