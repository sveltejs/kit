export async function handle({ event, resolve }) {
	console.log('handle called');
	console.log(event);

	// if (Math.random() > 0.5) {
	// 	console.log('rejecting socket connection')
	// 	return event.socket.reject(401, { message: 'Unauthorized' });
	// }else {
	// 	console.log('accepting socket connection')
	// 	return event.socket.accept();
	// }

	return await resolve(event);
}
