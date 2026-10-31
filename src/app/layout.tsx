import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'AIKON Invest Lab', description: 'Laboratório educativo de inteligência patrimonial' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="pt-BR"><body>{children}</body></html>; }
