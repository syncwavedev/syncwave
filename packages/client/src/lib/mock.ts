import type {Board, Task} from './models';

export const columns = ['To Do', 'In Progress', 'Done'];
export const tasks: Task[] = Array(1)
	.fill(null)
	.flatMap(() => [
		{
			id: 103,
			content: 'Build Board screen',
			column: 'To Do',
			user: 'Dima'
		},
		{
			id: 245,
			content: 'Data layer (Sync) v01',
			column: 'To Do',
			user: 'Dima'
		},
		{
			id: 367,
			content: 'Server is ready for basic use',
			column: 'To Do',
			user: 'Dima'
		},
		{
			id: 489,
			content: 'Auth',
			column: 'To Do',
			user: 'Andrei'
		},
		{
			id: 512,
			content: 'Mobile App Design 1.0',
			column: 'To Do',
			user: 'Andrei'
		},
		{
			id: 678,
			content: 'Setup web + server integration',
			column: 'In Progress',
			user: 'Dima'
		},
		{
			id: 789,
			content: 'Richtext',
			column: 'In Progress',
			user: 'Andrei'
		},
		{
			id: 891,
			content: 'We use Ground for Ground development internally (web + ios)',
			column: 'Done',
			user: 'Dima'
		},
		{
			id: 912,
			content: 'QA + Polish',
			column: 'Done',
			user: 'Dima'
		},
		{
			id: 934,
			content: 'Simple landing',
			column: 'Done',
			user: 'Andrei'
		},
		{
			id: 956,
			content: 'Release',
			column: 'Done',
			user: 'Andrei'
		},
		{
			id: 978,
			content: 'Github README',
			column: 'Done',
			user: 'Dima'
		},
		{
			id: 999,
			content: 'Choose domain',
			column: 'Done',
			user: 'Dima'
		}
	]);

export const boards: Board[] = [
	{
		id: 1,
		name: 'Ground Dev',
		lastAction: {
			user: 'John',
			action: 'Created new task',
			date: new Date('2024-01-15')
		}
	},

	{
		id: 3,
		name: 'Product Design',
		lastAction: {
			user: 'Mike',
			action: 'Completed task',
			date: new Date('2024-12-19')
		}
	},
	{
		id: 4,
		name: 'Marketing Strategy',
		lastAction: {
			user: 'Emma',
			action: 'Updated timeline',
			date: new Date('2024-12-18')
		}
	},
	{
		id: 5,
		name: 'Website Redesign',
		lastAction: {
			user: 'Oliver',
			action: 'Added new milestone',
			date: new Date('2024-12-17')
		}
	},
	{
		id: 6,
		name: 'Mobile App Dev',
		lastAction: {
			user: 'Sophia',
			action: 'Merged pull request',
			date: new Date('2024-12-20')
		}
	},
	{
		id: 7,
		name: 'Content Calendar',
		lastAction: {
			user: 'Lucas',
			action: 'Scheduled post',
			date: new Date('2024-12-15')
		}
	},
	{
		id: 8,
		name: 'User Research',
		lastAction: {
			user: 'Ava',
			action: 'Added survey results',
			date: new Date('2024-12-19')
		}
	},
	{
		id: 9,
		name: 'Sales Pipeline',
		lastAction: {
			user: 'William',
			action: 'Updated leads',
			date: new Date('2024-12-16')
		}
	},
	{
		id: 10,
		name: 'HR Planning',
		lastAction: {
			user: 'Isabella',
			action: 'Posted new position',
			date: new Date('2024-12-17')
		}
	},
	{
		id: 11,
		name: 'Budget Analysis',
		lastAction: {
			user: 'James',
			action: 'Updated Q1 forecast',
			date: new Date('2024-12-18')
		}
	},
	{
		id: 12,
		name: 'Social Media',
		lastAction: {
			user: 'Charlotte',
			action: 'Created campaign',
			date: new Date('2024-12-20')
		}
	},
	{
		id: 13,
		name: 'Customer Support',
		lastAction: {
			user: 'Benjamin',
			action: 'Resolved ticket',
			date: new Date('2024-12-15')
		}
	},
	{
		id: 14,
		name: 'Quality Assurance',
		lastAction: {
			user: 'Mia',
			action: 'Completed testing',
			date: new Date('2024-12-19')
		}
	},
	{
		id: 15,
		name: 'Infrastructure',
		lastAction: {
			user: 'Ethan',
			action: 'Deployed update',
			date: new Date('2024-12-16')
		}
	},
	{
		id: 16,
		name: 'Legal Review',
		lastAction: {
			user: 'Amelia',
			action: 'Updated documents',
			date: new Date('2024-12-17')
		}
	},
	{
		id: 17,
		name: 'Partner Relations',
		lastAction: {
			user: 'Alexander',
			action: 'Scheduled meeting',
			date: new Date('2024-12-18')
		}
	},
	{
		id: 18,
		name: 'Event Planning',
		lastAction: {
			user: 'Harper',
			action: 'Booked venue',
			date: new Date('2024-12-20')
		}
	}
];
