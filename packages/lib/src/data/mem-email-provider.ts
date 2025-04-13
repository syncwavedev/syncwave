import type {EmailMessage, EmailProvider} from './infrastructure.js';

export class MemEmailProvider implements EmailProvider {
    outbox: EmailMessage[] = [];

    async send(message: EmailMessage): Promise<void> {
        this.outbox.push(message);
    }
}
