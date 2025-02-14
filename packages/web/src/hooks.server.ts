import {CancelledError, log, toError} from 'syncwave-data';

process.on('unhandledRejection', reason => {
	if (reason instanceof CancelledError) {
		log.info('unhandled cancellation');
		return;
	}

	log.error(toError(reason), 'unhandled rejection');
});
