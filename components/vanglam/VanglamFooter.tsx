import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, MessageCircle } from 'lucide-react';
import { useVanglamCopy } from './VanglamLanguage';

export const VanglamFooter: React.FC = () => {
  const copy = useVanglamCopy();

  return (
    <footer className="vanglam-footer">
      <div className="vanglam-footer-inner">
        <div className="vanglam-footer-brand">
          <span className="vanglam-brand-qili">QiLi Paper</span>
          <span className="vanglam-brand-divider" aria-hidden="true" />
          <span className="vanglam-brand-vanglam">
            VANGLAM
            <small>{copy.brandTagline}</small>
          </span>
        </div>

        <div className="vanglam-footer-columns">
          {copy.footer.columns.map((column) => (
            <section key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              {column.links.map((link) => (
                <Link key={link.label} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </section>
          ))}
          <section className="vanglam-footer-contact-card" aria-label={copy.footer.connectTitle}>
            <h2>{copy.footer.connectTitle}</h2>
            <a className="vanglam-footer-contact-link" href="mailto:info@qilipaper.com">
              info@qilipaper.com
            </a>
            <div className="vanglam-footer-phone-links" aria-label="QiLi Paper phone numbers">
              <a className="vanglam-footer-contact-link" href="tel:+8651088231801">
                +8651088231801
              </a>
              <a className="vanglam-footer-contact-link" href="tel:+8613861882862">
                +8613861882862
              </a>
            </div>
            <div className="vanglam-socials" aria-label={copy.footer.socialsAria}>
              <Link className="vanglam-footer-social-link" to="/vanglam/request-sample-kit" aria-label={copy.footer.instagramAria}>
                <Instagram size={16} strokeWidth={1.4} />
              </Link>
              <Link className="vanglam-footer-social-link" to="/vanglam/request-sample-kit" aria-label={copy.footer.linkedinAria}>
                <Linkedin size={16} strokeWidth={1.4} />
              </Link>
              <Link className="vanglam-footer-social-link" to="/vanglam/request-sample-kit" aria-label={copy.footer.contactAria}>
                <MessageCircle size={16} strokeWidth={1.4} />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="vanglam-footer-base">
        <span>{copy.footer.rights}</span>
        <span>{copy.footer.line}</span>
      </div>
    </footer>
  );
};

export default VanglamFooter;
