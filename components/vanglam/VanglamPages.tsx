import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Layers, Send } from 'lucide-react';
import { VanglamNavbar } from './VanglamNavbar';
import { VanglamFooter } from './VanglamFooter';
import { useVanglamCopy, useVanglamLanguage } from './VanglamLanguage';
import {
  ATELIER_FEATURES,
  COLOR_FAMILIES,
  SIGNATURE_COLORS,
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

export const VanglamColorSystemPage: React.FC = () => {
  const { copy, language } = useVanglamLanguage();
  const signatureCopyById = new Map(copy.signatureColors.map((color) => [color.id, color]));

  return (
    <PageFrame
      eyebrow={copy.pages.colorSystem.eyebrow}
      title={copy.pages.colorSystem.title}
      body={copy.pages.colorSystem.body}
      aside={
        <div className="vanglam-page-color-stack">
          {SIGNATURE_COLORS.map((color) => {
            const localizedColor = signatureCopyById.get(color.id);

            return (
              <div key={color.id} style={{ backgroundColor: color.tone }}>
                <span>{localizedColor?.name || color.name}</span>
              </div>
            );
          })}
        </div>
      }
    >
      <DetailGrid items={copy.details.colorGuidance} imageMode />

      <section className="vanglam-color-index">
        <div className="vanglam-page-section-heading">
          <span>{copy.colorIndex.eyebrow}</span>
          <h2>{copy.colorIndex.title}</h2>
        </div>
        {COLOR_FAMILIES.map((family) => (
          <article key={family.id} className="vanglam-color-family-block">
            <header>
              <span>{language === 'zh' ? family.nameEn : family.nameZh}</span>
              <h3>{language === 'zh' ? family.nameZh : family.nameEn}</h3>
              <p>{copy.colorIndex.familyDescriptions[family.id]}</p>
            </header>
            <div className="vanglam-color-chip-grid">
              {family.chips.map((chip) => (
                <div key={chip.id} className="vanglam-color-chip">
                  <div style={{ backgroundColor: chip.hex }} />
                  <span>{chip.id}</span>
                  <strong>{language === 'zh' ? chip.nameZh : chip.nameEn}</strong>
                  <em>{language === 'zh' ? chip.nameEn : chip.nameZh}</em>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </PageFrame>
  );
};

export const VanglamCollectionsPage: React.FC = () => {
  const copy = useVanglamCopy();

  return (
    <PageFrame
      eyebrow={copy.pages.collections.eyebrow}
      title={copy.pages.collections.title}
      body={copy.pages.collections.body}
      aside={<img className="vanglam-page-aside-image" src="/vanglam/color-deck-fan.png" alt={copy.pages.collections.asideAlt} />}
    >
      <DetailGrid items={copy.details.collections} />
    </PageFrame>
  );
};

export const VanglamSurfacesPage: React.FC = () => {
  const copy = useVanglamCopy();

  return (
    <PageFrame
      eyebrow={copy.pages.surfaces.eyebrow}
      title={copy.pages.surfaces.title}
      body={copy.pages.surfaces.body}
      aside={<img className="vanglam-page-aside-image" src="/vanglam/surface-tile.png" alt={copy.pages.surfaces.asideAlt} />}
    >
      <DetailGrid items={copy.details.surfaces} imageMode />
    </PageFrame>
  );
};

export const VanglamApplicationsPage: React.FC = () => {
  const copy = useVanglamCopy();

  return (
    <PageFrame
      eyebrow={copy.pages.applications.eyebrow}
      title={copy.pages.applications.title}
      body={copy.pages.applications.body}
      aside={<img className="vanglam-page-aside-image" src="/vanglam/application-bags.png" alt={copy.pages.applications.asideAlt} />}
    >
      <DetailGrid items={copy.details.applications} imageMode />
    </PageFrame>
  );
};

export const VanglamArtcardLabPage: React.FC = () => {
  const copy = useVanglamCopy();

  return (
    <PageFrame
      eyebrow={copy.pages.artcardLab.eyebrow}
      title={copy.pages.artcardLab.title}
      body={copy.pages.artcardLab.body}
      aside={<img className="vanglam-page-aside-image" src="/vanglam/artcard-thanks.png" alt={copy.pages.artcardLab.asideAlt} />}
    >
      <DetailGrid items={copy.details.artcard} imageMode />
    </PageFrame>
  );
};

export const VanglamAtelierPage: React.FC = () => {
  const copy = useVanglamCopy();
  const atelierCopyById = new Map(copy.atelierFeatures.map((feature) => [feature.id, feature]));

  return (
    <PageFrame
      eyebrow={copy.pages.atelier.eyebrow}
      title={copy.pages.atelier.title}
      body={copy.pages.atelier.body}
      aside={<img className="vanglam-page-aside-image" src="/vanglam/atelier-roll.png" alt={copy.pages.atelier.asideAlt} />}
    >
      <section className="vanglam-process-strip">
        {ATELIER_FEATURES.map((feature) => {
          const localizedFeature = atelierCopyById.get(feature.id);

          return (
            <article key={feature.id}>
              <Layers size={28} strokeWidth={1.2} aria-label={copy.processIconLabel} />
              <h2>{localizedFeature?.title || feature.title}</h2>
              <p>{localizedFeature?.body || feature.body}</p>
            </article>
          );
        })}
      </section>
      <DetailGrid items={copy.details.atelierStory} />
    </PageFrame>
  );
};

export const VanglamRequestSampleKitPage: React.FC = () => {
  const [sampleFormSubmitted, setSampleFormSubmitted] = useState(false);
  const copy = useVanglamCopy();

  return (
    <PageFrame
      eyebrow={copy.pages.requestSample.eyebrow}
      title={copy.pages.requestSample.title}
      body={copy.pages.requestSample.body}
      aside={
        <div className="vanglam-request-aside">
          <Check size={22} strokeWidth={1.3} />
          <p>{copy.requestAside}</p>
        </div>
      }
    >
      <section className="vanglam-sample-form-section">
        <div className="vanglam-page-section-heading">
          <span>{copy.projectIntake}</span>
          <h2>{copy.projectIntakeTitle}</h2>
        </div>
        <form
          className="vanglam-sample-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSampleFormSubmitted(true);
          }}
        >
          {copy.requestFields.map((field) => (
            <FieldControl key={field.id} field={field} />
          ))}
          <button type="submit" className="vanglam-form-submit">
            {copy.requestSample} <Send size={15} strokeWidth={1.8} />
          </button>
          {sampleFormSubmitted && (
            <p className="vanglam-form-success" role="status">
              {copy.requestSuccess}
            </p>
          )}
        </form>
      </section>
      <section className="vanglam-request-links">
        <Link to="/vanglam/color-system">
          {copy.requestLinks.colorSystem} <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
        <Link to="/vanglam/collections">
          {copy.requestLinks.collections} <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
        <Link to="/vanglam/surfaces">
          {copy.requestLinks.surfaces} <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
      </section>
    </PageFrame>
  );
};
