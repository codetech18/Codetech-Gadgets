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
  const go = (page: Page) => { onNavigate(page); setMenuOpen(false); };

  return <>
    <header className="site-header">
      <button className="brand-lockup" onClick={() => go('home')} aria-label="CodeTech Gadgets home">
        <img src="/codetech-mark.jpg" alt="" />
        <span className="brand-wordmark"><strong>CodeTech</strong><small>GADGETS</small></span>
      </button>
      <nav className="desktop-nav" aria-label="Main navigation">
        <button className={currentPage === 'home' ? 'nav-active' : ''} onClick={() => go('home')}>Home</button>
        <button className={currentPage === 'devices' ? 'nav-active' : ''} onClick={goShop}>Devices</button>
        <button className={currentPage === 'goodies' ? 'nav-active' : ''} onClick={() => go('goodies')}>Goodies</button>
        <button className={currentPage === 'sell' ? 'nav-active' : ''} onClick={() => go('sell')}>Sell</button>
        <button className={currentPage === 'swap' ? 'nav-active' : ''} onClick={() => go('swap')}>Swap</button>
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
      <button onClick={() => go('home')}>Home</button>
      <button onClick={goShop}>Devices</button>
      <button onClick={() => go('goodies')}>Goodies</button>
      <button onClick={() => go('sell')}>Sell</button>
      <button onClick={() => go('swap')}>Swap</button>
      <a href="https://wa.me/2349058977101" target="_blank" rel="noreferrer">WhatsApp ↗</a>
    </div>}
  </>;
}
