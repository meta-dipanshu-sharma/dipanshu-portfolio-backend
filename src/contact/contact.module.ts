import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactQueueService } from './contact.queue';
import { EmailService } from './email.service';

@Module({
  controllers: [ContactController],
  providers: [ContactService, ContactQueueService, EmailService],
  exports: [ContactService],
})
export class ContactModule {}
