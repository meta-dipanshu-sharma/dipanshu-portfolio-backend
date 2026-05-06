import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalPageViews,
      pageViewsLast30Days,
      pageViewsLast7Days,
      totalResumeDownloads,
      downloadsLast30Days,
      totalContactMessages,
      pendingMessages,
      totalEvents,
      recentMessages,
    ] = await Promise.all([
      this.prisma.pageView.count(),
      this.prisma.pageView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.pageView.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.resumeDownload.count(),
      this.prisma.resumeDownload.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.contactMessage.count({ where: { status: { not: 'SPAM' } } }),
      this.prisma.contactMessage.count({ where: { status: 'PENDING' } }),
      this.prisma.analyticsEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.contactMessage.findMany({
        where: { status: { not: 'SPAM' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, company: true, subject: true, status: true, createdAt: true },
      }),
    ]);

    return {
      pageViews: {
        total: totalPageViews,
        last30Days: pageViewsLast30Days,
        last7Days: pageViewsLast7Days,
      },
      resumeDownloads: {
        total: totalResumeDownloads,
        last30Days: downloadsLast30Days,
      },
      contactMessages: {
        total: totalContactMessages,
        pending: pendingMessages,
        recent: recentMessages,
      },
      events: {
        last30Days: totalEvents,
      },
    };
  }

  async getTopCountries() {
    const views = await this.prisma.pageView.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
      where: { country: { not: null } },
    });

    return (views as any[]).map((v) => ({
      country: v.country,
      visits: v._count?.id ?? 0,
    }));
  }

  async getTopSections() {
    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['payload'],
      _count: { id: true },
      where: { eventType: 'section_view' },
    });

    // payload is Json, extract section name
    const sections = (events as any[]).reduce<Record<string, number>>((acc, e) => {
      const payload = e.payload as any;
      const section = payload?.section;
      if (section) {
        acc[section] = (acc[section] || 0) + (e._count?.id ?? 0);
      }
      return acc;
    }, {});

    return Object.entries(sections)
      .map(([section, views]) => ({ section, views }))
      .sort((a, b) => b.views - a.views);
  }

  async getTopChatbotQuestions() {
    const events = await this.prisma.analyticsEvent.findMany({
      where: { eventType: 'chatbot_question' },
      select: { payload: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Extract questions from payload
    const questions = events
      .map((e) => {
        const payload = e.payload as any;
        return payload?.question as string;
      })
      .filter(Boolean);

    // Count frequency
    const freq = questions.reduce<Record<string, number>>((acc, q) => {
      acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(freq)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  async getDailyVisits(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const views = await this.prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped = views.reduce<Record<string, number>>((acc, v) => {
      const date = v.createdAt.toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, visits]) => ({ date, visits }));
  }

  async getDeviceBreakdown() {
    const views = await this.prisma.pageView.groupBy({
      by: ['device'],
      _count: { id: true },
      where: { device: { not: null } },
    });

    return (views as any[]).map((v) => ({
      device: v.device || 'unknown',
      count: v._count?.id ?? 0,
    }));
  }

  async getReferrers() {
    const views = await this.prisma.pageView.groupBy({
      by: ['referrer'],
      _count: { id: true },
      where: { referrer: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return (views as any[]).map((v) => ({
      referrer: v.referrer,
      visits: v._count?.id ?? 0,
    }));
  }
}
