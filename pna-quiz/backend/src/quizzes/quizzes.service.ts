import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressoService } from '../progresso/progresso.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressoService: ProgressoService,
  ) {}

  // Cria um quiz/simulado dinâmico garantindo que questões respondidas vão para o final da fila
  async createQuiz(dto: CreateQuizDto) {
    let questoesCandidatas: any[] = [];
    const where: any = { ativa: true };
    const config = dto.filtroConfig || {};

    if (dto.tipo !== 'simulado') {
      if (config.areaId) {
        where.subarea = { capitulo: { areaId: Number(config.areaId) } };
      } else if (config.capituloId) {
        where.subarea = { capituloId: Number(config.capituloId) };
      } else if (config.subareaId) {
        where.subareaId = Number(config.subareaId);
      }

      if (config.ano) {
        where.anoDaProva = Number(config.ano);
      }
      if (config.dificuldade) {
        where.nivelDeDificuldade = config.dificuldade;
      }
    }

    const totalDesejado = dto.tipo === 'simulado' ? 100 : Number(config.totalQuestoes || 10);

    // 1. Buscar todas as questões candidatas que atendem ao filtro
    questoesCandidatas = await this.prisma.questao.findMany({
      where,
      select: { id: true, numero: true },
    });

    if (questoesCandidatas.length === 0) {
      throw new BadRequestException('Nenhuma questão encontrada com os filtros selecionados');
    }

    const idsCandidatos = questoesCandidatas.map((q) => q.id);

    // 2. Buscar o histórico de respostas para as questões candidatas
    const historicoRespostas = await this.prisma.tentativaResposta.groupBy({
      by: ['questaoId'],
      where: { questaoId: { in: idsCandidatos } },
      _count: { questaoId: true },
      _max: { respondidaEm: true },
    });

    const mapaHistorico = new Map<string, { count: number; ultimaData: Date | null }>();
    for (const h of historicoRespostas) {
      mapaHistorico.set(h.questaoId, {
        count: h._count.questaoId,
        ultimaData: h._max.respondidaEm,
      });
    }

    // 3. Separar as questões em blocos de prioridade (0 respostas, 1 resposta, 2+ respostas)
    // para garantir diversidade e aleatoriedade máxima de números/anos de questão dentro de cada nível
    const ineditas: typeof questoesCandidatas = [];
    const feitas: { questao: any; count: number; ultimaData: number }[] = [];

    for (const q of questoesCandidatas) {
      const hist = mapaHistorico.get(q.id);
      if (!hist || hist.count === 0) {
        ineditas.push(q);
      } else {
        feitas.push({
          questao: q,
          count: hist.count,
          ultimaData: hist.ultimaData ? new Date(hist.ultimaData).getTime() : 0,
        });
      }
    }

    // Algoritmo de embaralhamento robusto (Fisher-Yates Shuffle)
    const shuffleArray = <T>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Embaralha profundamente o bloco de questões inéditas para misturar números baixos, médios e altos de questões
    const ineditasEmbaralhadas = shuffleArray(ineditas);

    // Ordena o bloco de questões já feitas (as menos feitas e mais antigas na frente), mas com embaralhamento interno
    feitas.sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count;
      return a.ultimaData - b.ultimaData;
    });

    const feitasEmbaralhadas = shuffleArray(feitas.map((f) => f.questao));

    // Junta as inéditas embaralhadas com as já respondidas (empurradas para o final da fila)
    const filaPriorizada = [...ineditasEmbaralhadas, ...feitasEmbaralhadas];

    // Seleciona a quantidade desejada de questões respeitando a prioridade de fila
    let questoesSelecionadas = filaPriorizada.slice(0, totalDesejado);

    // Aplica um último embaralhamento total de apresentação
    questoesSelecionadas = shuffleArray(questoesSelecionadas);

    // Criar o Quiz
    const quiz = await this.prisma.quiz.create({
      data: {
        titulo: dto.titulo,
        descricao: dto.descricao,
        tipo: dto.tipo,
        filtroConfig: dto.filtroConfig || {},
        tempoLimiteMin: dto.tempoLimiteMin,
        ordemAleatoria: dto.ordemAleatoria ?? false,
        alternativasAleatorias: dto.alternativasAleatorias ?? false,
      },
    });

    // Associar as questões ao Quiz
    await Promise.all(
      questoesSelecionadas.map((q, index) =>
        this.prisma.quizQuestao.create({
          data: {
            quizId: quiz.id,
            questaoId: q.id,
            ordem: index + 1,
          },
        }),
      ),
    );

    return this.getQuizById(quiz.id);
  }

  async getQuizById(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        quizQuestoes: {
          include: {
            questao: {
              include: {
                alternativas: { orderBy: { letra: 'asc' } },
              },
            },
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz com ID ${id} não encontrado`);
    }

    return {
      id: quiz.id,
      titulo: quiz.titulo,
      descricao: quiz.descricao,
      tipo: quiz.tipo,
      tempoLimiteMin: quiz.tempoLimiteMin,
      questoes: quiz.quizQuestoes.map((qq) => ({
        id: qq.questao.id,
        numero: qq.questao.numero,
        enunciado: qq.questao.enunciado,
        respostaCorreta: qq.questao.respostaCorreta,
        explicacao: qq.questao.explicacao,
        alternativas: qq.questao.alternativas.map((alt) => ({
          letra: alt.letra,
          texto: alt.texto,
        })),
      })),
    };
  }

  // Criar ou retomar uma tentativa de responder um quiz
  async createTentativa(quizId: string) {
    const quiz = await this.getQuizById(quizId);

    // Verificar se já existe uma tentativa em andamento para este quiz
    const tentativaExistente = await this.prisma.tentativa.findFirst({
      where: {
        quizId,
        status: 'em_andamento',
      },
      include: {
        respostas: true,
      },
    });

    if (tentativaExistente) {
      return tentativaExistente;
    }

    // Criar nova tentativa
    return this.prisma.tentativa.create({
      data: {
        quizId,
        status: 'em_andamento',
        totalQuestoes: quiz.questoes.length,
      },
    });
  }

  // Salvar uma resposta de forma automática/incremental
  async saveAnswer(tentativaId: string, dto: SaveAnswerDto) {
    const tentativa = await this.prisma.tentativa.findUnique({
      where: { id: tentativaId },
    });

    if (!tentativa || tentativa.status !== 'em_andamento') {
      throw new BadRequestException('Tentativa inexistente ou já concluída');
    }

    const questao = await this.prisma.questao.findUnique({
      where: { id: dto.questaoId },
    });

    if (!questao) {
      throw new NotFoundException('Questão não encontrada');
    }

    const correta = questao.respostaCorreta === dto.respostaEscolhida;

    // Salvar ou atualizar a resposta dada na tentativa
    const resposta = await this.prisma.tentativaResposta.upsert({
      where: {
        tentativaId_questaoId: {
          tentativaId,
          questaoId: dto.questaoId,
        },
      },
      update: {
        respostaEscolhida: dto.respostaEscolhida,
        correta,
        tempoRespostaSeg: dto.tempoRespostaSeg || 0,
      },
      create: {
        tentativaId,
        questaoId: dto.questaoId,
        respostaEscolhida: dto.respostaEscolhida,
        correta,
        tempoRespostaSeg: dto.tempoRespostaSeg || 0,
      },
    });

    return {
      salvo: true,
      correta,
      gabarito: questao.respostaCorreta,
      explicacao: questao.explicacao,
    };
  }

  // Finalizar o quiz, compilar acertos e dar o XP correspondente
  async finishTentativa(tentativaId: string) {
    const tentativa = await this.prisma.tentativa.findUnique({
      where: { id: tentativaId },
      include: {
        respostas: true,
        quiz: true,
      },
    });

    if (!tentativa) {
      throw new NotFoundException('Tentativa não encontrada');
    }

    if (tentativa.status === 'concluido') {
      return tentativa;
    }

    // Calcular acertos e erros
    const totalAcertos = tentativa.respostas.filter((r) => r.correta).length;
    const totalErros = tentativa.totalQuestoes - totalAcertos;
    const tempoTotalSeg = tentativa.respostas.reduce((acc, r) => acc + (r.tempoRespostaSeg || 0), 0);

    // Calcular ganho de XP
    // Regra: +15 XP por questão correta, +25 XP por concluir o quiz. Se for simulado, +500 XP extra.
    let xpGanho = totalAcertos * 15 + 25;
    if (tentativa.quiz && tentativa.quiz.tipo === 'simulado') {
      xpGanho += 500;
    }

    // Conceder XP de forma idempotente
    const resultXp = await this.progressoService.concederXp(
      'CONCLUSAO_TENTATIVA',
      xpGanho,
      `tentativa_finish_${tentativa.id}`,
      { tentativaId: tentativa.id, totalAcertos },
    );

    // Atualizar status da tentativa
    const tentativaConcluida = await this.prisma.tentativa.update({
      where: { id: tentativaId },
      data: {
        status: 'concluido',
        totalAcertos,
        totalErros,
        tempoTotalSeg,
        xpGanho,
        concluidoEm: new Date(),
      },
      include: {
        respostas: true,
      },
    });

    return {
      ...tentativaConcluida,
      xpResultado: resultXp,
    };
  }

  /** Busca 1 ÚNICA questão totalmente aleatória e inédita para o modo Super Rápido Contínuo */
  async getProximaQuestaoSuperRapido(filtro: {
    areaId?: number;
    capituloId?: number;
    subareaId?: number;
    dificuldade?: string;
    excluirIds?: string[];
  }) {
    const where: any = { ativa: true };

    if (filtro.areaId) {
      where.subarea = { capitulo: { areaId: Number(filtro.areaId) } };
    } else if (filtro.capituloId) {
      where.subarea = { capituloId: Number(filtro.capituloId) };
    } else if (filtro.subareaId) {
      where.subareaId = Number(filtro.subareaId);
    }

    if (filtro.dificuldade) {
      where.nivelDeDificuldade = filtro.dificuldade;
    }

    // Exclui questões já vistas na sessão atual se fornecidas
    if (filtro.excluirIds && filtro.excluirIds.length > 0) {
      where.id = { notIn: filtro.excluirIds };
    }

    // 1. Busca todas as questões candidatas
    let candidatas = await this.prisma.questao.findMany({
      where,
      select: { id: true },
    });

    // Se esgotou com as exclusões da sessão atual, reseta o filtro de sessão mantendo o filtro principal
    if (candidatas.length === 0 && filtro.excluirIds && filtro.excluirIds.length > 0) {
      delete where.id;
      candidatas = await this.prisma.questao.findMany({
        where,
        select: { id: true },
      });
    }

    if (candidatas.length === 0) {
      throw new BadRequestException('Nenhuma questão encontrada com os filtros selecionados');
    }

    const idsCandidatos = candidatas.map((q) => q.id);

    // 2. Consulta histórico de respostas no banco para priorizar INÉDITAS no aplicativo
    const historico = await this.prisma.tentativaResposta.groupBy({
      by: ['questaoId'],
      where: { questaoId: { in: idsCandidatos } },
      _count: { questaoId: true },
      _max: { respondidaEm: true },
    });

    const mapaHist = new Map<string, { count: number; ultimaData: Date | null }>();
    for (const h of historico) {
      mapaHist.set(h.questaoId, { count: h._count.questaoId, ultimaData: h._max.respondidaEm });
    }

    // Separa em inéditas vs já respondidas
    const ineditasIds: string[] = [];
    const feitas: { id: string; count: number; ultimaData: number }[] = [];

    for (const id of idsCandidatos) {
      const h = mapaHist.get(id);
      if (!h || h.count === 0) {
        ineditasIds.push(id);
      } else {
        feitas.push({
          id,
          count: h.count,
          ultimaData: h.ultimaData ? new Date(h.ultimaData).getTime() : 0,
        });
      }
    }

    let idEscolhido: string;

    if (ineditasIds.length > 0) {
      // Escolhe 1 id 100% aleatório do grupo de INÉDITAS
      const idx = Math.floor(Math.random() * ineditasIds.length);
      idEscolhido = ineditasIds[idx];
    } else {
      // Se não há inéditas, escolhe entre as MENOS feitas e MAIS antigas
      feitas.sort((a, b) => a.count - b.count || a.ultimaData - b.ultimaData);
      // Pega um pequeno grupo das 10 mais antigas e sorteia 1 aleatoriamente para variar
      const topAntigas = feitas.slice(0, Math.min(10, feitas.length));
      const idx = Math.floor(Math.random() * topAntigas.length);
      idEscolhido = topAntigas[idx].id;
    }

    // 3. Retorna a questão completa escolhida
    const questao = await this.prisma.questao.findUnique({
      where: { id: idEscolhido },
      include: {
        alternativas: { orderBy: { letra: 'asc' } },
        subarea: {
          include: {
            capitulo: {
              include: { area: true },
            },
          },
        },
      },
    });

    if (!questao) {
      throw new NotFoundException('Questão não encontrada');
    }

    return {
      id: questao.id,
      numero: questao.numero,
      parte: questao.parte,
      anoDaProva: questao.anoDaProva,
      nivelDeDificuldade: questao.nivelDeDificuldade,
      enunciado: questao.enunciado,
      respostaCorreta: questao.respostaCorreta,
      explicacao: questao.explicacao,
      subarea: questao.subarea ? {
        id: questao.subarea.id,
        nome: questao.subarea.nome,
        capitulo: {
          id: questao.subarea.capitulo.id,
          nome: questao.subarea.capitulo.nome,
          area: {
            id: questao.subarea.capitulo.area.id,
            nome: questao.subarea.capitulo.area.nome,
          },
        },
      } : null,
      alternativas: questao.alternativas.map((alt) => ({
        letra: alt.letra,
        texto: alt.texto,
      })),
    };
  }

  // Buscar histórico de tentativas
  async getTentativas() {
    return this.prisma.tentativa.findMany({
      include: {
        quiz: true,
      },
      orderBy: { iniciadoEm: 'desc' },
      take: 10,
    });
  }

  // Detalhar uma tentativa para revisão pós-conclusão
  async getTentativaDetail(id: string) {
    const tentativa = await this.prisma.tentativa.findUnique({
      where: { id },
      include: {
        respostas: {
          include: {
            questao: {
              include: {
                alternativas: { orderBy: { letra: 'asc' } },
              },
            },
          },
        },
        quiz: true,
      },
    });

    if (!tentativa) {
      throw new NotFoundException(`Tentativa com ID ${id} não encontrada`);
    }

    return tentativa;
  }
}
