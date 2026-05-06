import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TrackPageViewDto, TrackEventDto } from './analytics.dto';
import { Request } from 'express';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Extracts geo info from Vercel's request headers.
   * Vercel automatically injects x-vercel-ip-country and x-vercel-ip-city.
   */
  private extractGeo(req: Request) {
    return {
      country: (req.headers['x-vercel-ip-country'] as string) || null,
      city: (req.headers['x-vercel-ip-city'] as string) || null,
    };
  }

  private extractUserAgent(req: Request) {
    return req.headers['user-agent'] || null;
  }

  async trackPageView(dto: TrackPageViewDto, req: Request) {
    const { country, city } = this.extractGeo(req);
    const userAgent = this.extractUserAgent(req);

    const view = await this.prisma.pageView.create({
      data: {
        sessionId: dto.sessionId,
        path: dto.path,
        referrer: dto.referrer || (req.headers['referer'] as string) || null,
        userAgent,
        country,
        city,
        device: dto.device || null,
      },
    });

    this.logger.log(`Page view: ${dto.path} [${country || 'unknown'}]`);
    return { tracked: true, id: view.id };
  }

  async trackEvent(dto: TrackEventDto, req: Request) {
    const { country } = this.extractGeo(req);

    const event = await this.prisma.analyticsEvent.create({
      data: {
        sessionId: dto.sessionId,
        eventType: dto.eventType,
        payload: dto.payload || {},
        country,
        device: dto.device || null,
      },
    });

    this.logger.log(`Event: ${dto.eventType} [${country || 'unknown'}]`);
    return { tracked: true, id: event.id };
  }
}
