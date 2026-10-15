'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';
import Link from 'next/link';

interface Alternativa {
  letra: string;
  texto: string;
}

interface Questao {
  id: string;
  numero: number;
  enunciado: string;
  respostaCorreta: string;
  explicacao: string;
  alternativas: Alternativa[];
}

interface Resposta {
  id: string;
  questaoId: string;
  respostaEscolhida: string;
  correta: boolean;
  tempoRespostaSeg: number;
  questao: Questao;
}

interface Tentativa {
  id: string;
  status: string;
  totalQuestoes: number;
  totalAcertos: number;
  totalErros: number;
  tempoTotalSeg: number;
  xpGanho: number;
  iniciadoEm: string;
  concluidoEm: string;
  respostas: Resposta[];
  quiz?: {
    titulo: string;
  };
}

export default function RevisarTentativa() {
  const { id: tentativaId } = useParams() as { id: string };
  const [tentativa, setTentativa] = useState<Tentativa | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    apiFetch<Tentativa>(`/api/tentativas/${tentativaId}`)
      .then((data) => {
        setTentativa(data);
        setCarregando(false);
      })
      .catch(() => {
        setCarregando(false);
      });
  }, [tentativaId]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-surface-primary flex flex-col justify-center items-center">
        <span className="material-symbols-outlined text-brand-indigo animate-spin text-5xl">
          sync
        </span>
        <p className="mt-4 text-text-secondary text-sm font-medium">Carregando resultado...</p>
      </div>
    );
  }

  if (!tentativa) {
    return (
      <div className="min-h-screen bg-surface-primary pb-24 md:pb-6">
        <Navigation />
        <main className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <span className="material-symbols-outlined text-feedback-danger text-5xl">
            error
          </span>
          <h2 className="text-xl font-bold text-white">Sessão não encontrada</h2>
          <p className="text-text-secondary text-sm">
            Não conseguimos localizar as informações desta tentativa de quiz.
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-brand-indigo rounded-lg text-white font-semibold text-xs">
            Voltar ao Dashboard
          </Link>
        </main>
      </div>
    );
  }

  // Formatar tempo
  const formatarTempo = (totalSegs: number) => {
    const mins = Math.floor(totalSegs / 60);
    const segs = totalSegs % 60;
    return `${mins}m ${segs}s`;
  };

  const taxaAcerto = Math.round((tentativa.totalAcertos / tentativa.totalQuestoes) * 100);

  return (
    <div className="min-h-screen bg-surface-primary pb-24 md:pb-6">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Banner de Resultados */}
        <section className="bg-surface-card p-6 md:p-8 rounded-2xl border border-surface-accent space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-white">Resumo do Desempenho</h2>
              <p className="text-text-secondary text-xs md:text-sm font-medium">
                {tentativa.quiz?.titulo || 'Quiz concluído'}
              </p>
            </div>
            <span className="material-symbols-outlined text-feedback-success text-4xl">
              check_circle
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metrica: Acertos */}
            <div className="bg-surface-primary p-4 rounded-xl border border-surface-accent/60 text-center">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Precisão</span>
              <span className="text-2xl font-black text-white">{taxaAcerto}%</span>
            </div>
            {/* Metrica: Acertos / Total */}
            <div className="bg-surface-primary p-4 rounded-xl border border-surface-accent/60 text-center">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Acertos</span>
              <span className="text-2xl font-black text-white">{tentativa.totalAcertos} / {tentativa.totalQuestoes}</span>
            </div>
            {/* Metrica: Tempo */}
            <div className="bg-surface-primary p-4 rounded-xl border border-surface-accent/60 text-center">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Tempo Total</span>
              <span className="text-2xl font-black text-white">{formatarTempo(tentativa.tempoTotalSeg)}</span>
            </div>
            {/* Metrica: XP */}
            <div className="bg-surface-primary p-4 rounded-xl border border-surface-accent/60 text-center">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">XP Concedido</span>
              <span className="text-2xl font-black text-feedback-success">+{tentativa.xpGanho} XP</span>
            </div>
          </div>

          <div className="flex justify-center">
            <Link
              href="/"
              className="px-6 py-2.5 bg-brand-indigo hover:bg-brand-indigo/90 text-white text-xs font-bold rounded-lg transition-all-custom"
            >
              Voltar ao Painel Geral
            </Link>
          </div>
        </section>

        {/* Revisão de Questão por Questão */}
        <section className="space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="material-symbols-outlined text-text-secondary text-xl">fact_check</span>
            <span>Revisão Detalhada de Questões</span>
          </h3>

          <div className="space-y-6">
            {tentativa.respostas.map((resp, index) => {
              const q = resp.questao;
              return (
                <div key={resp.id} className="bg-surface-card rounded-2xl border border-surface-accent p-6 space-y-4 shadow-sm">
                  {/* Cabeçalho da questão */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-secondary">
                      Questão {index + 1} de {tentativa.totalQuestoes}
                    </span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        resp.correta
                          ? 'bg-feedback-success/20 text-feedback-success'
                          : 'bg-feedback-danger/20 text-feedback-danger'
                      }`}
                    >
                      {resp.correta ? 'Acertou' : 'Errou'}
                    </span>
                  </div>

                  {/* Enunciado */}
                  <p className="text-white text-sm md:text-base leading-relaxed font-semibold">
                    {q.enunciado}
                  </p>

                  {/* Alternativas */}
                  <div className="space-y-2.5">
                    {q.alternativas.map((alt) => {
                      const isEscolhida = resp.respostaEscolhida === alt.letra;
                      const isCorreta = q.respostaCorreta === alt.letra;
                      
                      let style = 'bg-surface-primary/50 border-surface-accent/60 text-text-secondary';
                      if (isCorreta) {
                        style = 'bg-feedback-success/15 border-feedback-success text-feedback-success font-semibold';
                      } else if (isEscolhida) {
                        style = 'bg-feedback-danger/15 border-feedback-danger text-feedback-danger font-semibold';
                      }

                      return (
                        <div
                          key={alt.letra}
                          className={`flex items-start space-x-3 p-3 border rounded-xl text-xs md:text-sm ${style}`}
                        >
                          <span
                            className={`font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                              isCorreta
                                ? 'bg-feedback-success text-white'
                                : isEscolhida
                                ? 'bg-feedback-danger text-white'
                                : 'bg-surface-accent text-text-secondary'
                            }`}
                          >
                            {alt.letra}
                          </span>
                          <span className="leading-relaxed">{alt.texto}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explicação Clínica */}
                  {q.explicacao && (
                    <div className="mt-4 p-4 bg-surface-primary/80 border border-surface-accent/70 rounded-xl space-y-2.5">
                      <h4 className="text-xs font-bold text-brand-indigo uppercase tracking-wider flex items-center space-x-1">
                        <span className="material-symbols-outlined text-sm">clinical_notes</span>
                        <span>Raciocínio Clínico & Explicação</span>
                      </h4>
                      <p className="text-text-secondary text-xs md:text-sm leading-relaxed whitespace-pre-line font-medium">
                        {q.explicacao}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
