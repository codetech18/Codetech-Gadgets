# CodeTech Gadgets

## Development and checks

Run `npm install`, then `npm run dev`. Run `npm run build` for the production build and `npm run test:seo` for routing, metadata, structured data, and sitemap checks.

## Paystack checkout and Dreacot delivery

Customers can pay for the devices in their bag and choose pickup or delivery. Delivery costs are excluded from the Paystack amount and require the customer's explicit acknowledgement. The existing WhatsApp purchase request remains available. Cart items survive payment redirects; callbacks and signed Paystack webhooks both verify and record the same order idempotently. Catalogue prices, storage options, stock, email, payment amount, currency, reference, and test/live mode are validated on the server. Never trust a browser success message as proof of payment.

Set the following variables in the **Vercel project**, then redeploy (Node.js 22). Do not send secret keys in chat or commit them to Git:

| Variable | Value |
|---|---|
| `VITE_PAYSTACK_PUBLIC_KEY` | The supplied public key is the live default. Override with the matching test public key for Preview testing. |
| `PAYSTACK_SECRET_KEY` | Matching Paystack secret key, server only. |
| `FIREBASE_ADMIN_PROJECT_ID` | Existing Firebase project ID. Must match the storefront project. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service account JSON's `client_email`. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service account JSON's `private_key`; actual newlines or literal `\n` are supported. |
| `CHECKOUT_ORIGIN` | `https://www.codetechgadgets.online` for Production; the exact Preview origin when testing. |

Obtain the Firebase server credentials from **Firebase Console → Project settings → Service accounts → Generate new private key**. Put the values directly in Vercel's protected environment variables. The Admin SDK runs only in server functions; private orders and rate limits remain denied by the existing Firestore client rules. The admin Online orders view uses a server endpoint that verifies the existing store admin's Firebase ID token. No Firestore rule changes are needed.

Set Paystack's webhook URL to `https://www.codetechgadgets.online/api/paystack-webhook` in **Settings → API Keys & Webhooks**. The callback is supplied per transaction. Keep separate test and live URLs/keys; the function rejects mismatched modes. The payment button appears only after `/api/checkout` reports server configuration present. A static Vite preview cannot run these functions; use Vercel Preview or `vercel dev` to test checkout end to end. Run `npm run test:payments` for server checkout, signature, stock, and idempotency checks, and `npm run test:sales` for sale history checks.

If this Paystack business already has a webhook for another website, coordinate forwarding before replacing it: this endpoint only processes CodeTech payment references. Enable a Firestore TTL policy on `paymentRateLimits.expiresAt` to remove expired rate-limit counters; counters are private and limits reset on a ten-minute time window independently of cleanup.

Confirmed payments deduct stock and record one private sale per unit. If stock changes during payment, the order is recorded as **paid · stock review needed** and sales are retained, but no inventory is deducted and delivery booking is blocked. Contact that customer to confirm an alternative or arrange a refund. There is no pre-payment stock reservation. Refunds/disputes are managed in Paystack and must currently be reconciled separately; the ordinary sale reversal is disabled for Paystack payments because it does not refund money.

For Dreacot, add `DREACOT_API_KEY`, `DREACOT_INTEGRATION_SLUG` (enabled by Dreacot for the custom store), and `DREACOT_VEHICLE_TYPE` (an active integer ID from `GET https://api.dreacotdelivery.com/api/fetch/vehicle_types`). Dreacot keys are server-only; test/live mode must match Paystack. In **Admin → Online orders**, request the quote after payment, agree the separate fee with the customer, then confirm payment arrangements and book delivery. Live bookings use the merchant's Dreacot wallet. Refresh tracking after booking to obtain the provider's tracking code. API coverage is currently Lagos pickup/drop-off; nationwide deliveries are handled manually. A timed-out booking is marked for reconciliation rather than automatically retried, preventing duplicate courier requests. No deliveries are created merely by setting credentials or receiving a Paystack payment.

Provider references: [Paystack payments](https://paystack.com/docs/payments/accept-payments/), [Paystack webhooks](https://paystack.com/docs/payments/webhooks/), [Firebase server setup](https://firebase.google.com/docs/admin/setup), [Dreacot partner API](https://www.dreacotdelivery.com/ng/api-docs).

## SEO and deployment

The canonical origin is `https://www.codetechgadgets.online`, matching the live site's redirect. Public pages use `/devices`, `/goodies`, `/sell`, `/swap`, and `/product/<id>`. Existing `/#product/<id>` and `/#devices` bookmarks still resolve and are normalized on load. Product cards and navigation use ordinary links, including support for opening a new tab.

Each public page has its own title, description, canonical link, and social sharing metadata. Products include JSON-LD with current NGN prices and available storage variants. Store markup uses the address and phone displayed on the site. No sample reviews or ratings are published in the structured data. Admin, account, cart, support, and missing product views use `noindex`.

Deploy the project root to **Vercel** so `vercel.json` applies the direct-route rewrites and the sitemap API is deployed. `/robots.txt` is a static file; `/sitemap.xml` rewrites to `api/sitemap.js`. The sitemap queries only public, available products and includes every valid in-stock listing, across catalog batches. It refreshes through a five-minute CDN cache, with up to ten minutes of stale content during revalidation. Catalog/configuration errors return an uncached 503 rather than a misleading empty sitemap.

The Vercel server function needs `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_API_KEY` in the production environment, as well as the storefront's existing Firebase environment variables. It uses the public Firebase web configuration and existing public-read rules; it does not require an admin key or any rule changes. A Vite-only static upload will not serve the dynamic sitemap.

After deployment, verify the homepage, a direct product URL, `/robots.txt`, and `/sitemap.xml`. Submit `https://www.codetechgadgets.online/sitemap.xml` in the verified Google Search Console property, inspect representative URLs, and test a product URL in Google's Rich Results Test. Search Console ownership verification and submission require the site's Google account.

Page content and per-page metadata currently render through JavaScript. Google can render these pages, but social preview crawlers may show the generic initial HTML. Server rendering or prerendering is a further improvement for consistent previews and faster product discovery. Structured data does not guarantee rich results or rankings.
