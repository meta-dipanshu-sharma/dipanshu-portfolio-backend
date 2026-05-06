import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ContactQueueService } from './contact.queue';
import { CreateContactDto } from './contact.dto';
import { Request } from 'express';
import * as crypto from 'crypto';

// Simple in-memory spam guard — tracks submissions per hashed IP
// For production scale you'd move this to Redis
const recentSubmissions = new Map<string, number[]>();

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private prisma: PrismaService,
    private queue: ContactQueueService,
  ) {}

  async submit(dto: CreateContactDto, req: Request) {
    // Hash the IP — store the hash, not the raw IP (privacy best practice)
    const ip = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

    // Spam check: max 3 submissions per IP per hour
    if (this.isSpam(ipHash)) {
      this.logger.warn(`Spam detected from hash ${ipHash}`);
      throw new BadRequestException('Too many submissions. Please try again later.');
    }

    // Basic content spam check
    if (this.containsSpamPatterns(dto.message)) {
      this.logger.warn(`Spam content detected in message from ${dto.email}`);
      // Store as SPAM but return success — don't tip off the spammer
      await this.prisma.contactMessage.create({
        data: { ...dto, status: 'SPAM', ipHash },
      });
      return { success: true, message: 'Thank you! Your message has been received.' };
    }

    // Store in DB
    const saved = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email,
        company: dto.company || null,
        subject: dto.subject || null,
        message: dto.message,
        status: 'PENDING',
        ipHash,
      },
    });

    this.logger.log(`Contact message ${saved.id} saved from ${dto.email}`);

    // Add to queue — email is sent asynchronously
    await this.queue.enqueue({
      messageId: saved.id,
      name: dto.name,
      email: dto.email,
      company: dto.company,
      subject: dto.subject,
      message: dto.message,
      receivedAt: saved.createdAt.toISOString(),
    });

    this.logger.log(`Contact message ${saved.id} queued for email delivery`);

    return {
      success: true,
      id: saved.id,
      message: "Thank you! I'll get back to you within 24 hours.",
    };
  }

  private isSpam(ipHash: string): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const submissions = recentSubmissions.get(ipHash) || [];

    // Keep only submissions within the last hour
    const recent = submissions.filter((t) => now - t < oneHour);
    recent.push(now);
    recentSubmissions.set(ipHash, recent);

    return recent.length > 3;
  }

  private containsSpamPatterns(text: string): boolean {
    const spamPatterns = [
      /\b(viagra|casino|lottery|winner|crypto|bitcoin|investment|forex)\b/i,
      /https?:\/\/\S+\s+https?:\/\/\S+/i, // multiple URLs
      /(.)\1{10,}/, // 10+ repeated characters
    ];
    return spamPatterns.some((p) => p.test(text));
  }
}
