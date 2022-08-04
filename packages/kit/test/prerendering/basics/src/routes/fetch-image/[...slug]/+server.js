import * as fs from 'fs';

export async function GET({ params }) {
	const slug = params.slug.split('/');
	const extension = slug[0].split('.').pop();

	const file = fs.readFileSync(`./static/image.${extension}`);

	throw new Error("@migration task: Migrate this return statement (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292701)");
	// Suggestion (check for correctness before using):
	// return new Response(JSON.stringify(file), {
	// 	headers: 'content-type': 'application/json; charset=utf-8',
	// 		
	// 		'Content-Type': 'image/' + extension
	// 	}
	// });
	return {
		status: 200,
		headers: {
			'Content-Type': 'image/' + extension
		},
		body: file
	};
}
