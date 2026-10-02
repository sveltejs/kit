import { read } from '$app/server';
import file from './file.txt?url&no-inline';

export function GET() {
	return read(file);
}
