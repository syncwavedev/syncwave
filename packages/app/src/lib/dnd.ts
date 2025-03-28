import {assert, toPosition, type BigFloat} from 'syncwave';

export function findMoved<TId>(
	before: TId[],
	after: TId[]
): {target: TId; prev: TId | undefined; next: TId | undefined} | undefined {
	// case 1: Item is removed (if the "before" array has more items than "after")
	if (before.length > after.length) {
		return undefined;
	}

	// case 2: Item is added (if the "after" array has more items than "before")
	if (before.length < after.length) {
		const addedId = after.find(id => !before.includes(id));
		assert(
			addedId !== undefined,
			'board item added but not found: ' + JSON.stringify({before, after})
		);
		const indexAddedInAfter = after.indexOf(addedId);
		const prev = after[indexAddedInAfter - 1];
		const next = after[indexAddedInAfter + 1];
		return {target: addedId, prev, next};
	}

	// case 3: Item is moved (both arrays have the same length)
	const beforeIndexMap = new Map(before.map((id, index) => [id, index]));

	let lowerBound = -1;
	for (let i = 0; i < after.length; i++) {
		const beforeIndex = beforeIndexMap.get(after[i])!;
		assert(beforeIndex !== undefined, 'board item moved but not found');
		if (i !== beforeIndex) {
			lowerBound = i;
			break;
		}
	}

	let upperBound = after.length;
	for (let i = after.length - 1; i >= 0; i--) {
		const beforeIndex = beforeIndexMap.get(after[i])!;
		assert(beforeIndex !== undefined, 'board item moved but not found');
		if (i !== beforeIndex) {
			upperBound = i;
			break;
		}
	}

	if (lowerBound === -1 || upperBound === after.length) {
		// no item moved
		return undefined;
	}

	let movedId: TId;
	let prev: TId;
	let next: TId;

	if (beforeIndexMap.get(after[lowerBound]) === lowerBound + 1) {
		movedId = after[upperBound];
		prev = after[upperBound - 1];
		next = after[upperBound + 1];
	} else {
		movedId = after[lowerBound];
		prev = after[lowerBound - 1];
		next = after[lowerBound + 1];
	}

	return {target: movedId, prev, next};
}

function toIds<T extends {pk: [unknown]}>(items: T[]): T['pk'][0][] {
	return items.map(item => item.pk[0]);
}

export function calculateChange<T extends {pk: [unknown]; id: unknown}>(
	localItems: T[],
	dndItems: T[],
	newDndItems: T[],
	getPosition: (item: T | undefined) => BigFloat | undefined
): {target: T['pk'][0]; newPosition: BigFloat} | undefined {
	const moved = findMoved(toIds(dndItems), toIds(newDndItems));

	if (!moved) {
		return undefined;
	}

	const {target, prev, next} = moved;
	const prevAnchor = localItems.find(x => x.id === prev);
	const nextAnchor = localItems.find(x => x.id === next);

	const newTargetPosition = toPosition({
		next: getPosition(nextAnchor),
		prev: getPosition(prevAnchor),
	});

	return {target, newPosition: newTargetPosition};
}
