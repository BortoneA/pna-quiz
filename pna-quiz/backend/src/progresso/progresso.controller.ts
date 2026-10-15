import { Controller, Get, Post, Body } from '@nestjs/common';
import { ProgressoService } from './progresso.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Progresso & Gamificação')
@Controller('api/progresso')
export class ProgressoController {
  constructor(private readonly progressoService: ProgressoService) {}

  @Get()
  @ApiOperation({ summary: 'Obter progresso geral, XP, nível e conquistas' })
  @ApiResponse({ status: 200, description: 'Dados de progresso e conquistas retornados com sucesso.' })
  getProgresso() {
    return this.progressoService.getProgresso();
  }

  @Post('conceder-xp')
  @ApiOperation({ summary: 'Conceder XP de forma manual/idempotente' })
  concederXp(
    @Body() body: { tipoEvento: string; xpPontos: number; chaveIdempotencia: string; detalhes?: any },
  ) {
    return this.progressoService.concederXp(
      body.tipoEvento,
      body.xpPontos,
      body.chaveIdempotencia,
      body.detalhes,
    );
  }
}
