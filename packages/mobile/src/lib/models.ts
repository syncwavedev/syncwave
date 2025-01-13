export interface Board {
	id: number;
	name: string;
	username: string;
	avatar?: string;
	lastAction: {
		user: string;
		action: string;
		date: Date;
	};
}

export interface Task {
	id: number;
	content: string;
	column: string;
	user: string;
}

export interface Column {
	name: string;
}
