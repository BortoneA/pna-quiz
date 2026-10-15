'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';

interface Progresso {
  xpTotal: number;
  nivelAtual: number;
  xpProgressoNivel: number;
  xpNecessarioProximo: number;
  percentualNivel: number;
  sequenciaDias: number;
  maiorSequencia: number;
  metaDiariaQuestoes: number;
}

interface Area {
  id: number;
  nome: string;
  totalQuestoes: number;
  porcentagemAcerto: number;
}

const AREAS_PADRAO: Area[] = [
  { id: 1, nome: 'Cardiologia e Cirurgia Vascular', totalQuestoes: 450, porcentagemAcerto: 0 },
  { id: 2, nome: 'Pediatria & Puericultura', totalQuestoes: 420, porcentagemAcerto: 0 },
  { id: 3, nome: 'Neurologia e Neurocirurgia', totalQuestoes: 380, porcentagemAcerto: 0 },
  { id: 4, nome: 'Gastroenterologia e Cirurgia', totalQuestoes: 410, porcentagemAcerto: 0 },
  { id: 5, nome: 'Ginecologia e Obstetrícia', totalQuestoes: 390, porcentagemAcerto: 0 },
  { id: 6, nome: 'Infecciologia e Microbiologia', totalQuestoes: 350, porcentagemAcerto: 0 },
];

export default function Home() {
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<Progresso>('/api/progresso').catch(() => null),
      apiFetch<Area[]>('/api/areas').catch(() => []),
    ]).then(([progData, areasData]) => {
      setProgresso(progData);
      setAreas(areasData && areasData.length > 0 ? areasData : AREAS_PADRAO);
      setCarregando(false);
    });
  }, []);

  const nivelAtual = progresso?.nivelAtual || 1;
  const xpTotal = progresso?.xpTotal || 0;
  const xpProgresso = progresso?.xpProgressoNivel || 0;
  const xpNecessario = progresso?.xpNecessarioProximo || 100;
  const percentual = progresso?.percentualNivel || 0;

  return (
    <div className="min-h-screen bg-surface-primary pb-32 md:pb-12">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 space-y-6 md:space-y-8 animate-slide-up">
        {/* ─── HERO BANNER ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-amber-950/40 border border-white/10 p-5 sm:p-7 md:p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-xl">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">workspace_premium</span>
                <span>Manuais APNA — 4ª Edição Oficial</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight">
                Domine a Prova Nacional de Acesso
              </h1>

              <p className="text-text-secondary text-xs sm:text-sm md:text-base leading-relaxed">
                Mais de 5.000 questões reais comentadas, treino contínuo acelerado e acompanhamento de domínio clínico em tempo real.
              </p>
            </div>

            {/* Ações Rápidas no Hero (Otimizadas para Touch no Celular) */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
              <Link
                href="/quizzes"
                className="w-full flex items-center justify-center space-x-2.5 px-6 py-3.5 sm:py-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black rounded-2xl text-sm transition-all shadow-lg shadow-amber-500/20 min-h-[48px]"
              >
                <span className="material-symbols-outlined text-xl">bolt</span>
                <span>Treino Super Rápido ⚡</span>
              </Link>
              <Link
                href="/explorar"
                className="w-full flex items-center justify-center space-x-2 px-5 py-3 glass-panel hover:bg-white/10 active:scale-95 text-white font-bold rounded-2xl text-xs transition-all min-h-[44px]"
              >
                <span className="material-symbols-outlined text-base">travel_explore</span>
                <span>Explorar por Especialidades</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ─── STATUS DO JOGADOR / XP & GAMIFICAÇÃO ──────────────────── */}
        {carregando ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl glass-panel animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card Nível & XP */}
            <div className="md:col-span-2 glass-panel rounded-2xl p-5 sm:p-6 border border-white/5 space-y-4 relative overflow-hidden card-hover-effect">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/30 shrink-0">
                    {nivelAtual}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-base sm:text-lg">Nível {nivelAtual}</h3>
                    <p className="text-text-secondary text-xs font-semibold">
                      {xpTotal.toLocaleString('pt-BR')} XP acumulados
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] sm:text-xs text-text-secondary block uppercase font-bold">Próximo Nível</span>
                  <span className="text-amber-400 font-black text-xs sm:text-sm">
                    +{(xpNecessario - xpProgresso).toLocaleString('pt-BR')} XP
                  </span>
                </div>
              </div>

              {/* Barra de Progresso Nível */}
              <div className="space-y-1.5">
                <div className="w-full bg-surface-primary/80 rounded-full h-3 sm:h-3.5 p-0.5 border border-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-700 shadow-sm"
                    style={{ width: `${percentual}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                  <span>{xpProgresso} XP</span>
                  <span>{percentual}%</span>
                  <span>{xpNecessario} XP</span>
                </div>
              </div>
            </div>

            {/* Streak / Sequência de Estudos */}
            <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/5 flex flex-col justify-between card-hover-effect">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Sequência de Foco</span>
                <span className="material-symbols-outlined text-amber-500">local_fire_department</span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl sm:text-4xl font-black text-white">{progresso?.sequenciaDias || 0}</span>
                  <span className="text-text-secondary font-bold text-xs sm:text-sm">dias seguidos</span>
                </div>
                <p className="text-[11px] text-text-secondary mt-1">
                  Recorde pessoal: <strong className="text-amber-400">{progresso?.maiorSequencia || 0} dias</strong>
                </p>
              </div>

              <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center text-amber-400 text-[11px] font-semibold">
                🔥 Pratique ao menos 1 questão hoje!
              </div>
            </div>
          </div>
        )}

        {/* ─── MODOS DE ESTUDO ────────────────────────────────────────── */}
        <section className="space-y-3.5">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
            <span className="material-symbols-outlined text-indigo-400">sports_esports</span>
            <span>Modos de Treino</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Modo Super Rápido */}
            <Link
              href="/quizzes"
              className="glass-panel rounded-2xl p-5 sm:p-6 border border-amber-500/30 hover:border-amber-400 transition-all card-hover-effect group relative overflow-hidden active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-yellow-400 flex items-center justify-center font-bold text-lg">
                  ⚡
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 uppercase">Recomendado</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mb-1 group-hover:text-yellow-400 transition-colors">
                Super Rápido (1 a 1)
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed mb-3">
                Questões contínuas sem espera. Selecione, confirme e leia a explicação instantânea.
              </p>
              <span className="inline-flex items-center text-xs font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
                Iniciar Treino ⚡ &rarr;
              </span>
            </Link>

            {/* Simulado Geral */}
            <Link
              href="/quizzes"
              className="glass-panel rounded-2xl p-5 sm:p-6 border border-indigo-500/30 hover:border-indigo-400 transition-all card-hover-effect group relative overflow-hidden active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
                  🏆
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 uppercase">Oficial</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mb-1 group-hover:text-indigo-400 transition-colors">
                Simulado PNA
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed mb-3">
                100 questões cronometradas cobrindo todos os 120 capítulos do edital da Prova.
              </p>
              <span className="inline-flex items-center text-xs font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                Fazer Simulado &rarr;
              </span>
            </Link>

            {/* Analytics */}
            <Link
              href="/desempenho"
              className="sm:col-span-2 md:col-span-1 glass-panel rounded-2xl p-5 sm:p-6 border border-emerald-500/30 hover:border-emerald-400 transition-all card-hover-effect group relative overflow-hidden active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                  📊
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 uppercase">Estatísticas</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">
                Diagnóstico Clínico
              </h3>
              <p className="text-text-secondary text-xs leading-relaxed mb-3">
                Mapa de acertos por especialidade e identificação de subáreas frágeis para revisão.
              </p>
              <span className="inline-flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                Ver Desempenho &rarr;
              </span>
            </Link>
          </div>
        </section>

        {/* ─── ESPECIALIDADES EM DESTAQUE ──────────────────────────────── */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
              <span className="material-symbols-outlined text-amber-400">medical_services</span>
              <span>Especialidades Médicas</span>
            </h2>
            <Link href="/explorar" className="text-xs font-bold text-indigo-400 hover:underline">
              Ver todas ({areas.length}) &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {areas.slice(0, 6).map((area) => (
              <Link
                key={area.id}
                href="/explorar"
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex items-center justify-between card-hover-effect active:scale-[0.98]"
              >
                <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                  <h4 className="text-white font-bold text-xs sm:text-sm truncate">{area.nome}</h4>
                  <p className="text-text-secondary text-[11px]">{area.totalQuestoes} questões</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-amber-400 block">{area.porcentagemAcerto || 0}%</span>
                  <span className="text-[9px] text-text-secondary uppercase">Acertos</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}