import './globals.css';

export const metadata = {
  title: 'Facebook Comment Feeder & Exporter',
  description: 'Extract, anonymize, and export Facebook comments to Excel (.xlsx)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
