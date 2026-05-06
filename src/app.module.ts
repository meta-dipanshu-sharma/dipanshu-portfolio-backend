import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ResumeModule } from './resume/resume.module';
import { ContactModule } from './contact/contact.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — 60 requests per minute per IP globally
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Shared DB
    PrismaModule,

    // Features
    AnalyticsModule,
    ResumeModule,
    ContactModule,
    DashboardModule,
  ],
})
export class AppModule {}
