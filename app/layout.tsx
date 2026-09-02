import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: "Hey Roll Let's Go — Hamburgueria Artesanal", description: 'Hambúrgueres artesanais na hamburgueria artesanal.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }