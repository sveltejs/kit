import fs from 'node:fs';
import path from 'node:path';

export function GET() {
	return new Response(fs.readFileSync(path.join(process.cwd(), 'asset.txt'), 'utf8'));
}
