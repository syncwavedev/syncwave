import {Coordinator} from 'ground-data';
import {MsgpackrCodec} from 'ground-data/dist/esm/src/codec';
import {SqliteUint8KVStore} from './sqlite-kv-store';
import {WsTransportServer} from './ws-transport-server';

const isDarwin = process.platform === 'darwin';

async function launch() {
    const kvStore = await (isDarwin
        ? new SqliteUint8KVStore('./dev.sqlite')
        : import('./fdb-kv-store').then(x => new x.FoundationDBUint8KVStore()));

    const coordinator = new Coordinator(new WsTransportServer({port: 4567, codec: new MsgpackrCodec()}), kvStore);

    await coordinator.launch();

    process.once('SIGINT', () => coordinator.close());
}

launch()
    .then(() => {
        console.log('coordinator is running');
    })
    .catch(err => {
        console.error(err);
    });
