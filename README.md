# CodeTech Gadgets

## Development and checks

Run `npm install`, then `npm run dev`. Run `npm run build` for the production build and `npm run test:seo` for routing, metadata, structured data, and sitemap checks.

## SEO and deployment

The canonical origin is `https://www.codetechgadgets.online`, matching the live site's redirect. Public pages use `/devices`, `/goodies`, `/sell`, `/swap`, and `/product/<id>`. Existing `/#product/<id>` and `/#devices` bookmarks still resolve and are normalized on load. Product cards and navigation use ordinary links, including support for opening a new tab.

Each public page has its own title, description, canonical link, and social sharing metadata. Products include JSON-LD with current NGN prices and available storage variants. Store markup uses the address and phone displayed on the site. No sample reviews or ratings are published in the structured data. Admin, account, cart, support, and missing product views use `noindex`.

Deploy the project root to **Vercel** so `vercel.json` applies the direct-route rewrites and the sitemap API is deployed. `/robots.txt` is a static file; `/sitemap.xml` rewrites to `api/sitemap.js`. The sitemap queries only public, available products and includes every valid in-stock listing, across catalog batches. It refreshes through a five-minute CDN cache, with up to ten minutes of stale content during revalidation. Catalog/configuration errors return an uncached 503 rather than a misleading empty sitemap.

The Vercel server function needs `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_API_KEY` in the production environment, as well as the storefront's existing Firebase environment variables. It uses the public Firebase web configuration and existing public-read rules; it does not require an admin key or any rule changes. A Vite-only static upload will not serve the dynamic sitemap.

After deployment, verify the homepage, a direct product URL, `/robots.txt`, and `/sitemap.xml`. Submit `https://www.codetechgadgets.online/sitemap.xml` in the verified Google Search Console property, inspect representative URLs, and test a product URL in Google's Rich Results Test. Search Console ownership verification and submission require the site's Google account.

Page content and per-page metadata currently render through JavaScript. Google can render these pages, but social preview crawlers may show the generic initial HTML. Server rendering or prerendering is a further improvement for consistent previews and faster product discovery. Structured data does not guarantee rich results or rankings.
