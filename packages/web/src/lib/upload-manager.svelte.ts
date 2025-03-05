import {
	type AttachmentDto,
	type BoardId,
	type CardId,
	type ParticipantClient,
} from 'syncwave-data';

export interface UploadRequest {
	files: File[];
	boardId: BoardId;
	cardId: CardId;
}

export class UploadManager {
	constructor(private readonly client: ParticipantClient) {}

	async upload({files, cardId}: UploadRequest): Promise<AttachmentDto[]> {
		const result: AttachmentDto[] = [];
		for (const file of files) {
			const attachment = await this.client.rpc.createAttachment({
				cardId,
				contentType: file.type || 'application/octet-stream',
				data: new Uint8Array(await file.arrayBuffer()),
				fileName: file.name,
			});
			result.push(attachment);
		}

		return result;
	}
}
