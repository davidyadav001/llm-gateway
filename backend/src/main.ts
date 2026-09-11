import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string[]>('corsOrigins'),
    credentials: true,
  });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(cookieParser());

  // whitelist strips unknown properties, forbidNonWhitelisted rejects
  // requests carrying fields we didn't ask for instead of silently dropping
  // them - both matter for a gateway that logs/forwards user input.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`LLM Gateway API listening on port ${port}`);
}

bootstrap();
