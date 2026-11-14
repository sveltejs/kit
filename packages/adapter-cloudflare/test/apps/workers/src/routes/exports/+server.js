import * as workers from 'cloudflare:workers';
import { json } from '@sveltejs/kit';

export function GET() {
	return json(Object.keys(workers));
}
