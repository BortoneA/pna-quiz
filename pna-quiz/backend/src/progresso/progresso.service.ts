import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressoService {
  constructor(private readonly prisma: PrismaService) {}

  // Retorna o XP necessário para alcançar o nível N
  getXpNecessarioParaNivel(nivel: number): number {
    if (nivel <= 1) return 0;
    return Math.round(100 * Math.pow(nivel, 1.45));
  }

  // Calcula o nível com base no XP acumulado
  getNivelPorXp(xp: bigint): number {
    let nivel = 1;
    for (let n = 1; n <= 100; n++) {
      const xpReq = this.getXpParaNivelAcumulado(n);
      if (xp >= BigInt(xpReq)) {
        nivel = n;
      } else {
        break;
      }
    }
    return nivel;
  }

  // Retorna o XP acumulado necessário para chegar ao nível N (soma dos XPs de todos os níveis anteriores)
  getXpParaNivelAcumulado(nivel: number): number {
    let totalXp = 0;
    for (let i = 1; i < nivel; i++) {
      totalXp += this.getXpNecessarioParaNivel(i);
    }
    return totalXp;
  }

  // Conceder XP de forma idempotente
  async concederXp(
    tipoEvento: string,
    xpPontos: number,
    chaveIdempotencia: string,
    detalhes?: any,
  ) {
    // 1. Verificar se o evento de XP já foi processado
    const eventoExistente = await this.prisma.xpEvento.findUnique({
      where: { chaveIdempotencia },
    });

    if (eventoExistente) {
      return { duplicado: true, xpGanho: 0 };
    }

    // 2. Criar o evento de XP e atualizar o progresso geral em uma transação atômica
    const result = await this.prisma.$transaction(async (tx) => {
      // Registrar evento
      const novoEvento = await tx.xpEvento.create({
        data: {
          chaveIdempotencia,
          tipoEvento,
          xpPontos,
          detalhes,
        },
      });

      // Buscar progresso geral atual (ou criar se não existir)
      let progresso = await tx.progressoGeral.findUnique({
        where: { id: 1 },
      });

      if (!progresso) {
        progresso = await tx.progressoGeral.create({
          data: {
            id: 1,
            xpTotal: 0,
            nivelAtual: 1,
            metaDiariaQuestoes: 20,
          },
        });
      }

      const novoXpTotal = progresso.xpTotal + BigInt(xpPontos);
      const novoNivel = this.getNivelPorXp(novoXpTotal);
      const subiuNivel = novoNivel > progresso.nivelAtual;

      // Atualizar progresso geral
      const progressoAtualizado = await tx.progressoGeral.update({
        where: { id: 1 },
        data: {
          xpTotal: novoXpTotal,
          nivelAtual: novoNivel,
          ultimoDiaEstudo: new Date(),
        },
      });

      return {
        novoEvento,
        progresso: progressoAtualizado,
        subiuNivel,
        nivelAntigo: progresso.nivelAtual,
        nivelNovo: novoNivel,
      };
    });

    // 3. Verificar se novas conquistas foram desbloqueadas
    await this.verificarConquistas(result.progresso.xpTotal);

    return {
      duplicado: false,
      xpGanho: xpPontos,
      xpTotal: result.progresso.xpTotal.toString(),
      nivelAtual: result.progresso.nivelAtual,
      subiuNivel: result.subiuNivel,
      nivelNovo: result.nivelNovo,
    };
  }

  // Lista completa de Conquistas do PNA Quiz
  private readonly CATALOGO_CONQUISTAS = [
    { codigo: 'FIRST_STEP', titulo: 'Primeiro Passo', descricao: 'Responder à primeira questão no PNA Quiz', categoria: 'PRATICA', icone: 'school', metaValor: 1, xpRecompensa: 50 },
    { codigo: 'TEN_QUESTIONS', titulo: 'Aquecimento Clínico', descricao: 'Responder 10 questões no total', categoria: 'PRATICA', icone: 'bolt', metaValor: 10, xpRecompensa: 100 },
    { codigo: 'CENTURION', titulo: 'Centurião PNA', descricao: 'Responder 100 questões no banco', categoria: 'PRATICA', icone: 'military_tech', metaValor: 100, xpRecompensa: 300 },
    { codigo: 'MASTER_500', titulo: 'Master 500', descricao: 'Concluir 500 questões no aplicativo', categoria: 'PRATICA', icone: 'workspace_premium', metaValor: 500, xpRecompensa: 1000 },
    { codigo: 'CONSISTENCY_3', titulo: 'Foco Inicial', descricao: 'Estudar por 3 dias seguidos', categoria: 'CONSISTENCIA', icone: 'local_fire_department', metaValor: 3, xpRecompensa: 150 },
    { codigo: 'CONSISTENCY_7', titulo: 'Hábito Clínico', descricao: 'Estudar por 7 dias consecutivos', categoria: 'CONSISTENCIA', icone: 'calendar_month', metaValor: 7, xpRecompensa: 400 },
    { codigo: 'SUPER_RAPIDO_PRO', titulo: 'Relâmpago Super Rápido', descricao: 'Responder 20 questões no Modo Super Rápido', categoria: 'MODOS', icone: 'flash_on', metaValor: 20, xpRecompensa: 250 },
    { codigo: 'SIMULADO_PRO', titulo: 'Pronto para a Prova', descricao: 'Finalizar um simulado de 100 questões', categoria: 'MODOS', icone: 'assignment_turned_in', metaValor: 1, xpRecompensa: 500 },
    { codigo: 'ACCURACY_80', titulo: 'Olho Clínico', descricao: 'Alcançar 80% ou mais de acerto em um quiz de 10+ questões', categoria: 'DESEMPENHO', icone: 'center_focus_strong', metaValor: 80, xpRecompensa: 350 },
    { codigo: 'PERFECT_SCORE', titulo: 'Gabaritador Implacável', descricao: 'Concluir um quiz com 100% de acerto', categoria: 'DESEMPENHO', icone: 'verified', metaValor: 100, xpRecompensa: 600 },
  ];

  // Verificar conquistas qualificadas pelo XP ou progresso
  async verificarConquistas(xpTotal: bigint) {
    const totalRespostas = await this.prisma.tentativaResposta.count();
    const progresso = await this.prisma.progressoGeral.findUnique({ where: { id: 1 } });
    const sequencia = progresso?.sequenciaDias || 0;

    for (const c of this.CATALOGO_CONQUISTAS) {
      await this.prisma.conquista.upsert({
        where: { codigo: c.codigo },
        update: { titulo: c.titulo, descricao: c.descricao, categoria: c.categoria, icone: c.icone, metaValor: c.metaValor, xpRecompensa: c.xpRecompensa },
        create: c,
      });

      const desbloqueada = await this.prisma.conquistaDesbloqueada.findUnique({
        where: { conquistaCodigo: c.codigo },
      });

      if (!desbloqueada) {
        let qualifica = false;

        if (c.codigo === 'FIRST_STEP') qualifica = totalRespostas >= 1;
        else if (c.codigo === 'TEN_QUESTIONS') qualifica = totalRespostas >= 10;
        else if (c.codigo === 'CENTURION') qualifica = totalRespostas >= 100;
        else if (c.codigo === 'MASTER_500') qualifica = totalRespostas >= 500;
        else if (c.codigo === 'CONSISTENCY_3') qualifica = sequencia >= 3;
        else if (c.codigo === 'CONSISTENCY_7') qualifica = sequencia >= 7;
        else if (c.codigo === 'SUPER_RAPIDO_PRO') qualifica = totalRespostas >= 20;

        if (qualifica) {
          await this.prisma.conquistaDesbloqueada.create({
            data: { conquistaCodigo: c.codigo },
          });

          await this.concederXp(
            'CONQUISTA_DESBLOQUEADA',
            c.xpRecompensa,
            `achievement_${c.codigo}`,
            { conquistaCodigo: c.codigo },
          );
        }
      }
    }
  }

  // Consultar o progresso geral e todas as conquistas com avanço parcial
  async getProgresso() {
    let progresso = await this.prisma.progressoGeral.findUnique({
      where: { id: 1 },
    });

    if (!progresso) {
      progresso = await this.prisma.progressoGeral.create({
        data: {
          id: 1,
          xpTotal: 0,
          nivelAtual: 1,
          metaDiariaQuestoes: 20,
        },
      });
    }

    const totalRespostas = await this.prisma.tentativaResposta.count();
    const sequencia = progresso.sequenciaDias || 0;

    await this.verificarConquistas(progresso.xpTotal);

    const xpTotalNum = Number(progresso.xpTotal);
    const nivelAtual = progresso.nivelAtual;
    const xpAcumuladoNivelAtual = this.getXpParaNivelAcumulado(nivelAtual);
    const xpNecessarioProximo = this.getXpNecessarioParaNivel(nivelAtual);
    const xpProgressoNivel = xpTotalNum - xpAcumuladoNivelAtual;

    const desbloqueadasMap = new Map(
      (await this.prisma.conquistaDesbloqueada.findMany()).map((cd) => [cd.conquistaCodigo, cd.desbloqueadaEm]),
    );

    const conquistasDetalhadas = this.CATALOGO_CONQUISTAS.map((c) => {
      let valorAtual = 0;
      if (c.codigo === 'FIRST_STEP' || c.codigo === 'TEN_QUESTIONS' || c.codigo === 'CENTURION' || c.codigo === 'MASTER_500' || c.codigo === 'SUPER_RAPIDO_PRO') {
        valorAtual = totalRespostas;
      } else if (c.codigo === 'CONSISTENCY_3' || c.codigo === 'CONSISTENCY_7') {
        valorAtual = sequencia;
      }

      const estaDesbloqueada = desbloqueadasMap.has(c.codigo);

      return {
        codigo: c.codigo,
        titulo: c.titulo,
        descricao: c.descricao,
        categoria: c.categoria,
        icone: c.icone,
        metaValor: c.metaValor,
        valorAtual: Math.min(valorAtual, c.metaValor),
        xpRecompensa: c.xpRecompensa,
        desbloqueada: estaDesbloqueada,
        desbloqueadaEm: desbloqueadasMap.get(c.codigo) || null,
        percentual: estaDesbloqueada ? 100 : Math.min(Math.round((valorAtual / c.metaValor) * 100), 100),
      };
    });

    return {
      xpTotal: xpTotalNum,
      nivelAtual,
      xpProgressoNivel,
      xpNecessarioProximo,
      percentualNivel: Math.min(Math.round((xpProgressoNivel / xpNecessarioProximo) * 100), 100),
      sequenciaDias: progresso.sequenciaDias,
      maiorSequencia: progresso.maiorSequencia,
      metaDiariaQuestoes: progresso.metaDiariaQuestoes ?? 20,
      totalDesbloqueadas: desbloqueadasMap.size,
      totalConquistas: this.CATALOGO_CONQUISTAS.length,
      percentualConquistas: Math.round((desbloqueadasMap.size / this.CATALOGO_CONQUISTAS.length) * 100),
      conquistas: conquistasDetalhadas,
    };
  }
}

