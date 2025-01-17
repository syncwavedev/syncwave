import {Buffer} from 'buffer';

// we need Buffer polyfill for bytewise package
globalThis.Buffer = Buffer;
