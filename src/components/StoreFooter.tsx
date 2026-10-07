export default function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="footer-brand"><img src="/codetech-mark.jpg" alt="" /><div><strong>CodeTech Gadgets</strong><span>Buy · Sell · Swap</span></div></div>
      <a href="https://wa.me/2349058977101" target="_blank" rel="noreferrer">WhatsApp our team <span aria-hidden="true">↗</span></a>
      <address><strong>Visit our store</strong><span>4B Otigba Street, opposite Adeple Street, Computer Village, Ikeja, Lagos.</span></address>
      <small>© {new Date().getFullYear()} CodeTech Gadgets</small>
    </footer>
  );
}
