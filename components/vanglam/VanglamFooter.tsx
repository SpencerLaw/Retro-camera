import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Linkedin, MessageCircle } from 'lucide-react';

const footerColumns = [
  {
    title: 'COMPANY',
    links: [
      { label: 'About QiLi Paper', to: '/vanglam/atelier' },
      { label: 'Sustainability', to: '/vanglam/atelier' },
      { label: 'News & Insights', to: '/vanglam/atelier' },
      { label: 'Careers', to: '/vanglam/atelier' },
    ],
  },
  {
    title: 'SUPPORT',
    links: [
      { label: 'Sample Kit', to: '/vanglam/request-sample-kit' },
      { label: 'Technical Information', to: '/vanglam/surfaces' },
      { label: 'FAQs', to: '/vanglam/color-system' },
      { label: 'Contact Us', to: '/vanglam/request-sample-kit' },
    ],
  },
  {
    title: 'POLICIES',
    links: [
      { label: 'Privacy Policy', to: '/vanglam/atelier' },
      { label: 'Terms of Use', to: '/vanglam/atelier' },
    ],
  },
];

export const VanglamFooter: React.FC = () => {
  return (
    <footer className="vanglam-footer">
      <div className="vanglam-footer-inner">
        <div className="vanglam-footer-brand">
          <span className="vanglam-brand-qili">QiLi Paper</span>
          <span className="vanglam-brand-divider" aria-hidden="true" />
          <span className="vanglam-brand-vanglam">
            VANGLAM
            <small>COLOR · PAPER · SURFACE</small>
          </span>
        </div>

        <div className="vanglam-footer-columns">
          {footerColumns.map((column) => (
            <section key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              {column.links.map((link) => (
                <Link key={link.label} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </section>
          ))}
          <section aria-label="CONNECT">
            <h2>CONNECT</h2>
            <a href="mailto:info@qilipaper.com">info@qilipaper.com</a>
            <a href="tel:+862112345678">+86 21 1234 5678</a>
            <div className="vanglam-socials" aria-label="Social links">
              <Link to="/vanglam/request-sample-kit" aria-label="Instagram">
                <Instagram size={16} strokeWidth={1.4} />
              </Link>
              <Link to="/vanglam/request-sample-kit" aria-label="LinkedIn">
                <Linkedin size={16} strokeWidth={1.4} />
              </Link>
              <Link to="/vanglam/request-sample-kit" aria-label="Contact VANGLAM">
                <MessageCircle size={16} strokeWidth={1.4} />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="vanglam-footer-base">
        <span>© 2024 QiLi Paper. All rights reserved.</span>
        <span>Crafted in paper. Made for beauty.</span>
      </div>
    </footer>
  );
};

export default VanglamFooter;
