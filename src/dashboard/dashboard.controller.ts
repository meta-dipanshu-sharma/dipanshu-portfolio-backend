import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardGuard } from '../common/guards/dashboard.guard';

@ApiTags('Dashboard (Private)')
@ApiSecurity('dashboard-key')
@UseGuards(DashboardGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Overview stats — page views, downloads, contacts' })
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('countries')
  @ApiOperation({ summary: 'Top countries by page views' })
  getTopCountries() {
    return this.dashboardService.getTopCountries();
  }

  @Get('sections')
  @ApiOperation({ summary: 'Most viewed portfolio sections' })
  getTopSections() {
    return this.dashboardService.getTopSections();
  }

  @Get('chatbot')
  @ApiOperation({ summary: 'Most asked chatbot questions' })
  getTopChatbotQuestions() {
    return this.dashboardService.getTopChatbotQuestions();
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily visit counts for the last N days' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default 30)' })
  getDailyVisits(@Query('days') days?: string) {
    return this.dashboardService.getDailyVisits(parseInt(days || '30'));
  }

  @Get('devices')
  @ApiOperation({ summary: 'Device breakdown (mobile / tablet / desktop)' })
  getDeviceBreakdown() {
    return this.dashboardService.getDeviceBreakdown();
  }

  @Get('referrers')
  @ApiOperation({ summary: 'Top referrers — where visitors come from' })
  getReferrers() {
    return this.dashboardService.getReferrers();
  }
}
