'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { apiFetch } from '@/utils/api';

interface Area {
  id: number;
  nome: string;
  totalCapitulos?: number;
  totalQuestoes?: number;
}

interface Capitulo {
  id: number;
  numero: number;
  nome: string;
  totalSubareas?: number;
  totalQuestoes?: number;
}

interface Subarea {
  id: number;
  codigo: string;
  nome: string;
  totalQuestoes?: number;
}

interface Questao {
  id: string;
  numero: number;
  anoDaProva: number;
  nivelDeDificuldade: string;
  enunciado: string;
  respostaCorreta: string;
  alternativas: Array<{ letra: string; texto: string }>;
}

interface BuscaResponse {
  total: number;
  itens: Questao[];
}

export default function Explorar() {
  const router = useRouter();
  
  // Estados da árvore
  const [areas, setAreas] = useState<Area[]>([]);
  const [capitulos, setCapitulos] = useState<{ [key: number]: Capitulo[] }>({});
  const [subareas, setSubareas] = useState<{ [key: number]: Subarea[] }>({});
  
  // Nós expandidos
  const [expandedArea, setExpandedArea] = useState<number | null>(null);
  const [expandedCapitulo, setExpandedCapitulo] = useState<number | null>(null);

  // Aba no Mobile
  const [abaMobile, setAbaMobile] = useState<'questoes' | 'arvore'>('questoes');

  // Estados de busca/questões
  const [busca, setBusca] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  const [ano, setAno] = useState<number | ''>('');
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [totalQuestoes, setTotalQuestoes] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  
  // Filtros ativos de navegação
  const [filtroAtivo, setFiltroAtivo] = useState<{ tipo: 'area' | 'capitulo' | 'subarea'; id: number; nome: string } | null>(null);

  // Carregar áreas inicialmente
  useEffect(() => {
    apiFetch<Area[]>('/api/areas')
      .then(setAreas)
      .catch(() => {});
    executarBusca();
  }, []);

  // Executar busca sempre que filtros mudarem
  useEffect(() => {
    executarBusca();
  }, [pagina, dificuldade, ano, filtroAtivo]);

  const executarBusca = () => {
    setCarregandoBusca(true);
    let endpoint = `/api/questoes/busca?pagina=${pagina}&limite=10`;
    
    if (busca) endpoint += `&busca=${encodeURIComponent(busca)}`;
    if (dificuldade) endpoint += `&dificuldade=${dificuldade}`;
    if (ano) endpoint += `&ano=${ano}`;
    
    if (filtroAtivo) {
      if (filtroAtivo.tipo === 'area') endpoint += `&areaId=${filtroAtivo.id}`;
      if (filtroAtivo.tipo === 'capitulo') endpoint += `&capituloId=${filtroAtivo.id}`;
      if (filtroAtivo.tipo === 'subarea') endpoint += `&subareaId=${filtroAtivo.id}`;
    }

    apiFetch<BuscaResponse>(endpoint)
      .then((res) => {
        setQuestoes(res.itens || []);
        setTotalQuestoes(res.total || 0);
      })
      .catch(() => {
        setQuestoes([]);
        setTotalQuestoes(0);
      })
      .finally(() => {
        setCarregandoBusca(false);
      });
  };

  const handleExpandArea = async (areaId: number) => {
    if (expandedArea === areaId) {
      setExpandedArea(null);
      return;
    }
    setExpandedArea(areaId);
    setFiltroAtivo({ tipo: 'area', id: areaId, nome: areas.find(a => a.id === areaId)?.nome || '' });
    setPagina(1);

    if (!capitulos[areaId]) {
      try {
        const caps = await apiFetch<Capitulo[]>(`/api/areas/${areaId}/capitulos`);
        setCapitulos(prev => ({ ...prev, [areaId]: caps }));
      } catch (_) {}
    }
  };

  const handleExpandCapitulo = async (capId: number, areaId: number) => {
    if (expandedCapitulo === capId) {
      setExpandedCapitulo(null);
      return;
    }
    setExpandedCapitulo(capId);
    
    const capNome = capitulos[areaId]?.find(c => c.id === capId)?.nome || '';
    setFiltroAtivo({ tipo: 'capitulo', id: capId, nome: capNome });
    setPagina(1);

    if (!subareas[capId]) {
      try {
        const subs = await apiFetch<Subarea[]>(`/api/capitulos/${capId}/subareas`);
        setSubareas(prev => ({ ...prev, [capId]: subs }));
      } catch (_) {}
    }
  };

  const handleSelectSubarea = (sub: Subarea) => {
    setFiltroAtivo({ tipo: 'subarea', id: sub.id, nome: sub.nome });
    setPagina(1);
    setAbaMobile('questoes'); // Ao escolher subárea no mobile, volta automaticamente para as questões
  };

  // Gerar quiz dinâmico do nó ativo
  const handleGerarQuiz = async (tipo: 'area' | 'capitulo' | 'subarea', id: number, nome: string) => {
    try {
      const config: any = {};
      if (tipo === 'area') config.areaId = id;
      if (tipo === 'capitulo') config.capituloId = id;
      if (tipo === 'subarea') config.subareaId = id;

      const quiz = await apiFetch<any>('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          titulo: `Quiz · ${nome}`,
          tipo: 'personalizado',
          filtroConfig: config,
        }),
      });

      router.push(`/quizzes/${quiz.id}/resolver`);
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar quiz.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary pb-32 md:pb-12">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8">
        
        {/* Seletor Mobile de Abas (Especialidades vs Questões) */}
        <div className="flex lg:hidden bg-surface-card p-1 rounded-2xl border border-white/10 mb-5 shadow-lg">
          <button
            onClick={() => setAbaMobile('questoes')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[44px] ${
              abaMobile === 'questoes'
                ? 'bg-brand-indigo text-white shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">search</span>
            <span>Questões ({totalQuestoes})</span>
          </button>
          <button
            onClick={() => setAbaMobile('arvore')}
            className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 min-h-[44px] ${
              abaMobile === 'arvore'
                ? 'bg-brand-indigo text-white shadow-md'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-base">account_tree</span>
            <span>Árvore {filtroAtivo ? '• (Ativo)' : ''}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Navegador Hierárquico (Árvore de Especialidades) */}
          <section className={`lg:col-span-4 bg-surface-card rounded-3xl border border-surface-accent p-5 sm:p-6 space-y-5 self-start ${abaMobile === 'arvore' ? 'block' : 'hidden lg:block'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center space-x-2">
                <span className="material-symbols-outlined text-brand-indigo">travel_explore</span>
                <span>Especialidades APNA</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">
                {areas.length} Áreas
              </span>
            </div>

            {filtroAtivo && (
              <div className="bg-brand-indigo/10 p-3 rounded-2xl border border-brand-indigo/30 flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <span className="text-[10px] text-brand-indigo block font-bold uppercase tracking-wider">Filtro Ativo:</span>
                  <span className="text-white font-bold text-xs truncate block">{filtroAtivo.nome}</span>
                </div>
                <button
                  onClick={() => setFiltroAtivo(null)}
                  className="text-rose-400 text-xs font-bold hover:underline shrink-0 p-1"
                >
                  Limpar
                </button>
              </div>
            )}

            <div className="space-y-2.5 overflow-y-auto max-h-[550px] pr-1 no-scrollbar">
              {areas.map((area) => (
                <div key={area.id} className="space-y-1.5">
                  <button
                    onClick={() => handleExpandArea(area.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left text-xs sm:text-sm min-h-[44px] active:scale-[0.99] ${
                      expandedArea === area.id
                        ? 'bg-surface-accent border-brand-indigo text-white font-bold'
                        : 'bg-surface-card border-surface-accent/70 text-text-secondary hover:border-surface-accent hover:text-white'
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate pr-2">{area.nome}</span>
                    <span className="material-symbols-outlined text-sm shrink-0">
                      {expandedArea === area.id ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {expandedArea === area.id && (
                    <div className="pl-3.5 space-y-2 border-l-2 border-brand-indigo/40 ml-2 mt-1.5">
                      {/* Botão de Quiz da Área */}
                      <button
                        onClick={() => {
                          handleGerarQuiz('area', area.id, area.nome);
                        }}
                        className="w-full text-left text-xs bg-brand-indigo/15 text-brand-indigo border border-brand-indigo/30 hover:bg-brand-indigo/25 active:scale-95 px-3 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 min-h-[40px]"
                      >
                        <span className="material-symbols-outlined text-base">play_arrow</span>
                        <span>Praticar Área Completa</span>
                      </button>

                      {capitulos[area.id]?.map((cap) => (
                        <div key={cap.id} className="space-y-1">
                          <button
                            onClick={() => handleExpandCapitulo(cap.id, area.id)}
                            className={`w-full text-left text-xs p-2.5 rounded-xl border transition-all flex items-center justify-between min-h-[40px] ${
                              expandedCapitulo === cap.id
                                ? 'bg-surface-accent border-brand-indigo text-white font-bold'
                                : 'bg-surface-accent/30 border-surface-accent/40 text-text-secondary hover:text-white'
                            }`}
                          >
                            <span className="min-w-0 flex-1 truncate pr-2">Cap. {cap.numero} · {cap.nome}</span>
                            <span className="material-symbols-outlined text-xs shrink-0">
                              {expandedCapitulo === cap.id ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>

                          {expandedCapitulo === cap.id && (
                            <div className="pl-3 space-y-1 border-l-2 border-amber-400/40 ml-1.5 mt-1">
                              {/* Botão de Quiz do Capítulo */}
                              <button
                                onClick={() => handleGerarQuiz('capitulo', cap.id, cap.nome)}
                                className="w-full text-left text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 active:scale-95 px-2.5 py-2 rounded-lg font-bold flex items-center space-x-1.5 min-h-[36px]"
                              >
                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                                <span>Praticar Capítulo</span>
                              </button>

                              {subareas[cap.id]?.map((sub) => (
                                <button
                                  key={sub.id}
                                  onClick={() => handleSelectSubarea(sub)}
                                  className={`w-full text-left text-[11px] p-2 rounded-lg transition-all min-w-0 flex-1 truncate block active:scale-95 ${
                                    filtroAtivo?.tipo === 'subarea' && filtroAtivo.id === sub.id
                                      ? 'bg-brand-indigo text-white font-bold shadow-sm'
                                      : 'text-text-secondary hover:text-white hover:bg-surface-accent/50'
                                  }`}
                                >
                                  {sub.codigo ? `${sub.codigo} · ` : ''}{sub.nome}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Central de Questões & Busca (Direita) */}
          <section className={`lg:col-span-8 space-y-6 ${abaMobile === 'questoes' ? 'block' : 'hidden lg:block'}`}>
            
            {/* Barra de Busca e Filtros */}
            <div className="bg-surface-card rounded-3xl border border-surface-accent p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                {/* Campo de Busca Textual */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Pesquisar nos enunciados ou explicações..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executarBusca()}
                    className="w-full bg-surface-primary border border-surface-accent rounded-2xl px-4 py-3 pl-10 text-white placeholder-text-secondary text-xs sm:text-sm focus:outline-none focus:border-brand-indigo min-h-[46px]"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-3 text-text-secondary text-lg">
                    search
                  </span>
                </div>
                <button
                  onClick={executarBusca}
                  className="bg-brand-indigo hover:bg-brand-indigo/90 active:scale-95 px-6 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm transition-all shrink-0 min-h-[46px]"
                >
                  Pesquisar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Filtro Dificuldade */}
                <select
                  value={dificuldade}
                  onChange={(e) => { setDificuldade(e.target.value); setPagina(1); }}
                  className="bg-surface-primary border border-surface-accent text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-indigo min-h-[42px]"
                >
                  <option value="">Dificuldade (Todas)</option>
                  <option value="fácil">Fácil</option>
                  <option value="média">Média</option>
                  <option value="difícil">Difícil</option>
                </select>

                {/* Filtro Ano */}
                <select
                  value={ano}
                  onChange={(e) => { setAno(e.target.value ? Number(e.target.value) : ''); setPagina(1); }}
                  className="bg-surface-primary border border-surface-accent text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-indigo min-h-[42px]"
                >
                  <option value="">Ano da Prova (Todos)</option>
                  <option value="2018">2018</option>
                  <option value="2019">2019</option>
                  <option value="2020">2020</option>
                  <option value="2021">2021</option>
                  <option value="2022">2022</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                </select>

                {/* Botão de Praticar com Filtros */}
                <button
                  onClick={() => {
                    if (filtroAtivo) {
                      handleGerarQuiz(filtroAtivo.tipo, filtroAtivo.id, filtroAtivo.nome);
                    } else {
                      handleGerarQuiz('area', 1, 'Simulado Geral');
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs rounded-xl px-4 py-2.5 flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-amber-500/15 min-h-[42px]"
                >
                  <span className="material-symbols-outlined text-base">play_circle</span>
                  <span>Praticar Seleção</span>
                </button>
              </div>
            </div>

            {/* Listagem de Resultados */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-text-secondary font-bold">
                  {carregandoBusca ? 'Carregando questões...' : `${totalQuestoes} questões encontradas`}
                </span>
                {filtroAtivo && (
                  <span className="text-[11px] text-brand-indigo font-bold truncate max-w-[200px]">
                    Filtro: {filtroAtivo.nome}
                  </span>
                )}
              </div>

              {questoes.length === 0 && !carregandoBusca ? (
                <div className="bg-surface-card rounded-3xl border border-surface-accent p-10 text-center space-y-3">
                  <span className="material-symbols-outlined text-text-secondary text-5xl">
                    search_off
                  </span>
                  <p className="text-text-secondary text-sm font-semibold">
                    Nenhuma questão corresponde aos filtros atuais.
                  </p>
                </div>
              ) : (
                questoes.map((q) => (
                  <div key={q.id} className="bg-surface-card rounded-3xl border border-surface-accent p-5 sm:p-6 space-y-3.5 shadow-md">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                      <span className="bg-surface-accent text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {q.id}
                      </span>
                      {q.anoDaProva && (
                        <span className="bg-brand-indigo/15 text-brand-indigo px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          Ano: {q.anoDaProva}
                        </span>
                      )}
                      {q.nivelDeDificuldade && (
                        <span className="bg-amber-500/15 text-amber-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          {q.nivelDeDificuldade}
                        </span>
                      )}
                    </div>

                    <p className="text-white text-xs sm:text-sm md:text-base leading-relaxed font-semibold">
                      {q.enunciado}
                    </p>

                    <div className="space-y-2 pt-1">
                      {q.alternativas.map((alt) => (
                        <div
                          key={alt.letra}
                          className="flex items-start space-x-2.5 p-3 bg-surface-primary/60 border border-surface-accent/60 rounded-xl text-xs sm:text-sm text-text-secondary"
                        >
                          <span className="font-bold text-white bg-surface-accent w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">
                            {alt.letra}
                          </span>
                          <span className="leading-relaxed min-w-0 flex-1">{alt.texto}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}

              {/* Paginação */}
              {totalQuestoes > 10 && (
                <div className="flex justify-center items-center space-x-4 pt-4">
                  <button
                    disabled={pagina === 1}
                    onClick={() => setPagina(p => Math.max(p - 1, 1))}
                    className="p-3 bg-surface-card border border-surface-accent text-text-secondary hover:text-white hover:bg-surface-accent disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-all flex items-center min-w-[44px] min-h-[44px] justify-center"
                    aria-label="Página anterior"
                  >
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                  </button>
                  <span className="text-xs text-text-secondary font-bold">
                    Página {pagina} de {Math.ceil(totalQuestoes / 10)}
                  </span>
                  <button
                    disabled={pagina >= Math.ceil(totalQuestoes / 10)}
                    onClick={() => setPagina(p => p + 1)}
                    className="p-3 bg-surface-card border border-surface-accent text-text-secondary hover:text-white hover:bg-surface-accent disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-all flex items-center min-w-[44px] min-h-[44px] justify-center"
                    aria-label="Próxima página"
                  >
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
