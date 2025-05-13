import type {Config, DataEffectScheduler} from './data-layer.js';
import type {EmailProvider} from './infrastructure.js';

export class EmailService {
    constructor(
        private readonly emailProvider: EmailProvider,
        private readonly scheduleEffect: DataEffectScheduler,
        private readonly config: Config
    ) {}

    scheduleSignInEmail(params: {email: string; code: string}) {
        this.scheduleEffect(async () => {
            await this.emailProvider.send({
                recipient: params.email,
                html: `<p>
                            Hi there!<br />
                            <br />
                            We noticed a request to sign into your Syncwave account.<br />
                            If this wasn't you, no worries—just ignore this email.<br />
                            <br />
                            Your one-time code is (expires in 10 minutes): <strong>${params.code}</strong><br />
                            <br />
                            Have a great day!<br />
                            The Syncwave Team
                        </p>`,
                subject: 'Your Syncwave Account Sign-In Code',
                text: `Hi there!
            
We noticed a request to sign into your Syncwave account. If this wasn't you, no worries—just ignore this email.

Your one-time code is (expires in 10 minutes): ${params.code}

Have a great day!
The Syncwave Team`,
            });
        });
    }

    scheduleInviteEmail(params: {
        uiUrl: string;
        email: string;
        boardName: string;
        boardKey: string;
    }) {
        this.scheduleEffect(async () => {
            const boardUrl = `${params.uiUrl}b/${params.boardKey}`;

            const subject = `You got invited to the board ${params.boardName}!`;
            await this.emailProvider.send({
                recipient: params.email,
                subject,
                // todo: generate capability link
                text: `You have been invited to join the board ${params.boardName} in Syncwave. Click on the link to accept the invitation: ${boardUrl}`,
                html: `<p>You have been invited to join the board ${params.boardName} in Syncwave. Click on the link to accept the invitation: <a href="${boardUrl}">${boardUrl}</a></p>`,
            });
        });
    }
}
