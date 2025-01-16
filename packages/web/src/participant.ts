import {Participant, ReconnectConnection} from 'ground-data';
import {MsgpackrCodec} from '../../data/dist/esm/src/codec';
import {WsTransportClient} from './ws-transport-client';

function createParticipant() {
    const transport = new WsTransportClient({url: 'ws://localhost:4567', codec: new MsgpackrCodec()});
    const connection = new ReconnectConnection(transport);
    const participant = new Participant(connection);

    return participant;
}

export const participant = createParticipant();
