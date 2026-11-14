import { read } from '$app/server';
// not inlined, so that read reads it from the server
import logo from '../logo.svg?no-inline';

export function GET() {
	return read(logo);
}
