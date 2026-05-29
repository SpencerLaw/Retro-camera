import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const primaryNav = [
  { label: 'Color System', to: '/vanglam/color-system' },
  { label: 'Collections', to: '/vanglam/collections' },
  { label: 'Surfaces', to: '/vanglam/surfaces' },
  { label: 'Applications', to: '/vanglam/applications' },
  { label: 'Artcard Lab', to: '/vanglam/artcard-lab' },
  { label: 'Atelier', to: '/vanglam/atelier' },
];

export const VanglamNavbar: React.FC = () => {
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
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link className="vanglam-nav-cta" to="/vanglam/request-sample-kit">
          REQUEST SAMPLE KIT
        </Link>
      </div>
    </header>
  );
};

export default VanglamNavbar;
