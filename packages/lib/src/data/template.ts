export interface CardTemplate {
    html: string;
    messages: MessageTemplate[];
}

export interface ColumnTemplate {
    name: string;
    cards: CardTemplate[];
}

export interface BoardTemplate {
    columns: ColumnTemplate[];
}

export interface MessageTemplate {
    html: string;
}

export const BOARD_ONBOARDING_TEMPLATE: BoardTemplate = {
    columns: [
        {
            name: 'Backlog',
            cards: [
                {
                    html: `
                        <p>Welcome to Syncwave!</p>
                        <ul>
                            <li><b>Syncwave</b> is a collaborative tool for managing your projects.</li>
                            <li>Use it to track tasks, share ideas, and collaborate with your team.</li>
                            <li>Get started by creating a new board or joining an existing one.</li>
                            <li>Invite your team members to collaborate with you.</li>
                        </ul>
                        <p>Click on the <i>"Create Board"</i> button to get started.</p>
                    `,
                    messages: [
                        {
                            html: '<p>We are glad to have you here.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'To Do',
            cards: [
                {
                    html: "<p>Let's get started!</p>",
                    messages: [
                        {
                            html: '<p>Here are some tips to get you started.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'In Progress',
            cards: [
                {
                    html: '<p>Keep going!</p>',
                    messages: [
                        {
                            html: '<p>You are doing great!</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'Done',
            cards: [
                {
                    html: '<p>Congratulations!</p>',
                    messages: [
                        {
                            html: '<p>You have completed the onboarding process.</p>',
                        },
                    ],
                },
            ],
        },
    ],
};

export const NEW_BOARD_TEMPLATE: BoardTemplate = {
    columns: [
        {
            name: 'Backlog',
            cards: [
                {
                    html: `
                        <p>Welcome to Syncwave!</p>
                        <ul>
                            <li><b>Syncwave</b> is a collaborative tool for managing your projects.</li>
                            <li>Use it to track tasks, share ideas, and collaborate with your team.</li>
                            <li>Get started by creating a new board or joining an existing one.</li>
                            <li>Invite your team members to collaborate with you.</li>
                        </ul>
                        <p>Click on the <i>"Create Board"</i> button to get started.</p>
                    `,
                    messages: [
                        {
                            html: '<p>We are glad to have you here.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'To Do',
            cards: [
                {
                    html: "<p>Let's get started!</p>",
                    messages: [
                        {
                            html: '<p>Here are some tips to get you started.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'In Progress',
            cards: [
                {
                    html: '<p>Keep going!</p>',
                    messages: [
                        {
                            html: '<p>You are doing great!</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'Done',
            cards: [
                {
                    html: '<p>Congratulations!</p>',
                    messages: [
                        {
                            html: '<p>You have completed the onboarding process.</p>',
                        },
                    ],
                },
            ],
        },
    ],
};

export const BOARD_DEMO_TEMPLATE: BoardTemplate = {
    columns: [
        {
            name: 'Backlog',
            cards: [
                {
                    html: '<p>Welcome to the demo board!</p>',
                    messages: [
                        {
                            html: '<p>This is a demo board to showcase Syncwave features.</p>',
                        },
                    ],
                },
            ],
        },
        {
            name: 'To Do',
            cards: [],
        },
        {
            name: 'In Progress',
            cards: [],
        },
        {
            name: 'Done',
            cards: [],
        },
    ],
};
