'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Início', path: '/', icon: 'dashboard' },
    { name: 'Explorar', path: '/explorar', icon: 'travel_explore' },
    { name: 'Quizzes', path: '/quizzes', icon: 'bolt' },
    { name: 'Desempenho', path: '/desempenho', icon: 'analytics' },
    { name: 'Conquistas', path: '/conquistas', icon: 'military_tech' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* ─── BARRA SUPERIOR DESKTOP (MD+) ────────────────────────────── */}
      <header className="hidden md:flex items-center justify-between px-8 py-3.5 glass-nav sticky top-0 z-50 transition-all">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-indigo via-indigo-500 to-yellow-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-surface-primary rounded-[10px] flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-400 text-2xl">bolt</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-wider text-white leading-none">PNA QUIZ</span>
            <span className="text-[10px] font-bold text-yellow-400/80 tracking-widest uppercase mt-0.5">Edição 4ª — APNA</span>
          </div>
        </Link>

        <nav className="flex space-x-2 bg-surface-primary/60 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  active
                    ? 'bg-brand-indigo text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${active ? 'text-yellow-400' : ''}`}>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Status Conexão / Nuvem */}
        <div className="flex items-center space-x-2.5 text-xs text-text-secondary bg-surface-primary/80 px-3.5 py-2 rounded-xl border border-white/5 shadow-inner">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <span className="font-bold text-white text-[11px]">Firebase Cloud Sincronizado</span>
        </div>
      </header>

      {/* ─── BARRA SUPERIOR MOBILE (< MD) ────────────────────────────── */}
      <header className="flex md:hidden items-center justify-between px-4 py-2.5 glass-nav sticky top-0 z-40">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-indigo to-yellow-400 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-surface-primary rounded-[6px] flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-400 text-lg">bolt</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider text-white leading-none">PNA QUIZ</span>
            <span className="text-[9px] font-bold text-yellow-400/90 tracking-widest uppercase">4ª Edição APNA</span>
          </div>
        </Link>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Nuvem Ativa</span>
        </div>
      </header>

      {/* ─── BARRA INFERIOR FLUTUANTE MOBILE (TOUCH FRIENDLY) ────────── */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 bg-slate-900/95 border border-white/10 flex justify-between items-center py-1.5 px-1.5 z-50 shadow-2xl rounded-2xl backdrop-blur-xl safe-bottom">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 min-h-[46px] rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
                active
                  ? 'text-yellow-400 bg-white/10 shadow-sm'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${active ? 'text-yellow-400 scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className="tracking-tight mt-0.5 truncate max-w-[58px] text-center leading-none">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}