import { pagePath } from '../lib/routes';
import { useState } from 'react';
import { Page, User } from '../types';

interface NavbarProps {
  currentPage: Page;
  cartCount: number;
  user: User | null;
  onNavigate: (page: Page) => void;
  onScrollToProducts: () => void;
  onLogout: () => void;
}

export default function Navbar({ currentPage, cartCount, onNavigate, onScrollToProducts }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const goShop = () => { onScrollToProducts(); setMenuOpen(false); };
  const linkClick = (event: React.MouseEvent<HTMLAnchorElement>, page: Page) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (page === 'devices') goShop(); else go(page);
  };
  const go = (page: Page) => { onNavigate(page); setMenuOpen(false); };

  return <>
    <header className="site-header">
      <a href="/" className="brand-lockup" onClick={event => linkClick(event, 'home')} aria-label="CodeTech Gadgets home">
        <img src="/codetech-mark.jpg" alt="" />
        <span className="brand-wordmark"><strong>CodeTech</strong><small>GADGETS</small></span>
      </a>
      <nav className="desktop-nav" aria-label="Main navigation">
        <a href={pagePath('home')} className={currentPage === 'home' ? 'nav-active' : ''} onClick={event => linkClick(event, 'home')}>Home</a>
        <a href={pagePath('devices')} className={currentPage === 'devices' ? 'nav-active' : ''} onClick={event => linkClick(event, 'devices')}>Devices</a>
        <a href={pagePath('goodies')} className={currentPage === 'goodies' ? 'nav-active' : ''} onClick={event => linkClick(event, 'goodies')}>Goodies</a>
        <a href={pagePath('sell')} className={currentPage === 'sell' ? 'nav-active' : ''} onClick={event => linkClick(event, 'sell')}>Sell</a>
        <a href={pagePath('swap')} className={currentPage === 'swap' ? 'nav-active' : ''} onClick={event => linkClick(event, 'swap')}>Swap</a>
      </nav>
      <div className="header-actions">
        <button className="cart-button" onClick={() => go('cart')} aria-label={`Purchase request list, ${cartCount} items`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>
          <span>Request list</span>{cartCount > 0 && <b>{cartCount}</b>}
        </button>
        <button className={`mobile-menu-trigger ${menuOpen ? 'is-open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close menu' : 'Open menu'}><i /><i /></button>
      </div>
    </header>
    {menuOpen && <div className="mobile-menu">
      <a className="mobile-nav-link" href={pagePath('home')} onClick={event => linkClick(event, 'home')}>Home</a>
      <a className="mobile-nav-link" href="/devices" onClick={event => linkClick(event, 'devices')}>Devices</a>
      <a className="mobile-nav-link" href={pagePath('goodies')} onClick={event => linkClick(event, 'goodies')}>Goodies</a>
      <a className="mobile-nav-link" href={pagePath('sell')} onClick={event => linkClick(event, 'sell')}>Sell</a>
      <a className="mobile-nav-link" href={pagePath('swap')} onClick={event => linkClick(event, 'swap')}>Swap</a>
      <a href="https://wa.me/2349058977101" target="_blank" rel="noreferrer">WhatsApp ↗</a>
    </div>}
  </>;
}
