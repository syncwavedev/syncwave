import {SendEmailCommand, SESClient} from '@aws-sdk/client-ses';
import {EmailService} from 'ground-data';

export class SesEmailService implements EmailService {
    private readonly ses: SESClient;

    constructor(region: string) {
        this.ses = new SESClient({
            region,
        });
    }

    async send(recipientEmail: string, text: string): Promise<void> {
        await this.ses.send(
            new SendEmailCommand({
                Destination: {
                    ToAddresses: [recipientEmail],
                },
                Source: 'Ground <noreply@edme.io>',
                Message: {
                    Subject: {
                        Data: 'Sign in into your account',
                    },
                    Body: {
                        Text: {
                            Data: text,
                        },
                    },
                },
            })
        );
    }
}
