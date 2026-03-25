import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Content-Security-Policy: Next.js App Router requires 'unsafe-inline' for script-src and
// style-src because it inlines JSON payloads and critical CSS during hydration. The Frankfurter
// exchange-rate API is called server-side only; client fetches go to /api/exchange-rates on the
// same origin, so connect-src 'self' is sufficient.
//
// HSTS is intentionally omitted here — it must only be served over HTTPS, and Vercel already
// sets it at the edge. Including it in Next.js config would break local HTTP dev.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
