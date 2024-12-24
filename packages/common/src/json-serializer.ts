import {Serializer} from './contracts/serializer';

export class JsonSerializer implements Serializer<number, string> {
    encode(data: number): string {
        return JSON.stringify(data);
    }

    decode(encoding: string): number {
        return JSON.parse(encoding);
    }
}
