import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const primaryNav = [
  { label: 'Color System', href: '#color-system' },
  { label: 'Collections', href: '#collections' },
  { label: 'Surfaces', href: '#surfaces' },
  { label: 'Applications', href: '#applications' },
  { label: 'Artcard Lab', href: '#artcard-lab' },
  { label: 'Atelier', href: '#atelier' },
];

const scrollToSection = (href: string) => {
  if (!href.startsWith('#')) return;
  const element = document.querySelector(href);
  if (!element) return;
  const top = element.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: 'smooth' });
};

export const VanglamNavbar: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/vanglam';

  return (
    <header className="vanglam-navbar">
      <div className="vanglam-navbar-inner">
        <Link to="/vanglam" className="vanglam-brand" aria-label="QiLi Paper VANGLAM homepage">
          <span className="vanglam-brand-qili">QiLi Paper</span>
          <span className="vanglam-brand-divider" aria-hidden="true" />
          <span className="vanglam-brand-vanglam">
            VANGLAM
            <small>COLOR · PAPER · SURFACE</small>
          </span>
        </Link>

        <nav className="vanglam-nav-links" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <a
              key={item.label}
              href={isHome ? item.href : `/vanglam${item.href}`}
              onClick={(event) => {
                if (!isHome) return;
                event.preventDefault();
                scrollToSection(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a className="vanglam-nav-cta" href={isHome ? '#request-sample-kit' : '/vanglam#request-sample-kit'}>
          REQUEST SAMPLE KIT
        </a>
      </div>
    </header>
  );
};

export default VanglamNavbar;
