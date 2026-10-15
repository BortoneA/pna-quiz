import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração global de validação dos DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Habilitar CORS para permitir o acesso de dispositivos na mesma rede local
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Configuração do Swagger para documentação da API
  const config = new DocumentBuilder()
    .setTitle('PNA Quiz API')
    .setDescription('API premium de preparação para a Prova Nacional de Acesso (PNA)')
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`PNA Quiz API rodando na porta ${port}`);
  console.log(`Documentação da API disponível em http://localhost:${port}/api/docs`);
}
bootstrap();
