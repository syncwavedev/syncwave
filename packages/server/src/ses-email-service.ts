import {SendEmailCommand, SESClient} from '@aws-sdk/client-ses';
import type {EmailMessage, EmailService} from 'syncwave-data';

export class SesEmailService implements EmailService {
    private readonly ses: SESClient;

    constructor(region: string) {
        this.ses = new SESClient({
            region,
        });
    }

    async send({html, recipient, subject, text}: EmailMessage): Promise<void> {
        await this.ses.send(
            new SendEmailCommand({
                Destination: {
                    ToAddresses: [recipient],
                },
                Source: 'SyncWave <noreply@bridgex.dev>',
                Message: {
                    Subject: {
                        Data: subject,
                    },
                    Body: {
                        Text: {
                            Data: text,
                        },
                        Html: {
                            Data: html,
                        },
                    },
                },
            })
        );
    }
}
