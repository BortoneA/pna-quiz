'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { apiFetch } from '@/utils/api';

interface Alternativa { letra: string; texto: string; }
interface Subarea { id: number; nome: string; codigo?: string; }
interface Area { id: number; nome: string; }
interface Capitulo { id: number; nome: string; subareas?: Subarea[]; }

interface Questao {
  id: string;
  numero: number;
  enunciado: string;
  respostaCorreta: string;
  explicacao: string;
  nivelDeDificuldade?: string;
  subarea?: {
    id: number;
    nome: string;
    capitulo?: {
      id: number;
      nome: string;
      area?: {
        id: number;
        nome: string;
      };
    };
  };
  alternativas: Alternativa[];
}
interface Quiz { id: string; titulo: string; filtroConfig?: any; }
interface Tentativa { id: string; status: string; }
type Fase = 'selecionando' | 'confirmando' | 'revelado';
interface Stats { respondidas: number; acertos: number; erros: number; }

export default function SuperRapido() {
  const router = useRouter();
  const { id: quizId } = useParams() as { id: string };
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [tentativa, setTentativa] = useState<Tentativa | null>(null);

  // Fluxo 1 a 1 Infinito
  const [questaoAtual, setQuestaoAtual] = useState<Questao | null>(null);
  const [vistasIds, setVistasIds] = useState<string[]>([]);
  const [carregandoQuestao, setCarregandoQuestao] = useState(true);

  const [fase, setFase] = useState<Fase>('selecionando');
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ respondidas: 0, acertos: 0, erros: 0 });
  const [salvando, setSalvando] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
  const [shakeErro, setShakeErro] = useState(false);

  // Modal de Edição
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editEnunciado, setEditEnunciado] = useState('');
  const [editExplicacao, setEditExplicacao] = useState('');
  const [editRespostaCorreta, setEditRespostaCorreta] = useState('A');
  const [editDificuldade, setEditDificuldade] = useState('media');
  const [editAlternativas, setEditAlternativas] = useState<Alternativa[]>([]);

  const [areasList, setAreasList] = useState<Area[]>([]);
  const [subareasList, setSubareasList] = useState<Subarea[]>([]);
  const [editAreaId, setEditAreaId] = useState<number | ''>('');
  const [editSubareaId, setEditSubareaId] = useState<number | ''>('');
  const [carregandoSubareas, setCarregandoSubareas] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [mostrarCriarSubarea, setMostrarCriarSubarea] = useState(false);
  const [novaSubareaNome, setNovaSubareaNome] = useState('');
  const [novaSubareaCodigo, setNovaSubareaCodigo] = useState('');
  const [criandoSubarea, setCriandoSubarea] = useState(false);

  const carregarProximaQuestao = useCallback(async (quizInfo: Quiz, idsExcluir: string[]) => {
    setCarregandoQuestao(true);
    try {
      const filtro = quizInfo.filtroConfig || {};
      const payload: any = { excluirIds: idsExcluir };
      if (filtro.areaId) payload.areaId = Number(filtro.areaId);
      if (filtro.capituloId) payload.capituloId = Number(filtro.capituloId);
      if (filtro.subareaId) payload.subareaId = Number(filtro.subareaId);
      if (filtro.dificuldade) payload.dificuldade = filtro.dificuldade;

      const proximaQ = await apiFetch<Questao>('/api/quizzes/super-rapido/proxima-questao', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setQuestaoAtual(proximaQ);
      setVistasIds((prev) => [...prev, proximaQ.id]);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar questão.');
    } finally {
      setCarregandoQuestao(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const q = await apiFetch<Quiz>(`/api/quizzes/${quizId}`);
      setQuiz(q);
      const tent = await apiFetch<Tentativa>(`/api/quizzes/${quizId}/tentativa`, { method: 'POST' });
      setTentativa(tent);

      await carregarProximaQuestao(q, []);
    };
    init().catch(console.error);
    apiFetch<Area[]>('/api/areas').then(setAreasList).catch(console.error);
  }, [quizId, carregarProximaQuestao]);

  const carregarSubareasPorArea = useCallback(async (areaId: number) => {
    setCarregandoSubareas(true);
    try {
      const caps = await apiFetch<Capitulo[]>(`/api/areas/${areaId}/capitulos`);
      const subProms = caps.map((c) => apiFetch<Subarea[]>(`/api/capitulos/${c.id}/subareas`).catch(() => []));
      const subRes = await Promise.all(subProms);
      setSubareasList(subRes.flat());
    } catch {
      setSubareasList([]);
    } finally {
      setCarregandoSubareas(false);
    }
  }, []);

  const abrirModalEdicao = async () => {
    if (!questaoAtual) return;
    setEditEnunciado(questaoAtual.enunciado || '');
    setEditExplicacao(questaoAtual.explicacao || '');
    setEditRespostaCorreta(questaoAtual.respostaCorreta || 'A');
    setEditDificuldade(questaoAtual.nivelDeDificuldade || 'media');
    setEditAlternativas(questaoAtual.alternativas ? [...questaoAtual.alternativas] : []);

    const currentAreaId = questaoAtual.subarea?.capitulo?.area?.id || '';
    const currentSubareaId = questaoAtual.subarea?.id || '';

    setEditAreaId(currentAreaId);
    setEditSubareaId(currentSubareaId);
    setMostrarCriarSubarea(false);

    if (currentAreaId) {
      await carregarSubareasPorArea(Number(currentAreaId));
    } else {
      setSubareasList([]);
    }

    setModalEditOpen(true);
  };

  const handleAreaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : '';
    setEditAreaId(val);
    setEditSubareaId('');
    setMostrarCriarSubarea(false);
    if (val) {
      await carregarSubareasPorArea(val);
    } else {
      setSubareasList([]);
    }
  };

  const handleCriarNovaSubarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAreaId || !novaSubareaNome || criandoSubarea) return;
    setCriandoSubarea(true);

    try {
      const novaSub = await apiFetch<Subarea>('/api/subareas', {
        method: 'POST',
        body: JSON.stringify({
          areaId: Number(editAreaId),
          nome: novaSubareaNome,
          codigo: novaSubareaCodigo || undefined,
        }),
      });

      await carregarSubareasPorArea(Number(editAreaId));
      setEditSubareaId(novaSub.id);
      setNovaSubareaNome('');
      setNovaSubareaCodigo('');
      setMostrarCriarSubarea(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar nova subárea.');
    } finally {
      setCriandoSubarea(false);
    }
  };

  const salvarEdicaoQuestao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questaoAtual || salvandoEdicao) return;
    setSalvandoEdicao(true);

    try {
      const bodyPayload: any = {
        enunciado: editEnunciado,
        explicacao: editExplicacao,
        respostaCorreta: editRespostaCorreta,
        nivelDeDificuldade: editDificuldade,
        alternativas: editAlternativas,
      };

      if (editSubareaId) {
        bodyPayload.subareaId = Number(editSubareaId);
      }

      const qAtualizada = await apiFetch<any>(`/api/questoes/${questaoAtual.id}`, {
        method: 'PATCH',
        body: JSON.stringify(bodyPayload),
      });

      setQuestaoAtual({
        ...questaoAtual,
        enunciado: qAtualizada.enunciado,
        explicacao: qAtualizada.explicacao,
        respostaCorreta: qAtualizada.respostaCorreta,
        nivelDeDificuldade: qAtualizada.nivelDeDificuldade,
        subarea: qAtualizada.subarea,
        alternativas: qAtualizada.alternativas,
      });

      setModalEditOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar edições da questão.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const dispararConfeti = () => {
    try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch (_) {}
  };

  const confirmarResposta = useCallback(async () => {
    if (!tentativa || !selecionada || salvando || fase !== 'confirmando' || !questaoAtual) return;
    setSalvando(true);
    try {
      await apiFetch(`/api/tentativas/${tentativa.id}/respostas`, {
        method: 'POST',
        body: JSON.stringify({ questaoId: questaoAtual.id, respostaEscolhida: selecionada, tempoRespostaSeg: 0 }),
      });
    } catch (_) {}

    const acertou = selecionada === questaoAtual.respostaCorreta;
    if (acertou) {
      dispararConfeti();
    } else {
      setShakeErro(true);
      setTimeout(() => setShakeErro(false), 500);
    }

    setStats((prev) => ({
      respondidas: prev.respondidas + 1,
      acertos: acertou ? prev.acertos + 1 : prev.acertos,
      erros: !acertou ? prev.erros + 1 : prev.erros,
    }));
    setFase('revelado');
    setSalvando(false);
  }, [tentativa, selecionada, salvando, fase, questaoAtual]);

  const proximaQuestao = useCallback(async () => {
    if (!quiz) return;
    setSelecionada(null);
    setFase('selecionando');
    await carregarProximaQuestao(quiz, vistasIds);
  }, [quiz, vistasIds, carregarProximaQuestao]);

  useEffect(() => {
    const letras = ['A', 'B', 'C', 'D', 'E'];
    const onKey = (e: KeyboardEvent) => {
      if (!questaoAtual || modalEditOpen || carregandoQuestao) return;
      if (fase === 'selecionando') {
        let idx = -1;
        if (['1', '2', '3', '4', '5'].includes(e.key)) idx = Number(e.key) - 1;
        else if (letras.includes(e.key.toUpperCase())) idx = letras.indexOf(e.key.toUpperCase());
        if (idx >= 0 && idx < questaoAtual.alternativas.length) { setSelecionada(letras[idx]); setFase('confirmando'); }
      } else if (fase === 'confirmando' && e.key === 'Enter') {
        confirmarResposta();
      } else if (fase === 'revelado' && (e.key === 'Enter' || e.key === 'ArrowRight')) {
        proximaQuestao();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fase, questaoAtual, modalEditOpen, carregandoQuestao, confirmarResposta, proximaQuestao]);

  const selecionarAlternativa = (letra: string) => {
    if (fase === 'revelado' || carregandoQuestao) return;
    setSelecionada(letra);
    setFase('confirmando');
  };

  const encerrarSessao = async () => {
    if (!tentativa) return;
    try { await apiFetch(`/api/tentativas/${tentativa.id}/finalizar`, { method: 'POST' }); } catch (_) {}
    dispararConfeti();
    setEncerrado(true);
  };

  if (encerrado) {
    const pct = stats.respondidas > 0 ? Math.round((stats.acertos / stats.respondidas) * 100) : 0;
    return (
      <div className="min-h-screen bg-surface-primary flex flex-col items-center justify-center px-4 space-y-8 animate-pop-in">
        <span className="material-symbols-outlined text-amber-400 text-7xl animate-bounce">emoji_events</span>
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-black text-white">Sessão encerrada!</h1>
          <p className="text-text-secondary text-sm">{stats.respondidas} questões respondidas nesta sessão contínua.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          {([['Respondidas', stats.respondidas, 'text-white'], ['Acertos', stats.acertos, 'text-emerald-400'], ['Erros', stats.erros, 'text-rose-400']] as [string, number, string][]).map(([l, v, c]) => (
            <div key={l} className="glass-panel rounded-2xl p-4 text-center">
              <p className={`text-3xl font-black ${c}`}>{v}</p>
              <p className="text-xs text-text-secondary mt-1">{l}</p>
            </div>
          ))}
        </div>
        <p className="text-5xl font-black text-amber-400">{pct}% acerto</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => router.push('/quizzes')} className="px-6 py-3 glass-panel text-white font-semibold rounded-xl text-sm hover:bg-white/10 transition-all">Voltar</button>
          {tentativa && <button onClick={() => router.push(`/quizzes/tentativas/${tentativa.id}`)} className="px-6 py-3 bg-brand-indigo text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all">Ver revisão detalhada</button>}
        </div>
      </div>
    );
  }

  const pct = stats.respondidas > 0 ? Math.round((stats.acertos / stats.respondidas) * 100) : 0;

  const corAlt = (letra: string) => {
    if (!questaoAtual) return '';
    if (fase === 'revelado') {
      if (letra === questaoAtual.respostaCorreta) return 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/10';
      if (letra === selecionada) return 'bg-rose-500/20 border-rose-500 text-white opacity-80';
      return 'glass-panel text-text-secondary opacity-40';
    }
    if (letra === selecionada) return 'bg-amber-500/20 border-amber-400 text-white font-bold shadow-lg shadow-amber-500/10';
    return 'glass-panel text-text-secondary hover:border-amber-400/50 hover:text-white';
  };

  const corIcone = (letra: string) => {
    if (!questaoAtual) return '';
    if (letra === selecionada) return 'border-amber-400 bg-amber-400 text-black';
    if (fase === 'revelado' && letra === questaoAtual.respostaCorreta) return 'border-emerald-500 bg-emerald-500 text-white';
    return 'border-white/10 bg-surface-primary text-text-secondary';
  };

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col pb-20">
      <header className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 glass-nav flex items-center justify-between sticky top-0 z-20 gap-2">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="material-symbols-outlined text-amber-400 animate-pulse text-lg sm:text-xl shrink-0">bolt</span>
          <span className="text-white font-black text-xs sm:text-sm truncate">Super Rápido</span>
        </div>
        <div className="flex items-center space-x-1.5 sm:space-x-3 text-xs font-semibold shrink-0">
          <span className="text-text-secondary hidden md:inline">{stats.respondidas} respondidas</span>
          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold text-[11px] sm:text-xs">+{stats.acertos}</span>
          <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md font-bold text-[11px] sm:text-xs">-{stats.erros}</span>
          {stats.respondidas > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[11px] sm:text-xs">{pct}%</span>}
          <button onClick={encerrarSessao} className="px-2.5 sm:px-3 py-1.5 glass-panel hover:bg-white/10 active:scale-95 text-text-secondary hover:text-white rounded-xl transition-all text-xs font-bold min-h-[36px]">
            Sair
          </button>
        </div>
      </header>

      {carregandoQuestao || !questaoAtual ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <span className="material-symbols-outlined text-amber-400 text-5xl animate-spin">bolt</span>
            <p className="text-text-secondary text-sm font-semibold">Sorteando questão inédita em tempo real...</p>
          </div>
        </div>
      ) : (
        <main className={`flex-1 max-w-2xl w-full mx-auto px-4 py-5 sm:py-8 flex flex-col space-y-4 sm:space-y-5 animate-slide-up ${shakeErro ? 'animate-shake' : ''}`}>
          <div className="flex justify-between items-center text-xs text-text-secondary gap-2">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <span className="font-bold text-amber-400 shrink-0">Questão #{questaoAtual.numero || 'Inédita'}</span>
              {questaoAtual.subarea?.capitulo?.area?.nome && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold truncate">
                  {questaoAtual.subarea.capitulo.area.nome}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={abrirModalEdicao}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-95 text-indigo-300 font-bold border border-indigo-500/30 transition-all text-[11px] min-h-[34px]"
                title="Editar questão"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span className="hidden sm:inline">Editar Questão</span>
                <span className="sm:hidden">Editar</span>
              </button>
              <span className="opacity-60 font-semibold text-[11px]">{vistasIds.length} sessão</span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 md:p-7 border border-white/10 shadow-xl space-y-2">
            <p className="text-white text-sm md:text-base leading-relaxed font-semibold">{questaoAtual.enunciado}</p>
            {questaoAtual.subarea?.nome && (
              <p className="text-[11px] text-text-secondary opacity-70 font-semibold">
                📍 Subárea: {questaoAtual.subarea.nome}
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            {questaoAtual.alternativas.map((alt) => (
              <button
                key={alt.letra}
                onClick={() => selecionarAlternativa(alt.letra)}
                disabled={fase === 'revelado'}
                className={`w-full flex items-start space-x-3 p-4 border rounded-2xl transition-all text-left text-xs md:text-sm ${corAlt(alt.letra)}`}
              >
                <span className={`font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs border ${corIcone(alt.letra)}`}>
                  {alt.letra}
                </span>
                <span className="leading-relaxed flex-1">{alt.texto}</span>
                {fase === 'revelado' && alt.letra === questaoAtual.respostaCorreta && (
                  <span className="material-symbols-outlined text-emerald-400 text-lg ml-auto shrink-0 animate-pop-in">check_circle</span>
                )}
                {fase === 'revelado' && alt.letra === selecionada && alt.letra !== questaoAtual.respostaCorreta && (
                  <span className="material-symbols-outlined text-rose-400 text-lg ml-auto shrink-0 animate-pop-in">cancel</span>
                )}
              </button>
            ))}
          </div>

          {fase === 'confirmando' && (
            <button
              onClick={confirmarResposta}
              disabled={salvando}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-black font-black rounded-2xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/25 animate-pop-in"
            >
              <span className="material-symbols-outlined">check</span>
              <span>{salvando ? 'Salvando...' : 'Confirmar Resposta'}</span>
              <span className="text-xs opacity-60 hidden sm:inline">[Enter]</span>
            </button>
          )}

          {fase === 'revelado' && (
            <div className="space-y-4 animate-pop-in">
              <div className={`flex items-center space-x-3 p-4 rounded-2xl border ${selecionada === questaoAtual.respostaCorreta ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/10 border-rose-500/40 text-rose-400'}`}>
                <span className="material-symbols-outlined text-3xl">
                  {selecionada === questaoAtual.respostaCorreta ? 'check_circle' : 'cancel'}
                </span>
                <div>
                  <p className="font-black text-sm">{selecionada === questaoAtual.respostaCorreta ? 'Correto! 🎉' : 'Incorreto!'}</p>
                  {selecionada !== questaoAtual.respostaCorreta && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      Gabarito: <span className="text-emerald-400 font-bold">{questaoAtual.respostaCorreta}</span>
                    </p>
                  )}
                </div>
              </div>

              {questaoAtual.explicacao && (
                <div className="glass-panel rounded-2xl p-5 max-h-52 overflow-y-auto space-y-2 border border-white/10">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Explicação Clínica</p>
                  <p className="text-text-secondary text-xs leading-relaxed">{questaoAtual.explicacao}</p>
                </div>
              )}

              <button
                onClick={proximaQuestao}
                className="w-full py-4 bg-brand-indigo hover:bg-indigo-500 active:scale-95 text-white font-black rounded-2xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25"
              >
                <span>Próxima Questão</span>
                <span className="material-symbols-outlined">arrow_forward</span>
                <span className="text-xs opacity-50 hidden sm:inline">[Enter]</span>
              </button>
            </div>
          )}

          {fase === 'selecionando' && (
            <p className="text-center text-xs text-text-secondary opacity-40 select-none">
              Tecle A-E ou 1-5 para selecionar
            </p>
          )}
        </main>
      )}

      {/* MODAL DE EDIÇÃO COMPLETA DE QUESTÃO */}
      {modalEditOpen && questaoAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-pop-in">
          <div className="glass-panel border border-white/15 w-full max-w-2xl rounded-3xl p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-indigo-400">edit_note</span>
                <h3 className="text-lg font-black text-white">Editar Questão #{questaoAtual.numero}</h3>
              </div>
              <button
                onClick={() => setModalEditOpen(false)}
                className="p-1 rounded-xl hover:bg-white/10 text-text-secondary hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={salvarEdicaoQuestao} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-primary/60 p-4 rounded-2xl border border-white/5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-400 uppercase">Área Médica</label>
                  <select
                    value={editAreaId}
                    onChange={handleAreaChange}
                    className="w-full bg-surface-primary border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Selecione uma Área</option>
                    {areasList.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-amber-400 uppercase">Subárea Médica</label>
                    {editAreaId && !mostrarCriarSubarea && (
                      <button
                        type="button"
                        onClick={() => setMostrarCriarSubarea(true)}
                        className="text-[11px] text-indigo-300 hover:text-white font-bold flex items-center space-x-0.5"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                        <span>Nova Subárea</span>
                      </button>
                    )}
                  </div>

                  {!mostrarCriarSubarea ? (
                    <select
                      value={editSubareaId}
                      onChange={(e) => setEditSubareaId(e.target.value ? Number(e.target.value) : '')}
                      disabled={!editAreaId || carregandoSubareas}
                      className="w-full bg-surface-primary border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                    >
                      <option value="">{carregandoSubareas ? 'Carregando...' : 'Selecione uma Subárea'}</option>
                      {subareasList.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2 bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl animate-pop-in">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-indigo-300">Cadastrar Nova Subárea</span>
                        <button
                          type="button"
                          onClick={() => setMostrarCriarSubarea(false)}
                          className="text-text-secondary hover:text-white text-[10px]"
                        >
                          Cancelar
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Nome da Subárea"
                        value={novaSubareaNome}
                        onChange={(e) => setNovaSubareaNome(e.target.value)}
                        className="w-full bg-surface-primary border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                        required
                      />

                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Código opcional"
                          value={novaSubareaCodigo}
                          onChange={(e) => setNovaSubareaCodigo(e.target.value)}
                          className="flex-1 bg-surface-primary border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleCriarNovaSubarea}
                          disabled={!novaSubareaNome || criandoSubarea}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs"
                        >
                          {criandoSubarea ? '...' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Nível de Dificuldade</label>
                <select
                  value={editDificuldade}
                  onChange={(e) => setEditDificuldade(e.target.value)}
                  className="w-full bg-surface-primary/90 border border-white/10 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="facil">Fácil</option>
                  <option value="media">Média</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Enunciado da Questão</label>
                <textarea
                  rows={4}
                  value={editEnunciado}
                  onChange={(e) => setEditEnunciado(e.target.value)}
                  className="w-full bg-surface-primary/90 border border-white/10 rounded-xl p-3 text-white text-xs md:text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-text-secondary uppercase block">Alternativas</label>
                {editAlternativas.map((alt, idx) => (
                  <div key={alt.letra} className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-surface-primary border border-white/10 flex items-center justify-center text-xs font-black text-amber-400 shrink-0">
                      {alt.letra}
                    </span>
                    <input
                      type="text"
                      value={alt.texto}
                      onChange={(e) => {
                        const newAlts = [...editAlternativas];
                        newAlts[idx].texto = e.target.value;
                        setEditAlternativas(newAlts);
                      }}
                      className="flex-1 bg-surface-primary/90 border border-white/10 rounded-xl p-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Gabarito Correto</label>
                <select
                  value={editRespostaCorreta}
                  onChange={(e) => setEditRespostaCorreta(e.target.value)}
                  className="w-full bg-surface-primary/90 border border-white/10 rounded-xl p-2.5 text-white text-xs md:text-sm focus:outline-none focus:border-indigo-500"
                >
                  {editAlternativas.map((alt) => (
                    <option key={alt.letra} value={alt.letra}>
                      Alternativa {alt.letra}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase">Explicação Clínica</label>
                <textarea
                  rows={4}
                  value={editExplicacao}
                  onChange={(e) => setEditExplicacao(e.target.value)}
                  className="w-full bg-surface-primary/90 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalEditOpen(false)}
                  className="px-5 py-2.5 rounded-xl glass-panel text-xs font-bold text-text-secondary hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoEdicao}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>{salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
