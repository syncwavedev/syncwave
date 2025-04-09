import type {EmailMessage, EmailService} from './infrastructure.js';

export class MemEmailService implements EmailService {
    outbox: EmailMessage[] = [];

    async send(message: EmailMessage): Promise<void> {
        this.outbox.push(message);
    }
}
