import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Quizzes & Simulados')
@Controller('api')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('quizzes')
  @ApiOperation({ summary: 'Criar um novo quiz ou simulado' })
  @ApiResponse({ status: 201, description: 'Quiz criado com sucesso.' })
  createQuiz(@Body() dto: CreateQuizDto) {
    return this.quizzesService.createQuiz(dto);
  }

  @Post('quizzes/super-rapido/proxima-questao')
  @ApiOperation({ summary: 'Obter 1 questão aleatória e inédita para o modo Super Rápido 1 a 1' })
  getProximaQuestaoSuperRapido(
    @Body()
    body: {
      areaId?: number;
      capituloId?: number;
      subareaId?: number;
      dificuldade?: string;
      excluirIds?: string[];
    },
  ) {
    return this.quizzesService.getProximaQuestaoSuperRapido(body);
  }

  @Get('quizzes/:id')
  @ApiOperation({ summary: 'Obter detalhes de um quiz e suas questões' })
  getQuizById(@Param('id') id: string) {
    return this.quizzesService.getQuizById(id);
  }

  @Post('quizzes/:id/tentativa')
  @ApiOperation({ summary: 'Iniciar ou retomar uma tentativa para um quiz' })
  createTentativa(@Param('id') id: string) {
    return this.quizzesService.createTentativa(id);
  }

  @Post('tentativas/:id/respostas')
  @ApiOperation({ summary: 'Salvar resposta de uma questão de forma incremental' })
  saveAnswer(@Param('id') id: string, @Body() dto: SaveAnswerDto) {
    return this.quizzesService.saveAnswer(id, dto);
  }

  @Post('tentativas/:id/finalizar')
  @ApiOperation({ summary: 'Concluir tentativa e calcular resultado de acertos e XP' })
  finishTentativa(@Param('id') id: string) {
    return this.quizzesService.finishTentativa(id);
  }

  @Get('tentativas')
  @ApiOperation({ summary: 'Listar tentativas recentes (histórico)' })
  getTentativas() {
    return this.quizzesService.getTentativas();
  }

  @Get('tentativas/:id')
  @ApiOperation({ summary: 'Detalhar tentativa concluída para revisão de respostas' })
  getTentativaDetail(@Param('id') id: string) {
    return this.quizzesService.getTentativaDetail(id);
  }
}
