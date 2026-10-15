import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resumo geral de desempenho */
  async getResumo() {
    const [progresso, totalRespostas, acertos, tentativasConcluidas] = await Promise.all([
      this.prisma.progressoGeral.findUnique({ where: { id: 1 } }),
      this.prisma.tentativaResposta.count(),
      this.prisma.tentativaResposta.count({ where: { correta: true } }),
      this.prisma.tentativa.count({ where: { status: 'concluido' } }),
    ]);

    const taxaAcerto = totalRespostas > 0 ? Math.round((acertos / totalRespostas) * 100) : 0;

    // XP ganho hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const xpEventosHoje = await this.prisma.xpEvento.findMany({
      where: { createdAt: { gte: hoje } },
    });
    const xpHoje = xpEventosHoje.reduce((acc, e) => acc + e.xpPontos, 0);

    // Questões respondidas hoje
    const respostasHoje = await this.prisma.tentativaResposta.count({
      where: { respondidaEm: { gte: hoje } },
    });

    return {
      xpTotal: Number(progresso?.xpTotal ?? 0),
      nivelAtual: progresso?.nivelAtual ?? 1,
      sequenciaDias: progresso?.sequenciaDias ?? 0,
      maiorSequencia: progresso?.maiorSequencia ?? 0,
      totalRespostas,
      totalAcertos: acertos,
      totalErros: totalRespostas - acertos,
      taxaAcertoGeral: taxaAcerto,
      tentativasConcluidas,
      xpHoje,
      respostasHoje,
      metaDiaria: progresso?.metaDiariaQuestoes ?? 20,
    };
  }

  /** Desempenho por área médica */
  async getDesempenhoPorArea() {
    // Busca todas as áreas
    const areas = await this.prisma.area.findMany({
      include: {
        capitulos: {
          include: {
            subareas: {
              include: {
                questoes: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // Para cada área, busca as respostas das questões que pertencem a ela
    const resultado = await Promise.all(
      areas.map(async (area) => {
        const questaoIds = area.capitulos.flatMap((c) =>
          c.subareas.flatMap((s) => s.questoes.map((q) => q.id)),
        );

        if (questaoIds.length === 0) {
          return {
            areaId: area.id,
            areaNome: area.nome,
            totalQuestoes: 0,
            totalRespondidas: 0,
            totalAcertos: 0,
            taxaAcerto: 0,
            cobertura: 0,
          };
        }

        const [totalRespondidas, totalAcertos] = await Promise.all([
          this.prisma.tentativaResposta.count({
            where: { questaoId: { in: questaoIds } },
          }),
          this.prisma.tentativaResposta.count({
            where: { questaoId: { in: questaoIds }, correta: true },
          }),
        ]);

        const taxaAcerto =
          totalRespondidas > 0
            ? Math.round((totalAcertos / totalRespondidas) * 100)
            : 0;

        const cobertura =
          questaoIds.length > 0
            ? Math.round((new Set(await this.prisma.tentativaResposta.findMany({
                where: { questaoId: { in: questaoIds } },
                select: { questaoId: true },
              }).then((rs) => rs.map((r) => r.questaoId))).size / questaoIds.length) * 100)
            : 0;

        return {
          areaId: area.id,
          areaNome: area.nome,
          totalQuestoes: questaoIds.length,
          totalRespondidas,
          totalAcertos,
          taxaAcerto,
          cobertura,
        };
      }),
    );

    return resultado
      .filter((r) => r.totalRespondidas > 0)
      .sort((a, b) => b.totalRespondidas - a.totalRespondidas);
  }

  /** Evolução de XP nos últimos 30 dias */
  async getEvolucaoXp() {
    const dias = 30;
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);
    inicio.setHours(0, 0, 0, 0);

    const eventos = await this.prisma.xpEvento.findMany({
      where: { createdAt: { gte: inicio } },
      orderBy: { createdAt: 'asc' },
    });

    // Agrupa por dia
    const porDia: Record<string, number> = {};
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      porDia[key] = 0;
    }

    for (const ev of eventos) {
      const key = ev.createdAt.toISOString().split('T')[0];
      if (porDia[key] !== undefined) {
        porDia[key] += ev.xpPontos;
      }
    }

    return Object.entries(porDia).map(([data, xp]) => ({ data, xp }));
  }

  /** Questões respondidas por dia (últimos 30 dias) */
  async getAtividadeDiaria() {
    const dias = 30;
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - dias);
    inicio.setHours(0, 0, 0, 0);

    const respostas = await this.prisma.tentativaResposta.findMany({
      where: { respondidaEm: { gte: inicio } },
      select: { respondidaEm: true, correta: true },
    });

    const porDia: Record<string, { total: number; acertos: number }> = {};
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      porDia[key] = { total: 0, acertos: 0 };
    }

    for (const r of respostas) {
      const key = r.respondidaEm.toISOString().split('T')[0];
      if (porDia[key]) {
        porDia[key].total += 1;
        if (r.correta) porDia[key].acertos += 1;
      }
    }

    return Object.entries(porDia).map(([data, v]) => ({
      data,
      total: v.total,
      acertos: v.acertos,
      taxaAcerto: v.total > 0 ? Math.round((v.acertos / v.total) * 100) : 0,
    }));
  }

  /** Últimas tentativas concluídas */
  async getHistoricoTentativas() {
    const tentativas = await this.prisma.tentativa.findMany({
      where: { status: 'concluido' },
      include: { quiz: { select: { titulo: true, tipo: true } } },
      orderBy: { concluidoEm: 'desc' },
      take: 20,
    });

    return tentativas.map((t) => ({
      id: t.id,
      quizTitulo: t.quiz?.titulo ?? 'Quiz Removido',
      quizTipo: t.quiz?.tipo ?? '-',
      totalQuestoes: t.totalQuestoes,
      totalAcertos: t.totalAcertos,
      totalErros: t.totalErros,
      taxaAcerto:
        t.totalQuestoes > 0
          ? Math.round((t.totalAcertos / t.totalQuestoes) * 100)
          : 0,
      tempoTotalSeg: t.tempoTotalSeg,
      xpGanho: t.xpGanho,
      concluidoEm: t.concluidoEm,
    }));
  }

  /** Áreas mais fracas (menor taxa de acerto, mínimo 5 respostas) */
  async getFraquezas() {
    const porArea = await this.getDesempenhoPorArea();
    return porArea
      .filter((a) => a.totalRespondidas >= 5)
      .sort((a, b) => a.taxaAcerto - b.taxaAcerto)
      .slice(0, 5);
  }

  /** Áreas mais fortes */
  async getForcas() {
    const porArea = await this.getDesempenhoPorArea();
    return porArea
      .filter((a) => a.totalRespondidas >= 5)
      .sort((a, b) => b.taxaAcerto - a.taxaAcerto)
      .slice(0, 5);
  }

  /** Análise detalhada das subáreas mais erradas dentro de cada área médica */
  async getSubareasMaisErradas() {
    const subareas = await this.prisma.subarea.findMany({
      include: {
        capitulo: {
          include: {
            area: true,
          },
        },
        questoes: {
          select: { id: true },
        },
      },
    });

    const resultado = await Promise.all(
      subareas.map(async (sub) => {
        const questaoIds = sub.questoes.map((q) => q.id);

        if (questaoIds.length === 0) {
          return null;
        }

        const [totalRespondidas, totalAcertos] = await Promise.all([
          this.prisma.tentativaResposta.count({
            where: { questaoId: { in: questaoIds } },
          }),
          this.prisma.tentativaResposta.count({
            where: { questaoId: { in: questaoIds }, correta: true },
          }),
        ]);

        if (totalRespondidas === 0) return null;

        const totalErros = totalRespondidas - totalAcertos;
        const taxaAcerto = Math.round((totalAcertos / totalRespondidas) * 100);
        const taxaErro = 100 - taxaAcerto;

        return {
          subareaId: sub.id,
          subareaCodigo: sub.codigo,
          subareaNome: sub.nome,
          capituloNome: sub.capitulo.nome,
          areaId: sub.capitulo.area.id,
          areaNome: sub.capitulo.area.nome,
          totalRespondidas,
          totalAcertos,
          totalErros,
          taxaAcerto,
          taxaErro,
        };
      }),
    );

    const filtrados = resultado.filter((item): item is NonNullable<typeof item> => item !== null);

    // Agrupa por área para o frontend poder apresentar por especialidade
    const agrupadoPorArea: Record<string, typeof filtrados> = {};
    for (const item of filtrados) {
      if (!agrupadoPorArea[item.areaNome]) {
        agrupadoPorArea[item.areaNome] = [];
      }
      agrupadoPorArea[item.areaNome].push(item);
    }

    // Ordena as subáreas de cada área por maior número de erros e menor taxa de acerto
    Object.keys(agrupadoPorArea).forEach((areaNome) => {
      agrupadoPorArea[areaNome].sort((a, b) => b.totalErros - a.totalErros || a.taxaAcerto - b.taxaAcerto);
    });

    // Ranking geral das 10 subáreas mais críticas (mais erradas) no aplicativo
    const rankingGeralCritico = [...filtrados]
      .filter((s) => s.totalErros > 0)
      .sort((a, b) => b.totalErros - a.totalErros || a.taxaAcerto - b.taxaAcerto)
      .slice(0, 10);

    return {
      rankingGeralCritico,
      agrupadoPorArea,
    };
  }

  /** Análise de desempenho detalhada por Nível de Dificuldade (Fácil, Média, Difícil) */
  async getDesempenhoPorDificuldade() {
    const niveis = ['facil', 'media', 'dificil'];
    const resultado = await Promise.all(
      niveis.map(async (nivel) => {
        const questoes = await this.prisma.questao.findMany({
          where: { nivelDeDificuldade: nivel, ativa: true },
          select: { id: true },
        });
        const ids = questoes.map((q) => q.id);

        if (ids.length === 0) {
          return { nivel, totalQuestoes: 0, totalRespondidas: 0, totalAcertos: 0, taxaAcerto: 0 };
        }

        const [totalRespondidas, totalAcertos] = await Promise.all([
          this.prisma.tentativaResposta.count({ where: { questaoId: { in: ids } } }),
          this.prisma.tentativaResposta.count({ where: { questaoId: { in: ids }, correta: true } }),
        ]);

        const taxaAcerto = totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : 0;

        return {
          nivel,
          totalQuestoes: ids.length,
          totalRespondidas,
          totalAcertos,
          totalErros: totalRespondidas - totalAcertos,
          taxaAcerto,
        };
      }),
    );

    return resultado;
  }

  /** Análise de cobertura completa do Banco de Questões APNA */
  async getCoberturaDetalhadaBanco() {
    const totalBanco = await this.prisma.questao.count({ where: { ativa: true } });
    const respostasDistintas = await this.prisma.tentativaResposta.findMany({
      select: { questaoId: true },
      distinct: ['questaoId'],
    });
    const totalRespondidasUnicas = respostasDistintas.length;
    const totalPendentes = Math.max(0, totalBanco - totalRespondidasUnicas);
    const percentualCobertura = totalBanco > 0 ? Math.round((totalRespondidasUnicas / totalBanco) * 100) : 0;

    return {
      totalBanco,
      totalRespondidasUnicas,
      totalPendentes,
      percentualCobertura,
    };
  }
}