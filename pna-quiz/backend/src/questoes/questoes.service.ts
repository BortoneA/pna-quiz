import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestoesService {
  constructor(private readonly prisma: PrismaService) {}

  // Listar todas as áreas com contagem de capítulos
  async getAreas() {
    const areas = await this.prisma.area.findMany({
      include: {
        _count: {
          select: { capitulos: true },
        },
      },
      orderBy: { nome: 'asc' },
    });

    // Para cada área, buscar estatísticas simplificadas de questões
    const result = await Promise.all(
      areas.map(async (area) => {
        // Obter contagem de questões associadas a subáreas desta área
        const totalQuestoes = await this.prisma.questao.count({
          where: {
            subarea: {
              capitulo: {
                areaId: area.id,
              },
            },
          },
        });

        return {
          id: area.id,
          nome: area.nome,
          totalCapitulos: area._count.capitulos,
          totalQuestoes,
        };
      }),
    );

    return result;
  }

  // Listar capítulos de uma área específica
  async getCapitulosByArea(areaId: number) {
    const capitulos = await this.prisma.capitulo.findMany({
      where: { areaId },
      include: {
        _count: {
          select: { subareas: true },
        },
      },
      orderBy: { numero: 'asc' },
    });

    return Promise.all(
      capitulos.map(async (cap) => {
        const totalQuestoes = await this.prisma.questao.count({
          where: {
            subarea: {
              capituloId: cap.id,
            },
          },
        });

        return {
          id: cap.id,
          numero: cap.numero,
          nome: cap.nome,
          totalSubareas: cap._count.subareas,
          totalQuestoes,
        };
      }),
    );
  }

  // Listar subáreas de um capítulo específico
  async getSubareasByCapitulo(capituloId: number) {
    const subareas = await this.prisma.subarea.findMany({
      where: { capituloId },
      orderBy: { codigo: 'asc' },
    });

    return Promise.all(
      subareas.map(async (sub) => {
        const totalQuestoes = await this.prisma.questao.count({
          where: { subareaId: sub.id },
        });

        return {
          id: sub.id,
          codigo: sub.codigo,
          nome: sub.nome,
          totalQuestoes,
        };
      }),
    );
  }

  // Criar uma nova subárea vinculada a um capítulo
  async createSubarea(data: { areaId: number; capituloId?: number; nome: string; codigo?: string }) {
    let capituloTargetId = data.capituloId;

    if (!capituloTargetId) {
      const primeiroCapitulo = await this.prisma.capitulo.findFirst({
        where: { areaId: Number(data.areaId) },
        orderBy: { numero: 'asc' },
      });

      if (!primeiroCapitulo) {
        // Se a área ainda não possuir capítulos, cria o capítulo Geral (Número 1)
        const novoCap = await this.prisma.capitulo.create({
          data: {
            areaId: Number(data.areaId),
            numero: 1,
            nome: 'Geral e Tópicos Diversos',
          },
        });
        capituloTargetId = novoCap.id;
      } else {
        capituloTargetId = primeiroCapitulo.id;
      }
    }

    const codigoFinal = data.codigo || `${capituloTargetId}.${Date.now().toString().slice(-3)}`;

    const novaSubarea = await this.prisma.subarea.create({
      data: {
        capituloId: Number(capituloTargetId),
        nome: data.nome,
        codigo: codigoFinal,
      },
    });

    return {
      id: novaSubarea.id,
      codigo: novaSubarea.codigo,
      nome: novaSubarea.nome,
      capituloId: novaSubarea.capituloId,
    };
  }

  // Buscar questões com filtros
  async searchQuestoes(query: {
    busca?: string;
    ano?: number;
    dificuldade?: string;
    parte?: string;
    subareaId?: number;
    capituloId?: number;
    areaId?: number;
    limite?: number;
    pagina?: number;
  }) {
    const limite = query.limite ? Number(query.limite) : 20;
    const pagina = query.pagina ? Number(query.pagina) : 1;
    const skip = (pagina - 1) * limite;

    const where: any = { ativa: true };

    if (query.ano) {
      where.anoDaProva = Number(query.ano);
    }
    if (query.dificuldade) {
      where.nivelDeDificuldade = query.dificuldade;
    }
    if (query.parte) {
      where.parte = query.parte;
    }
    if (query.subareaId) {
      where.subareaId = Number(query.subareaId);
    } else if (query.capituloId) {
      where.subarea = { capituloId: Number(query.capituloId) };
    } else if (query.areaId) {
      where.subarea = { capitulo: { areaId: Number(query.areaId) } };
    }

    if (query.busca) {
      where.OR = [
        { enunciado: { contains: query.busca, mode: 'insensitive' } },
        { explicacao: { contains: query.busca, mode: 'insensitive' } },
        { doencaOuConjunto: { contains: query.busca, mode: 'insensitive' } },
      ];
    }

    const [total, itens] = await Promise.all([
      this.prisma.questao.count({ where }),
      this.prisma.questao.findMany({
        where,
        include: {
          alternativas: {
            orderBy: { letra: 'asc' },
          },
          subarea: {
            include: {
              capitulo: {
                include: {
                  area: true,
                },
              },
            },
          },
        },
        take: limite,
        skip,
        orderBy: { id: 'asc' },
      }),
    ]);

    return {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      itens: itens.map((q) => ({
        id: q.id,
        numero: q.numero,
        parte: q.parte,
        anoDaProva: q.anoDaProva,
        nivelDeDificuldade: q.nivelDeDificuldade,
        enunciado: q.enunciado,
        respostaCorreta: q.respostaCorreta,
        explicacao: q.explicacao,
        doencaOuConjunto: q.doencaOuConjunto,
        subarea: q.subarea ? {
          id: q.subarea.id,
          nome: q.subarea.nome,
          codigo: q.subarea.codigo,
          capitulo: {
            id: q.subarea.capitulo.id,
            nome: q.subarea.capitulo.nome,
            numero: q.subarea.capitulo.numero,
            area: {
              id: q.subarea.capitulo.area.id,
              nome: q.subarea.capitulo.area.nome,
            },
          },
        } : null,
        alternativas: q.alternativas.map((alt) => ({
          letra: alt.letra,
          texto: alt.texto,
        })),
      })),
    };
  }

  // Buscar uma questão pelo ID
  async getQuestaoById(id: string) {
    const q = await this.prisma.questao.findUnique({
      where: { id },
      include: {
        alternativas: {
          orderBy: { letra: 'asc' },
        },
        subarea: {
          include: {
            capitulo: {
              include: {
                area: true,
              },
            },
          },
        },
      },
    });

    if (!q) {
      throw new NotFoundException(`Questão com ID ${id} não encontrada`);
    }

    return {
      id: q.id,
      numero: q.numero,
      parte: q.parte,
      anoDaProva: q.anoDaProva,
      nivelDeDificuldade: q.nivelDeDificuldade,
      enunciado: q.enunciado,
      respostaCorreta: q.respostaCorreta,
      explicacao: q.explicacao,
      doencaOuConjunto: q.doencaOuConjunto,
      subarea: q.subarea ? {
        id: q.subarea.id,
        nome: q.subarea.nome,
        codigo: q.subarea.codigo,
        capitulo: {
          id: q.subarea.capitulo.id,
          nome: q.subarea.capitulo.nome,
          numero: q.subarea.capitulo.numero,
          area: {
            id: q.subarea.capitulo.area.id,
            nome: q.subarea.capitulo.area.nome,
          },
        },
      } : null,
      alternativas: q.alternativas.map((alt) => ({
        letra: alt.letra,
        texto: alt.texto,
      })),
    };
  }

  // Editar / Atualizar uma questão existente (incluindo subárea e dificuldade)
  async updateQuestao(
    id: string,
    data: {
      enunciado?: string;
      respostaCorreta?: string;
      explicacao?: string;
      nivelDeDificuldade?: string;
      subareaId?: number;
      alternativas?: { letra: string; texto: string }[];
    },
  ) {
    const q = await this.prisma.questao.findUnique({ where: { id } });
    if (!q) {
      throw new NotFoundException(`Questão com ID ${id} não encontrada`);
    }

    // Atualiza campos da questão
    await this.prisma.questao.update({
      where: { id },
      data: {
        enunciado: data.enunciado ?? q.enunciado,
        respostaCorreta: data.respostaCorreta ?? q.respostaCorreta,
        explicacao: data.explicacao ?? q.explicacao,
        nivelDeDificuldade: data.nivelDeDificuldade ?? q.nivelDeDificuldade,
        subareaId: data.subareaId !== undefined ? Number(data.subareaId) : q.subareaId,
      },
    });

    // Se alternativas forem fornecidas, atualiza cada uma
    if (data.alternativas && data.alternativas.length > 0) {
      for (const alt of data.alternativas) {
        await this.prisma.alternativa.upsert({
          where: {
            questaoId_letra: {
              questaoId: id,
              letra: alt.letra,
            },
          },
          update: { texto: alt.texto },
          create: {
            questaoId: id,
            letra: alt.letra,
            texto: alt.texto,
          },
        });
      }
    }

    return this.getQuestaoById(id);
  }
}

