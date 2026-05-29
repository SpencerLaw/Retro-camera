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
import {
  ATELIER_FEATURES,
  COLLECTIONS,
  SIGNATURE_COLORS,
  SURFACE_TERMS,
  VANGLAM_APPLICATIONS,
} from './vanglamData';
import './vanglam.css';

const heroTitle = 'Soul of Color. Signature in Every Surface.';

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

  return (
    <div className="vanglam-v1-page">
      <VanglamNavbar />

      <main>
        <section className="vanglam-hero" aria-labelledby="vanglam-hero-title">
          <div className="vanglam-hero-copy">
            <h1 id="vanglam-hero-title" aria-label={heroTitle}>
              <span>Soul of Color.</span>
              <span>Signature in</span>
              <span>Every Surface.</span>
            </h1>
            <div className="vanglam-gold-rule" />
            <p>
              QiLi Paper is a material atelier.
              <br />
              We create the color, paper and surface systems
              <br />
              that define the world's most premium packaging,
              <br />
              print and creative experiences.
            </p>
            <button className="vanglam-text-link" type="button" onClick={() => navigate('/vanglam/color-system')}>
              DISCOVER VANGLAM COLOR SYSTEM <ArrowRight size={13} strokeWidth={1.7} />
            </button>
          </div>
          <div className="vanglam-hero-image" aria-label="VANGLAM embossed paper surface">
            <img src="/vanglam/hero-paper.png" alt="VANGLAM embossed paper surface" />
          </div>
        </section>

        <section id="signature-colors" className="vanglam-signature-section" aria-labelledby="signature-heading">
          <h2 id="signature-heading">THREE SIGNATURE COLORS</h2>
          <div className="vanglam-signature-grid">
            {SIGNATURE_COLORS.map((color) => (
              <Link
                key={color.id}
                to="/vanglam/color-system"
                className="vanglam-signature-card"
                aria-label={`Explore ${color.name} in the VANGLAM color system`}
              >
                <img src={color.asset} alt={`${color.name} textured VANGLAM color card`} />
                <div className="vanglam-visually-hidden">
                  <h3>{color.name}</h3>
                  <p>{color.phrase}</p>
                  <span>
                    Explore <ArrowRight size={12} strokeWidth={1.7} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="color-system" className="vanglam-color-system" aria-labelledby="color-system-heading">
          <div className="vanglam-section-copy">
            <span>VANGLAM COLOR SYSTEM</span>
            <h2 id="color-system-heading">A language of color, crafted in paper.</h2>
            <p>
              A 42-color material system for premium packaging,
              <br />
              labels and print. Created for consistency.
              <br />
              Confirmed by spectrophotometer.
            </p>
            <button className="vanglam-text-link" type="button" onClick={() => navigate('/vanglam/color-system')}>
              EXPLORE THE SYSTEM <ArrowRight size={13} strokeWidth={1.7} />
            </button>
          </div>
          <div className="vanglam-deck-visual">
            <img src="/vanglam/color-deck-fan.png" alt="VANGLAM color deck fan" />
          </div>
        </section>

        <section id="collections" className="vanglam-collections" aria-labelledby="collections-heading">
          <h2 id="collections-heading">COLLECTIONS</h2>
          <div className="vanglam-collection-row">
            {COLLECTIONS.map((collection) => {
              const Icon = collectionIcons[collection.icon] || Package;
              return (
                <Link
                  key={collection.id}
                  to="/vanglam/collections"
                  className="vanglam-collection-item"
                  aria-label={`Explore ${collection.name} collection`}
                >
                  <Icon size={25} strokeWidth={1.15} />
                  <h3>{collection.name}</h3>
                  <p>{collection.summary}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="vanglam-feature-grid" aria-label="Surfaces, applications and Artcard Lab">
          <article id="surfaces" className="vanglam-surface-panel">
            <div className="vanglam-panel-copy">
              <h2>SURFACES</h2>
              <div className="vanglam-gold-rule" />
              <ul>
                {SURFACE_TERMS.map((surface) => (
                  <li key={surface}>{surface}</li>
                ))}
              </ul>
            </div>
            <img src="/vanglam/surface-tile.png" alt="embossed paper surface tile" />
          </article>

          <article id="applications" className="vanglam-applications-panel">
            <div className="vanglam-panel-copy">
              <h2>APPLICATIONS</h2>
              <ul>
                {VANGLAM_APPLICATIONS.map((application) => (
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
              <h2>ARTCARD LAB</h2>
              <div className="vanglam-gold-rule" />
              <p>
                Paper for emotion.
                <br />
                Invitation cards, greeting cards,
                <br />
                postcards and paper objects.
              </p>
              <button className="vanglam-text-link" type="button" onClick={() => navigate('/vanglam/artcard-lab')}>
                EXPLORE ARTCARD LAB <ArrowRight size={13} strokeWidth={1.7} />
              </button>
            </div>
            <img src="/vanglam/artcard-thanks.png" alt="white embossed thank you artcard" />
          </article>
        </section>

        <section id="atelier" className="vanglam-atelier" aria-labelledby="atelier-heading">
          <div className="vanglam-atelier-heading">
            <h2 id="atelier-heading">ATELIER</h2>
            <div className="vanglam-gold-rule" />
          </div>
          <div className="vanglam-atelier-grid">
            {ATELIER_FEATURES.map((feature) => {
              const Icon = atelierIcons[feature.icon] || Factory;
              return (
                <article key={feature.id} className="vanglam-atelier-item">
                  <Icon size={32} strokeWidth={1.05} />
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
          <img src="/vanglam/atelier-roll.png" alt="large paper roll in production studio" />
        </section>

        <section id="request-sample-kit" className="vanglam-sample-cta" aria-labelledby="sample-kit-heading">
          <h2 id="sample-kit-heading">Request Your Sample Kit</h2>
          <p>Touch the difference. Start your story with VANGLAM.</p>
          <Link to="/vanglam/request-sample-kit" className="vanglam-primary-button">
            REQUEST SAMPLE KIT <ArrowRight size={14} strokeWidth={1.7} />
          </Link>
        </section>
      </main>

      <VanglamFooter />
    </div>
  );
};

export default VanglamHome;
