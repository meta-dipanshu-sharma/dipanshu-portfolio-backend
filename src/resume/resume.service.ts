import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private extractGeo(req: Request) {
    return {
      country: (req.headers['x-vercel-ip-country'] as string) || null,
      city: (req.headers['x-vercel-ip-city'] as string) || null,
    };
  }

  async logAndGetResumeUrl(sessionId: string | undefined, req: Request) {
    const { country, city } = this.extractGeo(req);
    const userAgent = req.headers['user-agent'] || null;
    const referrer = (req.headers['referer'] as string) || null;

    // Detect device from user agent
    const device = this.detectDevice(userAgent);

    // Log the download
    const download = await this.prisma.resumeDownload.create({
      data: {
        sessionId: sessionId || null,
        referrer,
        country,
        city,
        device,
        userAgent,
      },
    });

    this.logger.log(
      `Resume downloaded — country: ${country || 'unknown'}, referrer: ${referrer || 'direct'}`,
    );

    // Return the actual resume URL — stored in env so you can update it without redeploying
    const resumeUrl =
      this.config.get<string>('RESUME_URL') ||
      'https://dipanshu-portfolio.vercel.app/DipanshuSharmaResume.pdf';

    return {
      id: download.id,
      url: resumeUrl,
      tracked: true,
    };
  }

  async getDownloadCount(): Promise<number> {
    return this.prisma.resumeDownload.count();
  }

  private detectDevice(userAgent: string | null): string {
    if (!userAgent) return 'unknown';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }
}
