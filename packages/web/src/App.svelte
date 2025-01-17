<script lang="ts">
    import Counter from './lib/Counter.svelte';
    import {participant} from './participant';
    import {assert, ConsoleLogger, createBoardId, createTaskId} from 'ground-data';

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

<main>
    <div class="card">
        <Counter />
    </div>
</main>

<style>
    .logo {
        height: 6em;
        padding: 1.5em;
        will-change: filter;
        transition: filter 300ms;
    }
    .logo:hover {
        filter: drop-shadow(0 0 2em #646cffaa);
    }
    .logo.svelte:hover {
        filter: drop-shadow(0 0 2em #ff3e00aa);
    }
    .read-the-docs {
        color: #888;
    }
</style>
