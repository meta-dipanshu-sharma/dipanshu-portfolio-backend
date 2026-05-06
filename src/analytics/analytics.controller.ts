import { Controller, Post, Body, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { TrackPageViewDto, TrackEventDto } from './analytics.dto';
import { Request } from 'express';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('pageview')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 30 } }) // 30 page views per minute per IP
  @ApiOperation({ summary: 'Track a page view' })
  @ApiResponse({ status: 200, description: 'Tracked successfully' })
  trackPageView(@Body() dto: TrackPageViewDto, @Req() req: Request) {
    return this.analyticsService.trackPageView(dto, req);
  }

  @Post('event')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 60 } }) // 60 events per minute per IP
  @ApiOperation({ summary: 'Track a custom event (section scroll, CTA click, chatbot use)' })
  @ApiResponse({ status: 200, description: 'Tracked successfully' })
  trackEvent(@Body() dto: TrackEventDto, @Req() req: Request) {
    return this.analyticsService.trackEvent(dto, req);
  }
}
