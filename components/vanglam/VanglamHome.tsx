import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Box,
  Factory,
  Gem,
  Layers,
  Package,
  ShoppingBag,
  Sparkles,
  Tag,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { VanglamNavbar } from './VanglamNavbar';
import { VanglamFooter } from './VanglamFooter';
import { useVanglamCopy } from './VanglamLanguage';
import {
  ATELIER_FEATURES,
  COLLECTIONS,
  SIGNATURE_COLORS,
} from './vanglamData';
import './vanglam.css';

const collectionIcons: Record<string, LucideIcon> = {
  flower: Sparkles,
  cube: Box,
  shell: Gem,
  diamond: Package,
  box: Layers,
  bag: ShoppingBag,
  tag: Tag,
  wand: Wand2,
};

const atelierIcons: Record<string, LucideIcon> = {
  network: Sparkles,
  swatch: Layers,
  cube: Box,
  molecule: Gem,
};

export const VanglamHome: React.FC = () => {
  const navigate = useNavigate();
  const copy = useVanglamCopy();
  const signatureCopyById = new Map(copy.signatureColors.map((color) => [color.id, color]));
  const collectionCopyById = new Map(copy.collections.map((collection) => [collection.id, collection]));
  const atelierCopyById = new Map(copy.atelierFeatures.map((feature) => [feature.id, feature]));

  return (
    <div className="vanglam-v1-page">
      <VanglamNavbar />

      <main>
        <section className="vanglam-hero" aria-labelledby="vanglam-hero-title">
          <div className="vanglam-hero-copy">
            <h1 id="vanglam-hero-title" aria-label={copy.home.heroTitle}>
              {copy.home.heroLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <div className="vanglam-gold-rule" />
            <p>
              {copy.home.heroBodyLines.map((line, index) => (
                <React.Fragment key={line}>
                  {line}
                  {index < copy.home.heroBodyLines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <button className="vanglam-text-link" type="button" onClick={() => navigate('/vanglam/color-system')}>
              {copy.home.discoverColorSystem} <ArrowRight size={13} strokeWidth={1.7} />
            </button>
          </div>
          <div className="vanglam-hero-image" aria-label="VANGLAM embossed paper surface">
            <img src="/vanglam/hero-paper.png" alt="VANGLAM embossed paper surface" />
          </div>
        </section>

        <section id="signature-colors" className="vanglam-signature-section" aria-labelledby="signature-heading">
          <h2 id="signature-heading">{copy.home.signatureHeading}</h2>
          <div className="vanglam-signature-grid">
            {SIGNATURE_COLORS.map((color) => {
              const localizedColor = signatureCopyById.get(color.id);

              return (
                <Link
                  key={color.id}
                  to="/vanglam/color-system"
                  className="vanglam-signature-card"
                  aria-label={localizedColor?.aria || color.name}
                >
                  <img src={color.asset} alt={localizedColor?.alt || color.name} />
                  <div className="vanglam-visually-hidden">
                    <h3>{localizedColor?.name || color.name}</h3>
                    <p>{localizedColor?.phrase || color.phrase}</p>
                    <span>
                      {copy.home.explore} <ArrowRight size={12} strokeWidth={1.7} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section id="color-system" className="vanglam-color-system" aria-labelledby="color-system-heading">
          <div className="vanglam-section-copy">
            <span>{copy.home.colorSystemEyebrow}</span>
            <h2 id="color-system-heading">{copy.home.colorSystemTitle}</h2>
            <p>
              {copy.home.colorSystemBodyLines.map((line, index) => (
                <React.Fragment key={line}>
                  {line}
                  {index < copy.home.colorSystemBodyLines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
            <button className="vanglam-text-link" type="button" onClick={() => navigate('/vanglam/color-system')}>
              {copy.home.exploreSystem} <ArrowRight size={13} strokeWidth={1.7} />
            </button>
          </div>
          <div className="vanglam-deck-visual">
            <img src="/vanglam/color-deck-fan.png" alt="VANGLAM color deck fan" />
          </div>
        </section>

        <section id="collections" className="vanglam-collections" aria-labelledby="collections-heading">
          <h2 id="collections-heading">{copy.home.collectionsHeading}</h2>
          <div className="vanglam-collection-row">
            {COLLECTIONS.map((collection) => {
              const Icon = collectionIcons[collection.icon] || Package;
              const localizedCollection = collectionCopyById.get(collection.id);

              return (
                <Link
                  key={collection.id}
                  to="/vanglam/collections"
                  className="vanglam-collection-item"
                  aria-label={localizedCollection?.aria || collection.name}
                >
                  <Icon size={25} strokeWidth={1.15} />
                  <h3>{localizedCollection?.name || collection.name}</h3>
                  <p>{localizedCollection?.summary || collection.summary}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="vanglam-feature-grid" aria-label={copy.home.featureGridAria}>
          <article id="surfaces" className="vanglam-surface-panel">
            <div className="vanglam-panel-copy">
              <h2>{copy.home.surfacesTitle}</h2>
              <div className="vanglam-gold-rule" />
              <ul>
                {copy.surfaceTerms.map((surface) => (
                  <li key={surface}>{surface}</li>
                ))}
              </ul>
            </div>
            <img src="/vanglam/surface-tile.png" alt="embossed paper surface tile" />
          </article>

          <article id="applications" className="vanglam-applications-panel">
            <div className="vanglam-panel-copy">
              <h2>{copy.home.applicationsTitle}</h2>
              <ul>
                {copy.applications.map((application) => (
                  <li key={application.id}>
                    <span aria-hidden="true">□</span>
                    {application.label}
                  </li>
                ))}
              </ul>
            </div>
            <img src="/vanglam/application-bags.png" alt="premium shopping bag and box" />
          </article>

          <article id="artcard-lab" className="vanglam-artcard-panel">
            <div className="vanglam-panel-copy">
              <h2>{copy.home.artcardTitle}</h2>
              <div className="vanglam-gold-rule" />
              <p>
                {copy.home.artcardBodyLines.map((line, index) => (
                  <React.Fragment key={line}>
                    {line}
                    {index < copy.home.artcardBodyLines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
              <button className="vanglam-text-link" type="button" onClick={() => navigate('/vanglam/artcard-lab')}>
                {copy.home.exploreArtcard} <ArrowRight size={13} strokeWidth={1.7} />
              </button>
            </div>
            <img src="/vanglam/artcard-thanks.png" alt="white embossed thank you artcard" />
          </article>
        </section>

        <section id="atelier" className="vanglam-atelier" aria-labelledby="atelier-heading">
          <div className="vanglam-atelier-heading">
            <h2 id="atelier-heading">{copy.home.atelierTitle}</h2>
            <div className="vanglam-gold-rule" />
          </div>
          <div className="vanglam-atelier-grid">
            {ATELIER_FEATURES.map((feature) => {
              const Icon = atelierIcons[feature.icon] || Factory;
              const localizedFeature = atelierCopyById.get(feature.id);

              return (
                <article key={feature.id} className="vanglam-atelier-item">
                  <Icon size={32} strokeWidth={1.05} />
                  <div>
                    <h3>{localizedFeature?.title || feature.title}</h3>
                    <p>{localizedFeature?.body || feature.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <img src="/vanglam/atelier-roll.png" alt="large paper roll in production studio" />
        </section>

        <section id="request-sample-kit" className="vanglam-sample-cta" aria-labelledby="sample-kit-heading">
          <h2 id="sample-kit-heading">{copy.home.sampleTitle}</h2>
          <p>{copy.home.sampleBody}</p>
          <Link to="/vanglam/request-sample-kit" className="vanglam-primary-button">
            {copy.home.sampleButton} <ArrowRight size={14} strokeWidth={1.7} />
          </Link>
        </section>
      </main>

      <VanglamFooter />
    </div>
  );
};

export default VanglamHome;
