<script lang="ts">
    import './app.css';
    import {Button} from '$lib/components/ui/button';
    import {participant} from './participant.js';
    import {assert, ConsoleLogger, createBoardId, createTaskId} from 'ground-data';
    import {ModeWatcher} from 'mode-watcher';

    (async () => {
        await participant.signUp('tilyupo@gmail.com', '123456');
        const token = await participant.signIn('tilyupo@gmail.com', '123456');
        assert(token.type === 'success');
        participant.authenticate(token.token);

        // await participant.db.createBoard({
        //     boardId: createBoardId(),
        //     name: 'test',
        //     slug: 'super slug 10',
        // });
        const me = await participant.db.getMe({});
        const board = await participant.db.getMyBoards({});
        console.log({board});
    })();
</script>

<ModeWatcher />
<main>
    <div class="card">
        <Button>Hello</Button>
    </div>
</main>

<style>
</style>
