'use client';

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';

interface Conquista {
  codigo: string;
  titulo: string;
  descricao: string;
  categoria: string;
  icone: string;
  metaValor: number;
  valorAtual: number;
  xpRecompensa: number;
  desbloqueada: boolean;
  desbloqueadaEm: string | null;
  percentual: number;
}

interface Progresso {
  xpTotal: number;
  nivelAtual: number;
  percentualNivel: number;
  xpProgressoNivel: number;
  xpNecessarioProximo: number;
  sequenciaDias: number;
  maiorSequencia: number;
  totalDesbloqueadas: number;
  totalConquistas: number;
  percentualConquistas: number;
  conquistas: Conquista[];
}

export default function ConquistasPage() {
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('TODAS');

  useEffect(() => {
    apiFetch<Progresso>('/api/progresso')
      .then(setProgresso)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-amber-400 text-5xl animate-spin">military_tech</span>
          <p className="text-text-secondary text-sm font-semibold">Carregando conquistas e medalhas...</p>
        </div>
      </div>
    );
  }

  const conquistas = progresso?.conquistas || [];
  const categorias = ['TODAS', 'PRATICA', 'CONSISTENCIA', 'MODOS', 'DESEMPENHO'];
  const nomesCategorias: Record<string, string> = {
    TODAS: 'Todas as Badges',
    PRATICA: '🎯 Prática & Resolução',
    CONSISTENCIA: '🔥 Foco & Frequência',
    MODOS: '⚡ Modos de Estudo',
    DESEMPENHO: '🧠 Olho Clínico',
  };

  const conquistasFiltradas = categoriaAtiva === 'TODAS'
    ? conquistas
    : conquistas.filter((c) => c.categoria === categoriaAtiva);

  return (
    <div className="min-h-screen bg-surface-primary pb-32 md:pb-12">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 space-y-6 md:space-y-8 animate-slide-up">
        
        {/* Header da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <span className="material-symbols-outlined text-3xl">emoji_events</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Galeria de Conquistas</h1>
              <p className="text-text-secondary text-xs md:text-sm">Desbloqueie medalhas exclusivas e ganhe XP extra para evoluir seu Nível Clínico</p>
            </div>
          </div>

          {/* Card Sintético de Resumo */}
          {progresso && (
            <div className="glass-panel border border-white/10 rounded-2xl px-5 py-3 flex items-center space-x-4">
              <div>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Desbloqueio Global</p>
                <p className="text-xl font-black text-amber-400">
                  {progresso.totalDesbloqueadas} <span className="text-sm font-normal text-text-secondary">/ {progresso.totalConquistas}</span>
                </p>
              </div>
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-400"
                    strokeDasharray={`${progresso.percentualConquistas}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[11px] font-black text-white">{progresso.percentualConquistas}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Filtro por Categorias */}
        <div className="flex space-x-2 border-b border-white/10 pb-0 overflow-x-auto no-scrollbar scroll-smooth">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap -mb-px ${
                categoriaAtiva === cat
                  ? 'border-amber-400 text-white bg-white/5 rounded-t-xl'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              {nomesCategorias[cat] || cat}
            </button>
          ))}
        </div>

        {/* Grid de Cards de Conquista */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {conquistasFiltradas.map((c) => {
            const desbloqueada = c.desbloqueada;

            return (
              <div
                key={c.codigo}
                className={`glass-panel rounded-3xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between space-y-4 card-hover-effect ${
                  desbloqueada
                    ? 'border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-surface-primary/80 shadow-lg shadow-amber-500/10'
                    : 'border-white/10 opacity-70 grayscale hover:grayscale-0'
                }`}
              >
                {/* Badge Tag XP */}
                <div className="flex justify-between items-start">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                      desbloqueada
                        ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                        : 'bg-white/10 text-text-secondary border border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl">{c.icone}</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black flex items-center space-x-1 ${
                      desbloqueada
                        ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                        : 'bg-white/5 text-text-secondary border border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">stars</span>
                    <span>+{c.xpRecompensa} XP</span>
                  </span>
                </div>

                {/* Título e Descrição */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-black text-base">{c.titulo}</h3>
                    {desbloqueada && (
                      <span className="material-symbols-outlined text-emerald-400 text-lg" title="Desbloqueada!">
                        verified
                      </span>
                    )}
                  </div>
                  <p className="text-text-secondary text-xs leading-relaxed font-semibold">{c.descricao}</p>
                </div>

                {/* Barra de Progresso Parcial */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-text-secondary">
                      {desbloqueada ? 'Concluída!' : `Progresso: ${c.valorAtual}/${c.metaValor}`}
                    </span>
                    <span className={desbloqueada ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {c.percentual}%
                    </span>
                  </div>

                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        desbloqueada
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-amber-300'
                      }`}
                      style={{ width: `${c.percentual}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
