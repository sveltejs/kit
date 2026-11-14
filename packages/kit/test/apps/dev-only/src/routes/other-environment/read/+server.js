import { read } from '$app/server';
import binary from './file.bin?url';
import logo from './logo.svg?no-inline';

export function GET({ url }) {
	return read(url.searchParams.has('svg') ? logo : binary);
}
