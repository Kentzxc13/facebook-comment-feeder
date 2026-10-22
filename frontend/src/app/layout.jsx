import './globals.css';

export const metadata = {
  title: 'Facebook Comment Feeder & Exporter',
  description: 'Extract, anonymize, and export Facebook comments to Excel (.xlsx)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-slate-100">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full font-sans text-slate-800 antialiased selection:bg-[#ffe8e2] selection:text-[#ff5733] p-4 md:p-8">
        {children}
      </body>
    </html>
  );
}
