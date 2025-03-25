import {SendEmailCommand, SESClient} from '@aws-sdk/client-ses';
import {log, type EmailMessage, type EmailService} from 'syncwave-data';

export class SesEmailService implements EmailService {
    private readonly ses: SESClient;

    constructor(region: string) {
        this.ses = new SESClient({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
    }

    async send({html, recipient, subject, text}: EmailMessage): Promise<void> {
        log.info(`Sending email to ${recipient} with subject: ${subject}`);

        await this.ses.send(
            new SendEmailCommand({
                Destination: {
                    ToAddresses: [recipient],
                },
                Source: 'SyncWave <noreply@syncwave.dev>',
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
