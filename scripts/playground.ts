import {Channel} from 'async-channel';

const chan = new Channel(0);

(async () => {
    console.log('start');
    await new Promise(resolve => setTimeout(resolve, 100));
    let success = false;
    while (!success) {
        try {
            for await (const item of chan) {
                console.log(item);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            success = true;
        } catch (err) {
            console.error(err);
        }
    }
})().catch(err => {
    console.error(err);
});

for (let i = 0; i < 10; i += 1) {
    console.log('push', i);
    await chan.push(i);
}

await chan.throw('custom error');

console.log('push', 4);
await chan.push(4);
