import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import type {Timestamp} from 'syncwave';

TimeAgo.addDefaultLocale(en);

const timeAgo = new TimeAgo('en-US');

export function timeSince(ts: Timestamp) {
    return timeAgo.format(new Date(ts));
}
