import { Controller, Get, Param, Query, ParseIntPipe, Patch, Post, Body } from '@nestjs/common';
import { QuestoesService } from './questoes.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Questões & Navegação Médica')
@Controller('api')
export class QuestoesController {
  constructor(private readonly questoesService: QuestoesService) {}

  @Get('areas')
  @ApiOperation({ summary: 'Listar todas as áreas com estatísticas' })
  @ApiResponse({ status: 200, description: 'Lista de áreas obtida com sucesso.' })
  getAreas() {
    return this.questoesService.getAreas();
  }

  @Get('areas/:areaId/capitulos')
  @ApiOperation({ summary: 'Listar capítulos de uma área específica' })
  @ApiResponse({ status: 200, description: 'Lista de capítulos obtida com sucesso.' })
  getCapitulosByArea(@Param('areaId', ParseIntPipe) areaId: number) {
    return this.questoesService.getCapitulosByArea(areaId);
  }

  @Get('capitulos/:capituloId/subareas')
  @ApiOperation({ summary: 'Listar subáreas de um capítulo específico' })
  @ApiResponse({ status: 200, description: 'Lista de subáreas obtida com sucesso.' })
  getSubareasByCapitulo(@Param('capituloId', ParseIntPipe) capituloId: number) {
    return this.questoesService.getSubareasByCapitulo(capituloId);
  }

  @Post('subareas')
  @ApiOperation({ summary: 'Criar uma nova subárea médica' })
  @ApiResponse({ status: 201, description: 'Subárea criada com sucesso.' })
  createSubarea(
    @Body() body: { areaId: number; capituloId?: number; nome: string; codigo?: string },
  ) {
    return this.questoesService.createSubarea(body);
  }


  @Get('questoes/busca')
  @ApiOperation({ summary: 'Buscar e filtrar questões paginadas' })
  @ApiQuery({ name: 'busca', required: false, type: String, description: 'Termo textual a pesquisar no enunciado/explicação' })
  @ApiQuery({ name: 'ano', required: false, type: Number, description: 'Filtrar por ano da prova' })
  @ApiQuery({ name: 'dificuldade', required: false, type: String, description: 'Filtrar por nível de dificuldade' })
  @ApiQuery({ name: 'parte', required: false, type: String, description: 'Filtrar por parte da prova' })
  @ApiQuery({ name: 'subareaId', required: false, type: Number, description: 'Filtrar por ID de subárea' })
  @ApiQuery({ name: 'capituloId', required: false, type: Number, description: 'Filtrar por ID de capítulo' })
  @ApiQuery({ name: 'areaId', required: false, type: Number, description: 'Filtrar por ID de área' })
  @ApiQuery({ name: 'limite', required: false, type: Number, description: 'Quantidade de itens por página' })
  @ApiQuery({ name: 'pagina', required: false, type: Number, description: 'Página atual' })
  @ApiResponse({ status: 200, description: 'Resultado da busca paginado.' })
  searchQuestoes(
    @Query('busca') busca?: string,
    @Query('ano') ano?: number,
    @Query('dificuldade') dificuldade?: string,
    @Query('parte') parte?: string,
    @Query('subareaId') subareaId?: number,
    @Query('capituloId') capituloId?: number,
    @Query('areaId') areaId?: number,
    @Query('limite') limite?: number,
    @Query('pagina') pagina?: number,
  ) {
    return this.questoesService.searchQuestoes({
      busca,
      ano,
      dificuldade,
      parte,
      subareaId,
      capituloId,
      areaId,
      limite,
      pagina,
    });
  }

  @Get('questoes/:id')
  @ApiOperation({ summary: 'Obter detalhes de uma questão específica' })
  @ApiResponse({ status: 200, description: 'Detalhes da questão retornados com sucesso.' })
  @ApiResponse({ status: 404, description: 'Questão não encontrada.' })
  getQuestaoById(@Param('id') id: string) {
    return this.questoesService.getQuestaoById(id);
  }

  @Patch('questoes/:id')
  @ApiOperation({ summary: 'Editar enunciado, alternativas, explicação, subárea ou dificuldade' })
  @ApiResponse({ status: 200, description: 'Questão atualizada com sucesso.' })
  updateQuestao(
    @Param('id') id: string,
    @Body()
    body: {
      enunciado?: string;
      respostaCorreta?: string;
      explicacao?: string;
      nivelDeDificuldade?: string;
      subareaId?: number;
      alternativas?: { letra: string; texto: string }[];
    },
  ) {
    return this.questoesService.updateQuestao(id, body);
  }
}
