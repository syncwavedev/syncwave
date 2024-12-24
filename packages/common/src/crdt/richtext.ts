import Delta, {AttributeMap} from 'quill-delta';

export class Richtext {
    private delta = new Delta();

    insert(index: number, content: string, formattingAttributes?: AttributeMap) {
        this.applyDelta(new Delta().retain(index).insert(content, formattingAttributes));
    }

    delete(index: number, length: number) {
        this.applyDelta(new Delta().retain(index).delete(length));
    }

    format(index: number, length: number, formattingAttributes: AttributeMap) {
        this.applyDelta(new Delta().retain(index).retain(length, formattingAttributes));
    }

    applyDelta(delta: Delta) {
        this.delta = this.delta.compose(delta);
    }

    get length(): number {
        return this.delta.length();
    }

    toString(): string {
        return this.delta.ops.map(x => x.insert ?? '').join('');
    }

    toDelta(): Delta {
        return this.delta.compose(new Delta());
    }
}
