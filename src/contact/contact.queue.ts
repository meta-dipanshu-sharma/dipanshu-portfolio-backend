import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from './email.service';

export const CONTACT_QUEUE = 'contact-notifications';

export interface ContactJobData {
  messageId: string;
  name: string;
  email: string;
  company?: string;
  subject?: string;
  message: string;
  receivedAt: string;
}

@Injectable()
export class ContactQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContactQueueService.name);
  private queue: Queue;
  private worker: Worker;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  onModuleInit() {
    const connection = {
      host: this.config.get<string>('REDIS_HOST') || 'localhost',
      port: parseInt(this.config.get<string>('REDIS_PORT') || '6379'),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      tls: this.config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
    };

    // Create the queue
    this.queue = new Queue(CONTACT_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,           // retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000,         // 5s, 10s, 20s between retries
        },
        removeOnComplete: 100, // keep last 100 completed jobs
        removeOnFail: 50,      // keep last 50 failed jobs
      },
    });

    // Create the worker that processes jobs
    this.worker = new Worker(
      CONTACT_QUEUE,
      async (job: Job<ContactJobData>) => {
        await this.processContactJob(job);
      },
      { connection, concurrency: 2 },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed — message ${job.data.messageId} sent`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Contact queue worker started');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue(data: ContactJobData): Promise<string> {
    const job = await this.queue.add('send-notification', data, {
      priority: 1,
    });
    this.logger.log(`Enqueued contact job ${job.id} for message ${data.messageId}`);
    return job.id;
  }

  private async processContactJob(job: Job<ContactJobData>) {
    const { messageId } = job.data;

    this.logger.log(`Processing contact job for message ${messageId} (attempt ${job.attemptsMade + 1})`);

    // Mark as processing
    await this.prisma.contactMessage.update({
      where: { id: messageId },
      data: { status: 'PROCESSING' },
    });

    // Send notification email to Dipanshu
    const sent = await this.emailService.sendContactNotification({
      id: job.data.messageId,
      name: job.data.name,
      email: job.data.email,
      company: job.data.company,
      subject: job.data.subject,
      message: job.data.message,
      receivedAt: new Date(job.data.receivedAt),
    });

    if (!sent) {
      // Mark as failed — BullMQ will retry
      await this.prisma.contactMessage.update({
        where: { id: messageId },
        data: { status: 'FAILED' },
      });
      throw new Error('Email delivery failed — will retry');
    }

    // Mark as sent + send confirmation to the visitor
    await this.prisma.contactMessage.update({
      where: { id: messageId },
      data: { status: 'SENT', emailSentAt: new Date() },
    });

    // Send confirmation to the person who reached out (non-blocking)
    this.emailService.sendContactConfirmation({
      id: job.data.messageId,
      name: job.data.name,
      email: job.data.email,
      company: job.data.company,
      subject: job.data.subject,
      message: job.data.message,
      receivedAt: new Date(job.data.receivedAt),
    }).catch(() => {
      // Intentionally swallow — confirmation is best-effort
    });
  }
}
