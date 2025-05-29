import {assertOneOf} from 'syncwave';

export type Stage = 'prod' | 'dev' | 'local' | 'self';

export function getStage(): Stage {
    return assertOneOf(
        process.env.STAGE,
        ['prod', 'dev', 'local', 'self'] as const,
        'invalid stage'
    );
}
