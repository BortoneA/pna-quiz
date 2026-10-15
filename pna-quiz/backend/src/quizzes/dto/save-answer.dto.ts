import { IsString, IsInt, IsOptional } from 'class-validator';

export class SaveAnswerDto {
  @IsString()
  questaoId: string;

  @IsString()
  respostaEscolhida: string; // 'A', 'B', 'C', 'D', 'E'

  @IsOptional()
  @IsInt()
  tempoRespostaSeg?: number;
}
