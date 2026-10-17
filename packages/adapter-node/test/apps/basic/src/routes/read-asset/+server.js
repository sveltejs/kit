import { read } from '$app/server';
import asset from './asset.txt?url&no-inline';

export function GET() {
	return read(asset);
}
