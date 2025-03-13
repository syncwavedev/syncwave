import {describe, expect, it} from 'vitest';
import {findMoved} from './dnd';

describe('dnd', () => {
	interface Testcase {
		name: string;
		before: number[];
		after: number[];
		expected:
			| {
					target: number;
					prev: number | undefined;
					next: number | undefined;
			  }
			| undefined;
	}

	const testcases: Testcase[] = [
		{
			name: 'detects removal',
			before: [1, 2, 3],
			after: [1, 2],
			expected: undefined,
		},
		{
			name: 'detects addition (case: end)',
			before: [1, 2],
			after: [1, 2, 3],
			expected: {target: 3, prev: 2, next: undefined},
		},
		{
			name: 'detects addition (case: middle)',
			before: [1, 3],
			after: [1, 2, 3],
			expected: {target: 2, prev: 1, next: 3},
		},
		{
			name: 'detects addition (case: start)',
			before: [2, 3],
			after: [1, 2, 3],
			expected: {target: 1, prev: undefined, next: 2},
		},
		{
			name: 'detects move (case: start => middle)',
			before: [1, 2, 3, 4, 5],
			after: [2, 3, 1, 4, 5],
			expected: {target: 1, prev: 3, next: 4},
		},
		{
			name: 'detects move (case: middle => end)',
			before: [1, 2, 3, 4, 5],
			after: [1, 2, 4, 5, 3],
			expected: {target: 3, prev: 5, next: undefined},
		},
		{
			name: 'detects move (case: end => start)',
			before: [1, 2, 3, 4, 5],
			after: [5, 1, 2, 3, 4],
			expected: {target: 5, prev: undefined, next: 1},
		},
		{
			name: 'detects move (case: middle => start)',
			before: [1, 2, 3, 4, 5],
			after: [1, 3, 4, 2, 5],
			expected: {target: 2, prev: 4, next: 5},
		},
		{
			name: 'detects move (case: end => middle)',
			before: [1, 2, 3, 4, 5],
			after: [1, 2, 5, 3, 4],
			expected: {target: 5, prev: 2, next: 3},
		},
		{
			name: 'detects no move',
			before: [1, 2, 3],
			after: [1, 2, 3],
			expected: undefined,
		},
		{
			name: 'detects no move',
			before: [1, 2, 3],
			after: [1, 2, 3],
			expected: undefined,
		},
	];

	testcases.forEach(({name, before, after, expected}) =>
		it(name, () => {
			expect(findMoved(before, after)).toEqual(expected);
		})
	);
});
