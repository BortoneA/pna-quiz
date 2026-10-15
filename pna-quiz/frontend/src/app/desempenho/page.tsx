'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';

/* ─── Types ──────────────────────────────────────────────────── */
interface Resumo {
  xpTotal: number; nivelAtual: number; sequenciaDias: number; maiorSequencia: number;
  totalRespostas: number; totalAcertos: number; totalErros: number;
  taxaAcertoGeral: number; tentativasConcluidas: number;
  xpHoje: number; respostasHoje: number; metaDiaria: number;
}
interface AreaStat {
  areaId: number; areaNome: string; totalQuestoes: number;
  totalRespondidas: number; totalAcertos: number; taxaAcerto: number; cobertura: number;
}
interface SubareaStat {
  subareaId: number;
  subareaCodigo: string;
  subareaNome: string;
  capituloNome: string;
  areaId: number;
  areaNome: string;
  totalRespondidas: number;
  totalAcertos: number;
  totalErros: number;
  taxaAcerto: number;
  taxaErro: number;
}
interface SubareasResponse {
  rankingGeralCritico: SubareaStat[];
  agrupadoPorArea: Record<string, SubareaStat[]>;
}
interface DificuldadeStat {
  nivel: string;
  totalQuestoes: number;
  totalRespondidas: number;
  totalAcertos: number;
  totalErros: number;
  taxaAcerto: number;
}
interface CoberturaStat {
  totalBanco: number;
  totalRespondidasUnicas: number;
  totalPendentes: number;
  percentualCobertura: number;
}

interface DiaStat { data: string; total: number; acertos: number; taxaAcerto: number; }
interface XpDia { data: string; xp: number; }
interface Tentativa {
  id: string; quizTitulo: string; quizTipo: string;
  totalQuestoes: number; totalAcertos: number; taxaAcerto: number;
  xpGanho: number; tempoTotalSeg: number; concluidoEm: string;
}

interface SliceItem {
  label: string;
  valor: number;
  cor: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function taxaColor(pct: number) {
  if (pct >= 70) return 'text-emerald-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-rose-400';
}
function barColor(pct: number) {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}
function nivelDominio(pct: number) {
  if (pct >= 85) return { rotulo: 'Especialista', cor: 'text-purple-400 bg-purple-500/20 border-purple-500/30' };
  if (pct >= 70) return { rotulo: 'Avançado', cor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30' };
  if (pct >= 50) return { rotulo: 'Intermediário', cor: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
  return { rotulo: 'Iniciante', cor: 'text-rose-400 bg-rose-500/20 border-rose-500/30' };
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function tipoLabel(tipo: string) {
  const m: Record<string,string> = { simulado: 'Simulado', personalizado: 'Quiz', rapido: 'Super Rápido', revisao: 'Revisão' };
  return m[tipo] ?? tipo;
}
function tipoBadge(tipo: string) {
  const m: Record<string,string> = { simulado: 'bg-brand-indigo/20 text-brand-indigo', personalizado: 'bg-surface-accent text-text-secondary', rapido: 'bg-amber-500/20 text-amber-400', revisao: 'bg-purple-500/20 text-purple-400' };
  return `px-2.5 py-0.5 rounded-full text-xs font-semibold ${m[tipo] ?? 'bg-surface-accent text-text-secondary'}`;
}

const PALETA_CORES = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#f43f5e', '#3b82f6', '#14b8a6', '#a855f7'
];

/* ─── Gráfico de Pizza SVG ─────────────────────── */
function PieChartSVG({ itens, tituloCentral }: { itens: SliceItem[]; tituloCentral?: string }) {
  const totalVal = itens.reduce((sum, item) => sum + item.valor, 0);

  if (totalVal === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 space-y-2 text-text-secondary">
        <span className="material-symbols-outlined text-3xl opacity-40">pie_chart</span>
        <p className="text-xs font-semibold">Sem dados suficientes para gerar o gráfico</p>
      </div>
    );
  }

  let accumulatedAngle = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const slices = itens.map((item) => {
    const pct = item.valor / totalVal;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle * circumference;
    accumulatedAngle += pct;
    return { ...item, pct, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
      <div className="relative flex items-center justify-center w-44 h-44 shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="16" fill="none" />
          {slices.map((slice, idx) => (
            <circle
              key={idx}
              cx="50"
              cy="50"
              r={radius}
              stroke={slice.cor}
              strokeWidth="16"
              strokeDasharray={slice.strokeDasharray}
              strokeDashoffset={slice.strokeDashoffset}
              fill="none"
              className="transition-all duration-700 hover:opacity-80 cursor-pointer"
            />
          ))}
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center px-2">
          <span className="text-xl font-black text-white">{totalVal}</span>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{tituloCentral || 'Total'}</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 w-full">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs glass-panel p-2 rounded-xl border border-white/5 hover:border-white/20 transition-all">
            <div className="flex items-center space-x-2 truncate pr-2">
              <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: slice.cor }} />
              <span className="text-white font-semibold truncate">{slice.label}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-white font-bold">{slice.valor}</span>
              <span className="text-text-secondary text-[11px] font-mono">({Math.round(slice.pct * 100)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Rosca SVG de Precisão ───────────────── */
function RoscaDesempenho({ acertos, erros }: { acertos: number; erros: number }) {
  const total = acertos + erros;
  const pctAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0;
  
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctAcerto / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="10" className="text-rose-500/30 fill-none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-emerald-400 fill-none transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-white">{pctAcerto}%</span>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Precisão</span>
      </div>
    </div>
  );
}

function Heatmap({ dias }: { dias: DiaStat[] }) {
  const maxTotal = Math.max(...dias.map((d) => d.total), 1);
  return (
    <div className="flex gap-1.5 flex-wrap">
      {dias.map((d) => {
        const intensity = d.total === 0 ? 0 : Math.max(0.15, d.total / maxTotal);
        const bg = d.total === 0
          ? 'bg-white/5'
          : d.taxaAcerto >= 70
          ? `bg-emerald-500`
          : d.taxaAcerto >= 50
          ? `bg-amber-500`
          : `bg-rose-500`;
        return (
          <div key={d.data} title={`${formatDate(d.data)}: ${d.total} questões (${d.taxaAcerto}% acerto)`}
            className={`w-7 h-7 rounded-md ${bg} transition-all cursor-default hover:scale-110 shadow-sm`}
            style={{ opacity: d.total === 0 ? 0.2 : Math.max(0.4, intensity) }}
          />
        );
      })}
    </div>
  );
}

function XpChart({ dados }: { dados: XpDia[] }) {
  const maxXp = Math.max(...dados.map((d) => d.xp), 1);
  const ultimos14 = dados.slice(-14);
  return (
    <div className="flex items-end gap-2 h-24 pt-4">
      {ultimos14.map((d) => {
        const h = d.xp === 0 ? 4 : Math.max(8, Math.round((d.xp / maxXp) * 88));
        return (
          <div key={d.data} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-7 hidden group-hover:flex bg-slate-900 border border-white/10 text-[11px] text-white px-2 py-0.5 rounded-lg whitespace-nowrap z-20 shadow-xl">
              {formatDate(d.data)}: {d.xp} XP
            </div>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-amber-400 transition-all shadow-md shadow-indigo-500/20"
              style={{ height: `${h}px` }}
            />
            <span className="text-[10px] text-text-secondary opacity-60 font-semibold">{formatDate(d.data)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Desempenho() {
  const router = useRouter();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [areas, setAreas] = useState<AreaStat[]>([]);
  const [fraquezas, setFraquezas] = useState<AreaStat[]>([]);
  const [forcas, setForcas] = useState<AreaStat[]>([]);
  const [subareasData, setSubareasData] = useState<SubareasResponse | null>(null);
  const [dificuldadeData, setDificuldadeData] = useState<DificuldadeStat[]>([]);
  const [coberturaData, setCoberturaData] = useState<CoberturaStat | null>(null);
  const [atividade, setAtividade] = useState<DiaStat[]>([]);
  const [xpEvol, setXpEvol] = useState<XpDia[]>([]);
  const [historico, setHistorico] = useState<Tentativa[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'pizzas'|'subareas'|'dificuldade'|'areas'|'historico'>('overview');
  const [areaPizzaSelecionada, setAreaPizzaSelecionada] = useState<string>('');

  useEffect(() => {
    Promise.all([
      apiFetch<Resumo>('/api/analytics/resumo'),
      apiFetch<AreaStat[]>('/api/analytics/por-area'),
      apiFetch<AreaStat[]>('/api/analytics/fraquezas'),
      apiFetch<AreaStat[]>('/api/analytics/forcas'),
      apiFetch<SubareasResponse>('/api/analytics/subareas-erradas').catch(() => ({ rankingGeralCritico: [], agrupadoPorArea: {} })),
      apiFetch<DificuldadeStat[]>('/api/analytics/dificuldade').catch(() => []),
      apiFetch<CoberturaStat>('/api/analytics/cobertura-banco').catch(() => null),
      apiFetch<DiaStat[]>('/api/analytics/atividade-diaria'),
      apiFetch<XpDia[]>('/api/analytics/evolucao-xp'),
      apiFetch<Tentativa[]>('/api/analytics/historico'),
    ]).then(([r, a, fr, fo, sub, dif, cob, at, xp, h]) => {
      setResumo(r); setAreas(a); setFraquezas(fr); setForcas(fo);
      setSubareasData(sub); setDificuldadeData(dif); setCoberturaData(cob);
      setAtividade(at); setXpEvol(xp); setHistorico(h);

      const chavesArea = Object.keys(sub?.agrupadoPorArea || {});
      if (chavesArea.length > 0) {
        setAreaPizzaSelecionada(chavesArea[0]);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-brand-indigo text-5xl animate-spin">analytics</span>
          <p className="text-text-secondary text-sm font-semibold">Carregando diagnósticos e projeções médicas...</p>
        </div>
      </div>
    );
  }

  const metaPct = resumo ? Math.min(Math.round((resumo.respostasHoje / resumo.metaDiaria) * 100), 100) : 0;
  
  // Projeção APNA (Estimativa de pontuação de 0 a 100 com base na taxa e no volume)
  const projecaoNotaApna = resumo ? Math.round(resumo.taxaAcertoGeral * 0.9 + Math.min(resumo.totalRespostas / 50, 10)) : 0;

  // Cálculo de Tempo Médio por Questão (segundos)
  const tempoTotalSeg = historico.reduce((acc, curr) => acc + (curr.tempoTotalSeg || 0), 0);
  const totalQuestoesHistorico = historico.reduce((acc, curr) => acc + (curr.totalQuestoes || 0), 0);
  const tempoMedioSeg = totalQuestoesHistorico > 0 ? Math.round(tempoTotalSeg / totalQuestoesHistorico) : 48;

  const pizzaAreaItems: SliceItem[] = areas
    .filter((a) => a.totalRespondidas > 0)
    .map((a, idx) => ({
      label: a.areaNome,
      valor: a.totalRespondidas,
      cor: PALETA_CORES[idx % PALETA_CORES.length],
    }));

  const coresDif: Record<string, string> = { facil: '#10b981', media: '#f59e0b', dificil: '#f43f5e' };
  const nomesDif: Record<string, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' };
  const pizzaDificuldadeItems: SliceItem[] = dificuldadeData
    .filter((d) => d.totalRespondidas > 0)
    .map((d) => ({
      label: nomesDif[d.nivel] || d.nivel,
      valor: d.totalRespondidas,
      cor: coresDif[d.nivel] || '#6366f1',
    }));

  const subareasDaAreaSelecionada = subareasData?.agrupadoPorArea[areaPizzaSelecionada] || [];
  const pizzaSubareaItems: SliceItem[] = subareasDaAreaSelecionada.map((sub, idx) => ({
    label: sub.subareaNome,
    valor: sub.totalRespondidas,
    cor: PALETA_CORES[idx % PALETA_CORES.length],
  }));

  return (
    <div className="min-h-screen bg-surface-primary pb-32 md:pb-12">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 space-y-6 md:space-y-8 animate-slide-up">

        {/* Título e Ação Rápida */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <span className="material-symbols-outlined text-2xl">insights</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">Analytics Médico & Desempenho</h1>
              <p className="text-text-secondary text-xs md:text-sm">Projeção APNA, métricas de tempo, diagnósticos por subárea e gráficos de pizza</p>
            </div>
          </div>

          <button
            onClick={() => router.push('/quizzes')}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
          >
            <span className="material-symbols-outlined text-base">bolt</span>
            <span>Treinar Agora ⚡</span>
          </button>
        </div>

        {/* PROJEÇÃO APNA E PAINEL PRINCIPAL */}
        {resumo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Projeção de Nota APNA */}
            <div className="glass-panel border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-surface-primary rounded-3xl p-5 flex flex-col justify-between space-y-2 card-hover-effect">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Projeção APNA</span>
                <span className="material-symbols-outlined text-indigo-400">workspace_premium</span>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-black text-white">{projecaoNotaApna}</span>
                <span className="text-xs text-text-secondary font-semibold"> / 100 pt</span>
                <p className="text-[11px] text-text-secondary mt-1">Estimativa de score clínico real</p>
              </div>
            </div>

            {/* Tempo Médio por Questão */}
            <div className="glass-panel border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-2 card-hover-effect">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Ritmo de Prova</span>
                <span className="material-symbols-outlined text-amber-400">timer</span>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-black text-white">{tempoMedioSeg}s</span>
                <span className="text-xs text-text-secondary font-semibold"> / questão</span>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">✓ Ritmo ideal para a APNA</p>
              </div>
            </div>

            {/* Cobertura do Banco APNA */}
            <div className="glass-panel border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-2 card-hover-effect">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Cobertura do Banco</span>
                <span className="material-symbols-outlined text-indigo-400">database</span>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-black text-white">{coberturaData?.percentualCobertura || 0}%</span>
                <p className="text-[11px] text-text-secondary mt-1">
                  <strong>{coberturaData?.totalRespondidasUnicas || 0}</strong> de {coberturaData?.totalBanco || 0} inéditas
                </p>
              </div>
            </div>

            {/* Meta Diária */}
            <div className="glass-panel border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-2 card-hover-effect">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Meta Diária</span>
                <span className="material-symbols-outlined text-amber-400 animate-bounce">local_fire_department</span>
              </div>
              <div>
                <span className="text-3xl md:text-4xl font-black text-white">{resumo.respostasHoje}</span>
                <span className="text-xs text-text-secondary font-semibold"> / {resumo.metaDiaria} q</span>
                <p className="text-[11px] text-amber-400 font-semibold mt-1">🔥 {resumo.sequenciaDias} dias seguidos</p>
              </div>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="flex space-x-2 border-b border-white/10 pb-0 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'pizzas', label: '🍕 Gráficos em Pizza' },
            { id: 'subareas', label: '🔥 Subáreas Críticas' },
            { id: 'dificuldade', label: '📊 Por Dificuldade' },
            { id: 'areas', label: 'Especialidades & Domínio' },
            { id: 'historico', label: 'Histórico' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white bg-white/5 rounded-t-xl'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: Visão Geral */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="glass-panel border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center space-x-2 text-sm md:text-base">
                  <span className="material-symbols-outlined text-indigo-400">calendar_month</span>
                  <span>Frequência de Treino — últimos 30 dias</span>
                </h3>
              </div>
              <Heatmap dias={atividade} />
            </div>

            <div className="glass-panel border border-white/5 rounded-3xl p-6 space-y-4">
              <h3 className="text-white font-bold flex items-center space-x-2 text-sm md:text-base">
                <span className="material-symbols-outlined text-amber-400">stars</span>
                <span>Evolução de XP — últimos 14 dias</span>
              </h3>
              {xpEvol.length > 0 ? (
                <XpChart dados={xpEvol} />
              ) : (
                <p className="text-text-secondary text-sm text-center py-4">Sem dados de XP registrados ainda.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel border border-emerald-500/20 rounded-3xl p-6 space-y-4">
                <h3 className="text-white font-bold flex items-center space-x-2 text-sm">
                  <span className="material-symbols-outlined text-emerald-400">trending_up</span>
                  <span>Maiores Pontos Fortes</span>
                </h3>
                {forcas.length === 0 ? (
                  <p className="text-text-secondary text-xs">Responda pelo menos 5 questões por especialidade para gerar a análise.</p>
                ) : (
                  <div className="space-y-3">
                    {forcas.map((a) => (
                      <div key={a.areaId} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white font-semibold truncate pr-2">{a.areaNome}</span>
                          <span className="text-emerald-400 font-black shrink-0">{a.taxaAcerto}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2">
                          <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${a.taxaAcerto}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-panel border border-rose-500/20 rounded-3xl p-6 space-y-4">
                <h3 className="text-white font-bold flex items-center space-x-2 text-sm">
                  <span className="material-symbols-outlined text-rose-400">trending_down</span>
                  <span>Especialidades que Exigem Atenção</span>
                </h3>
                {fraquezas.length === 0 ? (
                  <p className="text-text-secondary text-xs">Responda pelo menos 5 questões por especialidade para gerar a análise.</p>
                ) : (
                  <div className="space-y-3">
                    {fraquezas.map((a) => (
                      <div key={a.areaId} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-white font-semibold truncate pr-2">{a.areaNome}</span>
                          <span className="text-rose-400 font-black shrink-0">{a.taxaAcerto}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2">
                          <div className="h-2 bg-rose-500 rounded-full" style={{ width: `${a.taxaAcerto}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: GRÁFICOS EM PIZZA */}
        {activeTab === 'pizzas' && (
          <div className="space-y-8">
            <div className="glass-panel border border-indigo-500/30 rounded-3xl p-6 space-y-3 bg-gradient-to-r from-indigo-950/20 to-slate-900">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-indigo-400 text-2xl">pie_chart</span>
                <h3 className="text-lg font-black text-white">Análise Gráfica de Pizza por Áreas, Subáreas e Dificuldade</h3>
              </div>
              <p className="text-text-secondary text-xs md:text-sm leading-relaxed">
                Visualize a proporção exata do seu volume de treino distribuído entre as grandes Áreas Médicas, Níveis de Dificuldade e Subáreas específicas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-panel border border-white/10 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-white font-bold text-sm md:text-base flex items-center space-x-2">
                    <span className="material-symbols-outlined text-indigo-400">donut_large</span>
                    <span>Distribuição por Área Médica</span>
                  </h4>
                  <span className="text-xs text-text-secondary font-semibold">Volume total</span>
                </div>
                <PieChartSVG itens={pizzaAreaItems} tituloCentral="Questões" />
              </div>

              <div className="glass-panel border border-white/10 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h4 className="text-white font-bold text-sm md:text-base flex items-center space-x-2">
                    <span className="material-symbols-outlined text-amber-400">equalizer</span>
                    <span>Distribuição por Dificuldade</span>
                  </h4>
                  <span className="text-xs text-text-secondary font-semibold">Complexidade</span>
                </div>
                <PieChartSVG itens={pizzaDificuldadeItems} tituloCentral="Respostas" />
              </div>
            </div>

            <div className="glass-panel border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
                <div>
                  <h4 className="text-white font-bold text-sm md:text-base flex items-center space-x-2">
                    <span className="material-symbols-outlined text-emerald-400">category</span>
                    <span>Distribuição de Subáreas por Especialidade</span>
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">Selecione uma área para inspecionar o peso de cada subárea</p>
                </div>

                {Object.keys(subareasData?.agrupadoPorArea || {}).length > 0 && (
                  <select
                    value={areaPizzaSelecionada}
                    onChange={(e) => setAreaPizzaSelecionada(e.target.value)}
                    className="bg-surface-primary border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  >
                    {Object.keys(subareasData?.agrupadoPorArea || {}).map((nomeArea) => (
                      <option key={nomeArea} value={nomeArea}>
                        {nomeArea}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {pizzaSubareaItems.length > 0 ? (
                <PieChartSVG itens={pizzaSubareaItems} tituloCentral={areaPizzaSelecionada} />
              ) : (
                <div className="text-center py-8 space-y-2 text-text-secondary">
                  <span className="material-symbols-outlined text-3xl opacity-40">warning</span>
                  <p className="text-xs font-semibold">Nenhuma subárea respondida ainda para esta especialidade.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SUBÁREAS CRÍTICAS */}
        {activeTab === 'subareas' && (
          <div className="space-y-6">
            <div className="glass-panel border border-rose-500/30 rounded-3xl p-6 space-y-3 bg-gradient-to-r from-rose-950/20 to-slate-900">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-rose-400 text-2xl">warning</span>
                <h3 className="text-lg font-black text-white">Mapa de Diagnóstico por Subárea</h3>
              </div>
              <p className="text-text-secondary text-xs md:text-sm leading-relaxed">
                Identifique exatamente os tópicos específicos onde você comete o maior volume de erros para focar suas revisões.
              </p>
            </div>

            <div className="glass-panel border border-white/10 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-bold text-sm md:text-base flex items-center space-x-2">
                  <span className="material-symbols-outlined text-rose-400">bar_chart</span>
                  <span>Top Subáreas com Mais Erros Acumulados</span>
                </h4>
                <span className="text-xs text-text-secondary">Ordenado por volume de erros</span>
              </div>

              {!subareasData || subareasData.rankingGeralCritico.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <span className="material-symbols-outlined text-text-secondary text-4xl">check_circle</span>
                  <p className="text-text-secondary text-sm font-semibold">Nenhum erro recorrente detectado nas subáreas!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {subareasData.rankingGeralCritico.map((sub, idx) => (
                    <div key={sub.subareaId} className="space-y-2 glass-panel p-4 rounded-2xl border border-white/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-[10px]">
                            #{idx + 1}
                          </span>
                          <span className="text-white font-bold">{sub.subareaNome}</span>
                          <span className="text-text-secondary opacity-60">({sub.areaNome})</span>
                        </div>
                        <div className="flex items-center space-x-3 font-semibold text-xs">
                          <span className="text-rose-400">✗ {sub.totalErros} erros</span>
                          <span className="text-emerald-400">✓ {sub.totalAcertos} acertos</span>
                          <span className="text-white font-black bg-white/10 px-2 py-0.5 rounded-md">{sub.taxaAcerto}% acerto</span>
                        </div>
                      </div>

                      <div className="w-full bg-white/5 rounded-full h-3 flex overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-l-full transition-all"
                          style={{ width: `${sub.taxaAcerto}%` }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-rose-700 rounded-r-full transition-all"
                          style={{ width: `${sub.taxaErro}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: POR DIFICULDADE */}
        {activeTab === 'dificuldade' && (
          <div className="space-y-6">
            <div className="glass-panel border border-indigo-500/30 rounded-3xl p-6 space-y-3 bg-gradient-to-r from-indigo-950/20 to-slate-900">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-indigo-400 text-2xl">equalizer</span>
                <h3 className="text-lg font-black text-white">Desempenho por Nível de Dificuldade</h3>
              </div>
              <p className="text-text-secondary text-xs md:text-sm leading-relaxed">
                Acompanhe sua taxa de acertos dividida pela complexidade técnica das questões da Prova Nacional de Acesso.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {dificuldadeData.map((d) => {
                const nomes: Record<string, string> = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' };
                const cores: Record<string, string> = { facil: 'text-emerald-400 border-emerald-500/30', media: 'text-amber-400 border-amber-500/30', dificil: 'text-rose-400 border-rose-500/30' };
                const bgBars: Record<string, string> = { facil: 'bg-emerald-500', media: 'bg-amber-500', dificil: 'bg-rose-500' };

                return (
                  <div key={d.nivel} className={`glass-panel rounded-3xl p-6 border ${cores[d.nivel] || 'border-white/10'} space-y-4 card-hover-effect`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-white">Questões {nomes[d.nivel] || d.nivel}</span>
                      <span className={`text-2xl font-black ${taxaColor(d.taxaAcerto)}`}>{d.taxaAcerto}%</span>
                    </div>

                    <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
                      <div className={`h-full rounded-full transition-all ${bgBars[d.nivel] || 'bg-indigo-500'}`} style={{ width: `${d.taxaAcerto}%` }} />
                    </div>

                    <div className="space-y-1 text-xs text-text-secondary font-semibold pt-2 border-t border-white/5">
                      <div className="flex justify-between"><span>Respondidas:</span> <span className="text-white font-bold">{d.totalRespondidas}</span></div>
                      <div className="flex justify-between"><span>Acertos:</span> <span className="text-emerald-400 font-bold">{d.totalAcertos}</span></div>
                      <div className="flex justify-between"><span>Erros:</span> <span className="text-rose-400 font-bold">{d.totalErros}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB: Especialidades & Domínio (REFORMULADO) */}
        {activeTab === 'areas' && (
          <div className="space-y-4">
            {areas.map((a) => {
              const dom = nivelDominio(a.taxaAcerto);
              return (
                <div key={a.areaId} className="glass-panel border border-white/10 rounded-3xl p-6 space-y-3 card-hover-effect">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-white font-bold text-base">{a.areaNome}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${dom.cor}`}>
                        {dom.rotulo}
                      </span>
                    </div>
                    <span className={`text-2xl font-black ${taxaColor(a.taxaAcerto)}`}>{a.taxaAcerto}% acerto</span>
                  </div>

                  <div className="w-full bg-white/5 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${barColor(a.taxaAcerto)}`} style={{ width: `${a.taxaAcerto}%` }} />
                  </div>

                  <div className="flex justify-between text-xs text-text-secondary font-semibold">
                    <span>✓ {a.totalAcertos} acertos de {a.totalRespondidas} respondidas</span>
                    <span>📍 {a.cobertura}% de cobertura do banco</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB: Histórico */}
        {activeTab === 'historico' && (
          <div className="space-y-3">
            {historico.map((t) => (
              <div key={t.id} className="glass-panel border border-white/5 rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className={tipoBadge(t.quizTipo)}>{tipoLabel(t.quizTipo)}</span>
                    <h4 className="text-white font-semibold text-sm">{t.quizTitulo}</h4>
                  </div>
                  <p className="text-text-secondary text-xs">
                    {formatDateTime(t.concluidoEm)} · {t.totalQuestoes} questões · {t.totalAcertos} acertos
                  </p>
                </div>
                <div className="flex items-center space-x-4 shrink-0">
                  <div className="text-center">
                    <p className={`text-2xl font-black ${taxaColor(t.taxaAcerto)}`}>{t.taxaAcerto}%</p>
                    <p className="text-xs text-text-secondary">acerto</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-400">+{t.xpGanho}</p>
                    <p className="text-xs text-text-secondary">XP</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
