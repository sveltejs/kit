import { Marker, state } from '../../lib/state.js';

export function GET() {
	return Response.json({
		worker_requests: state.worker_requests,
		marker: state.marker instanceof Marker
	});
}
