import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  tipo: string; // 'simulado', 'personalizado', 'revisao_erros'

  @IsOptional()
  filtroConfig?: any;

  @IsOptional()
  @IsInt()
  tempoLimiteMin?: number;

  @IsOptional()
  @IsBoolean()
  ordemAleatoria?: boolean;

  @IsOptional()
  @IsBoolean()
  alternativasAleatorias?: boolean;
}
