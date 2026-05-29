import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useVanglamLanguage } from './VanglamLanguage';

export const VanglamNavbar: React.FC = () => {
  const { copy, language, toggleLanguage } = useVanglamLanguage();

  return (
    <header className="vanglam-navbar">
      <div className="vanglam-navbar-inner">
        <Link to="/vanglam" className="vanglam-brand" aria-label={copy.brandHomeAria}>
          <span className="vanglam-brand-qili">QiLi Paper</span>
          <span className="vanglam-brand-divider" aria-hidden="true" />
          <span className="vanglam-brand-vanglam">
            VANGLAM
            <small>{copy.brandTagline}</small>
          </span>
        </Link>

        <nav className="vanglam-nav-links" aria-label={copy.navAria}>
          {copy.nav.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="vanglam-nav-actions">
          <Link className="vanglam-nav-cta" to={copy.navActionTo}>
            {copy.navAction}
          </Link>
          <button
            className="vanglam-language-toggle"
            type="button"
            aria-label={copy.languageToggleAria}
            onClick={toggleLanguage}
          >
            <span className={language === 'en' ? 'is-active' : undefined}>EN</span>
            <span className={language === 'zh' ? 'is-active' : undefined}>中</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default VanglamNavbar;
