// a bare (non `node:`-prefixed) built-in import, as found in many dependencies
import { createHash } from 'crypto';

export function GET() {
	return new Response(createHash('sha256').update('hello').digest('hex'));
}
