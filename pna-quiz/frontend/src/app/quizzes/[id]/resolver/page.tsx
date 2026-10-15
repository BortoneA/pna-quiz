'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiFetch } from '@/utils/api';

interface Questao {
  id: string;
  numero: number;
  enunciado: string;
  alternativas: Array<{ letra: string; texto: string }>;
}

interface Quiz {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  tempoLimiteMin: number;
  questoes: Questao[];
}

interface Tentativa {
  id: string;
  status: string;
}

export default function ResolverQuiz() {
  const router = useRouter();
  const { id: quizId } = useParams() as { id: string };

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [tentativa, setTentativa] = useState<Tentativa | null>(null);
  const [questaoIndex, setQuestaoIndex] = useState(0);
  const [respostasEscolhidas, setRespostasEscolhidas] = useState<{ [key: string]: string }>({});
  
  // Cronômetro
  const [segundos, setSegundos] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Buscar quiz e inicializar tentativa
    apiFetch<Quiz>(`/api/quizzes/${quizId}`).then(async (q) => {
      setQuiz(q);
      const tent = await apiFetch<Tentativa>(`/api/quizzes/${quizId}/tentativa`, {
        method: 'POST',
      });
      setTentativa(tent);

      // Iniciar timer
      timerRef.current = setInterval(() => {
        setSegundos((s) => s + 1);
      }, 1000);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId]);

  // Capturar atalhos de teclado (Teclas 1 a 5 ou A a E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!quiz) return;
      const key = e.key.toUpperCase();
      const currentQuestao = quiz.questoes[questaoIndex];

      const letrasMapeadas = ['A', 'B', 'C', 'D', 'E'];
      let indexEscolhida = -1;

      if (['1', '2', '3', '4', '5'].includes(key)) {
        indexEscolhida = Number(key) - 1;
      } else if (letrasMapeadas.includes(key)) {
        indexEscolhida = letrasMapeadas.indexOf(key);
      }

      if (indexEscolhida >= 0 && indexEscolhida < currentQuestao.alternativas.length) {
        const letra = letrasMapeadas[indexEscolhida];
        handleSelectAlternativa(currentQuestao.id, letra);
      }

      // Atalho para próximo/anterior
      if (e.key === 'ArrowRight') {
        handleProximaQuestao();
      }
      if (e.key === 'ArrowLeft') {
        handleQuestaoAnterior();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, questaoIndex]);

  const handleSelectAlternativa = async (questaoId: string, letra: string) => {
    if (!tentativa) return;
    
    // Atualizar estado visual local imediatamente
    setRespostasEscolhidas((prev) => ({ ...prev, [questaoId]: letra }));

    // Gravar no backend de forma assíncrona (salvamento automático)
    try {
      await apiFetch(`/api/tentativas/${tentativa.id}/respostas`, {
        method: 'POST',
        body: JSON.stringify({
          questaoId,
          respostaEscolhida: letra,
          tempoRespostaSeg: 1, // Simulação simples
        }),
      });
    } catch (err) {
      console.error('Falha ao salvar resposta automaticamente:', err);
    }
  };

  const handleProximaQuestao = () => {
    if (!quiz) return;
    if (questaoIndex < quiz.questoes.length - 1) {
      setQuestaoIndex((i) => i + 1);
    }
  };

  const handleQuestaoAnterior = () => {
    if (questaoIndex > 0) {
      setQuestaoIndex((i) => i - 1);
    }
  };

  const handleFinalizarSimulado = async () => {
    if (!tentativa) return;
    
    const confirmar = window.confirm('Deseja finalizar este quiz e computar o seu resultado?');
    if (!confirmar) return;

    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await apiFetch<any>(`/api/tentativas/${tentativa.id}/finalizar`, {
        method: 'POST',
      });
      router.push(`/quizzes/tentativas/${tentativa.id}`);
    } catch (err: any) {
      alert(err.message || 'Erro ao finalizar.');
    }
  };

  if (!quiz) {
    return (
      <div className="min-h-screen bg-surface-primary flex flex-col justify-center items-center">
        <span className="material-symbols-outlined text-brand-indigo animate-spin text-5xl">
          sync
        </span>
        <p className="mt-4 text-text-secondary text-sm font-medium">Iniciando sessão...</p>
      </div>
    );
  }

  const currentQuestao = quiz.questoes[questaoIndex];
  const totalQuestoes = quiz.questoes.length;
  const progressoPorcentagem = Math.round(((questaoIndex + 1) / totalQuestoes) * 100);

  // Formatar tempo
  const formatarTempo = (totalSegs: number) => {
    const mins = Math.floor(totalSegs / 60);
    const segs = totalSegs % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col justify-between">
      {/* Barra de Topo do Simulado */}
      <header className="px-4 sm:px-6 py-3 sm:py-4 bg-surface-card border-b border-surface-accent flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="space-y-0.5 max-w-[65%] sm:max-w-[75%] min-w-0">
          <h1 className="text-white font-bold text-xs sm:text-base truncate">{quiz.titulo}</h1>
          <p className="text-[11px] sm:text-xs text-text-secondary">
            Questão {questaoIndex + 1} de {totalQuestoes}
          </p>
        </div>

        {/* Cronômetro */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm font-bold text-white bg-surface-accent px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shrink-0">
          <span className="material-symbols-outlined text-sm sm:text-base text-text-secondary">timer</span>
          <span>{formatarTempo(segundos)}</span>
        </div>
      </header>

      {/* Área da Questão */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 sm:py-8 space-y-5 pb-28">
        {/* Barra de Progresso do Quiz */}
        <div className="w-full bg-surface-accent h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-brand-indigo h-full transition-all duration-300"
            style={{ width: `${progressoPorcentagem}%` }}
          ></div>
        </div>

        {/* Enunciado */}
        <div className="bg-surface-card p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-surface-accent space-y-3.5 shadow-md">
          <span className="inline-block bg-brand-indigo/15 text-brand-indigo text-xs font-bold px-3 py-1 rounded-full">
            Questão {questaoIndex + 1}
          </span>
          <p className="text-white text-xs sm:text-sm md:text-base leading-relaxed font-semibold">
            {currentQuestao.enunciado}
          </p>
        </div>

        {/* Alternativas */}
        <div className="space-y-2.5">
          {currentQuestao.alternativas.map((alt) => {
            const isSelecionada = respostasEscolhidas[currentQuestao.id] === alt.letra;
            return (
              <button
                key={alt.letra}
                onClick={() => handleSelectAlternativa(currentQuestao.id, alt.letra)}
                className={`w-full flex items-start space-x-3 p-3.5 sm:p-4 border rounded-2xl transition-all text-left text-xs sm:text-sm min-h-[48px] active:scale-[0.99] ${
                  isSelecionada
                    ? 'bg-brand-indigo/15 border-brand-indigo text-white font-semibold shadow-md shadow-indigo-500/10'
                    : 'bg-surface-card border-surface-accent/70 text-text-secondary hover:border-surface-accent hover:text-white'
                }`}
              >
                <span
                  className={`font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    isSelecionada
                      ? 'bg-brand-indigo text-white shadow-md'
                      : 'bg-surface-accent text-text-secondary'
                  }`}
                >
                  {alt.letra}
                </span>
                <span className="leading-relaxed min-w-0 flex-1">{alt.texto}</span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Barra de Ações Inferior Fixa */}
      <footer className="sticky bottom-0 left-0 right-0 px-4 sm:px-6 py-3 bg-slate-900/95 border-t border-surface-accent flex items-center justify-between backdrop-blur-xl safe-bottom z-30 shadow-2xl">
        <button
          disabled={questaoIndex === 0}
          onClick={handleQuestaoAnterior}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-surface-accent hover:bg-surface-accent/80 active:scale-95 disabled:opacity-30 rounded-xl text-xs sm:text-sm font-bold text-white transition-all min-h-[44px]"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Anterior</span>
        </button>

        {questaoIndex === totalQuestoes - 1 ? (
          <button
            onClick={handleFinalizarSimulado}
            className="flex items-center space-x-1.5 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 rounded-xl text-xs sm:text-sm font-black text-black transition-all shadow-md shadow-emerald-500/20 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>Finalizar Quiz</span>
          </button>
        ) : (
          <button
            onClick={handleProximaQuestao}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-brand-indigo hover:bg-brand-indigo/90 active:scale-95 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md shadow-indigo-500/20 min-h-[44px]"
          >
            <span>Próxima</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        )}
      </footer>
    </div>
  );
}
