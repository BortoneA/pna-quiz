'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';

interface Area { id: number; nome: string; }

const AREAS_PADRAO: Area[] = [
  { id: 1, nome: 'Cardiologia, Cirurgia Vascular e Cardiovascular' },
  { id: 2, nome: 'Pediatria' },
  { id: 3, nome: 'Neurologia e Neurocirurgia' },
  { id: 4, nome: 'Gastroenterologia e Cirurgia Geral' },
  { id: 5, nome: 'Ginecologia e Obstetrícia' },
  { id: 6, nome: 'Infecciologia e Microbiologia' },
  { id: 7, nome: 'Pneumologia e Cirurgia Torácica' },
  { id: 8, nome: 'Endocrinologia' },
  { id: 9, nome: 'Nefrologia' },
  { id: 10, nome: 'Hematologia' },
];

export default function Quizzes() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [titulo, setTitulo] = useState('');
  const [areaSelecionada, setAreaSelecionada] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [totalQuestoes, setTotalQuestoes] = useState(10);
  const [carregando, setCarregando] = useState(false);
  const [areaRapido, setAreaRapido] = useState('');
  const [carregandoRapido, setCarregandoRapido] = useState(false);

  useEffect(() => {
    apiFetch<Area[]>('/api/areas')
      .then((data) => {
        setAreas(data && data.length > 0 ? data : AREAS_PADRAO);
      })
      .catch(() => {
        setAreas(AREAS_PADRAO);
      });
  }, []);

  const handleCriarSimulado = async () => {
    setCarregando(true);
    try {
      const quiz = await apiFetch<any>('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({ titulo: 'Simulado Geral PNA', tipo: 'simulado', tempoLimiteMin: 120 }),
      });
      router.push(`/quizzes/${quiz.id}/resolver`);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar simulado.');
      setCarregando(false);
    }
  };

  const handleCriarRapido = async () => {
    setCarregandoRapido(true);
    try {
      const config: any = { totalQuestoes: 50 };
      if (areaRapido) config.areaId = Number(areaRapido);
      const quiz = await apiFetch<any>('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          titulo: areaRapido
            ? `Super Rápido - ${areas.find((a) => String(a.id) === areaRapido)?.nome || ''}`
            : 'Super Rápido - Geral',
          tipo: 'rapido',
          filtroConfig: config,
        }),
      });
      router.push(`/quizzes/${quiz.id}/rapido`);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar Super Rápido.');
      setCarregandoRapido(false);
    }
  };

  const handleCriarPersonalizado = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const config: any = { totalQuestoes };
      if (areaSelecionada) config.areaId = Number(areaSelecionada);
      if (dificuldade) config.dificuldade = dificuldade;
      const quiz = await apiFetch<any>('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({ titulo: titulo || 'Quiz Personalizado', tipo: 'personalizado', filtroConfig: config }),
      });
      router.push(`/quizzes/${quiz.id}/resolver`);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar quiz.');
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary pb-32 md:pb-12">
      <Navigation />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 space-y-6 md:space-y-8">

        {/* ─── MODO SUPER RÁPIDO ────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-surface-card border border-amber-500/35 p-5 sm:p-7 md:p-8 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black shadow-lg shadow-amber-500/25 shrink-0">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-white">Super Rápido (Fluxo 1 a 1)</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase">Acelerado</span>
              </div>
              <p className="text-text-secondary text-xs sm:text-sm">
                Uma questão por vez com resolução e gabarito comentados instantaneamente.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <select
              value={areaRapido}
              onChange={(e) => setAreaRapido(e.target.value)}
              className="flex-1 bg-surface-primary border border-amber-500/30 text-white text-xs sm:text-sm rounded-2xl px-4 py-3 focus:outline-none focus:border-amber-400 min-h-[46px]"
            >
              <option value="">Todas as Especialidades Médicas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
            <button
              onClick={handleCriarRapido}
              disabled={carregandoRapido}
              className="flex items-center justify-center space-x-2 px-6 py-3.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 text-black font-black rounded-2xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 min-h-[46px]"
            >
              <span className="material-symbols-outlined text-lg">bolt</span>
              <span>{carregandoRapido ? 'Iniciando...' : 'Iniciar Treino ⚡'}</span>
            </button>
          </div>
        </section>

        {/* ─── SIMULADO PNA ────────────────────────────────────────────── */}
        <section className="bg-surface-card p-6 md:p-8 rounded-3xl border border-surface-accent text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-brand-indigo/15 text-brand-indigo flex items-center justify-center mx-auto border border-brand-indigo/30 shadow-lg shadow-indigo-500/10">
            <span className="material-symbols-outlined text-4xl">workspace_premium</span>
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white">Simulado Geral Completo PNA</h2>
            <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">
              100 questões cronometradas distribuídas aleatoriamente por todos os 120 capítulos dos Manuais APNA.
            </p>
          </div>
          <button
            onClick={handleCriarSimulado}
            disabled={carregando}
            className="w-full sm:w-auto px-8 py-3.5 bg-brand-indigo hover:bg-brand-indigo/90 active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 mx-auto shadow-lg shadow-indigo-500/25 min-h-[46px]"
          >
            <span className="material-symbols-outlined text-lg">play_circle</span>
            <span>Iniciar Simulado (100 questões)</span>
          </button>
        </section>

        {/* ─── QUIZ PERSONALIZADO ──────────────────────────────────────── */}
        <section className="bg-surface-card rounded-3xl border border-surface-accent p-5 sm:p-7 md:p-8 space-y-5 shadow-xl">
          <div className="flex items-center space-x-2.5">
            <span className="material-symbols-outlined text-amber-400 text-2xl">tune</span>
            <h3 className="text-base sm:text-lg font-black text-white">Configurar Quiz Personalizado</h3>
          </div>

          <form onSubmit={handleCriarPersonalizado} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Título do Quiz</label>
                <input
                  type="text"
                  placeholder="Ex: Revisão de Cardiologia"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="bg-surface-primary border border-surface-accent text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-indigo min-h-[46px]"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Quantidade de Questões</label>
                <select
                  value={totalQuestoes}
                  onChange={(e) => setTotalQuestoes(Number(e.target.value))}
                  className="bg-surface-primary border border-surface-accent text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-indigo min-h-[46px]"
                >
                  <option value={5}>5 questões (Express)</option>
                  <option value={10}>10 questões (Rápido)</option>
                  <option value={20}>20 questões (Padrão)</option>
                  <option value={50}>50 questões (Aprofundado)</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Especialidade / Área</label>
                <select
                  value={areaSelecionada}
                  onChange={(e) => setAreaSelecionada(e.target.value)}
                  className="bg-surface-primary border border-surface-accent text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-indigo min-h-[46px]"
                >
                  <option value="">Todas as Especialidades</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-text-secondary uppercase">Nível de Dificuldade</label>
                <select
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value)}
                  className="bg-surface-primary border border-surface-accent text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-indigo min-h-[46px]"
                >
                  <option value="">Todas as Dificuldades</option>
                  <option value="fácil">Fácil</option>
                  <option value="média">Média</option>
                  <option value="difícil">Difícil</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3.5 bg-surface-accent hover:bg-surface-accent/80 active:scale-95 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 shadow-md min-h-[48px]"
            >
              <span className="material-symbols-outlined text-lg">tune</span>
              <span>{carregando ? 'Gerando...' : 'Gerar Quiz Personalizado'}</span>
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}