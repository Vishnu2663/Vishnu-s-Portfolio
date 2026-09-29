import type { Metadata, Viewport } from 'next';
import './globals.css';
import './factory.css';

export const metadata: Metadata = {
  title: 'Vishnu Vasavan — Software Engineer | Robot Factory Portfolio',
  description: 'Interactive 3D robot factory portfolio of Vishnu Vasavan, Software Engineer — Backend, Cloud, Databases. Node.js, PostgreSQL, AWS, GraphQL, Odoo ERP.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#050505' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const originalStringify = JSON.stringify;
              JSON.stringify = function (value, replacer, space) {
                const seen = new WeakSet();
                const circularReplacer = (key, val) => {
                  if (key === 'params' || key === 'searchParams') {
                    return undefined;
                  }
                  if (typeof val === 'object' && val !== null) {
                    try {
                      if (val instanceof Promise || typeof val.then === 'function') {
                        return undefined;
                      }
                    } catch (e) {}
                    if (seen.has(val)) {
                      return '[Circular]';
                    }
                    seen.add(val);
                  }
                  if (replacer) {
                    return replacer(key, val);
                  }
                  return val;
                };
                try {
                  return originalStringify(value, replacer || circularReplacer, space);
                } catch (err) {
                  try {
                    return originalStringify(value, circularReplacer, space);
                  } catch (innerErr) {
                    return '"[Circular or Unserializable Object]"';
                  }
                }
              };
            })();
          `
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
