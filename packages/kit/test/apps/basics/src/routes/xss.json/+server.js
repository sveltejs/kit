import { json } from '@sveltejs/kit';

export function GET() {
	return json({
		name: '</script><script>window.pwned = 1</script>'
	});
}
