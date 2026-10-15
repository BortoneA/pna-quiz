import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { QuestoesModule } from './questoes/questoes.module';
import { ProgressoModule } from './progresso/progresso.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [PrismaModule, QuestoesModule, ProgressoModule, QuizzesModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
