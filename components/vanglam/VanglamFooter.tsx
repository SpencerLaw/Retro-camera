import React from 'react';
import { Instagram, Linkedin, MessageCircle } from 'lucide-react';

const footerColumns = [
  {
    title: 'COMPANY',
    links: ['About QiLi Paper', 'Sustainability', 'News & Insights', 'Careers'],
  },
  {
    title: 'SUPPORT',
    links: ['Sample Kit', 'Technical Information', 'FAQs', 'Contact Us'],
  },
  {
    title: 'POLICIES',
    links: ['Privacy Policy', 'Terms of Use'],
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
                <a key={link} href="#request-sample-kit">
                  {link}
                </a>
              ))}
            </section>
          ))}
          <section aria-label="CONNECT">
            <h2>CONNECT</h2>
            <a href="mailto:info@qilipaper.com">info@qilipaper.com</a>
            <a href="tel:+862112345678">+86 21 1234 5678</a>
            <div className="vanglam-socials" aria-label="Social links">
              <a href="#request-sample-kit" aria-label="Instagram">
                <Instagram size={16} strokeWidth={1.4} />
              </a>
              <a href="#request-sample-kit" aria-label="LinkedIn">
                <Linkedin size={16} strokeWidth={1.4} />
              </a>
              <a href="#request-sample-kit" aria-label="Contact VANGLAM">
                <MessageCircle size={16} strokeWidth={1.4} />
              </a>
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
