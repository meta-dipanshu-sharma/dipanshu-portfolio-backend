import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — allow your portfolio frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      process.env.FRONTEND_URL || 'https://dipanshu-portfolio.vercel.app',
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-session-id'],
  });

  // Global validation pipe — strips unknown fields, validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Swagger API docs at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Dipanshu Sharma — Portfolio API')
    .setDescription('Backend for analytics, resume tracking, and contact form')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'dashboard-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Portfolio backend running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
