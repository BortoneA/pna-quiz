import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('resumo')
  getResumo() { return this.analyticsService.getResumo(); }

  @Get('por-area')
  getDesempenhoPorArea() { return this.analyticsService.getDesempenhoPorArea(); }

  @Get('evolucao-xp')
  getEvolucaoXp() { return this.analyticsService.getEvolucaoXp(); }

  @Get('atividade-diaria')
  getAtividadeDiaria() { return this.analyticsService.getAtividadeDiaria(); }

  @Get('historico')
  getHistorico() { return this.analyticsService.getHistoricoTentativas(); }

  @Get('fraquezas')
  getFraquezas() { return this.analyticsService.getFraquezas(); }

  @Get('forcas')
  getForcas() { return this.analyticsService.getForcas(); }

  @Get('subareas-erradas')
  getSubareasMaisErradas() { return this.analyticsService.getSubareasMaisErradas(); }

  @Get('dificuldade')
  getDesempenhoPorDificuldade() { return this.analyticsService.getDesempenhoPorDificuldade(); }

  @Get('cobertura-banco')
  getCoberturaDetalhadaBanco() { return this.analyticsService.getCoberturaDetalhadaBanco(); }
}