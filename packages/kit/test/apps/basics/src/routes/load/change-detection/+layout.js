throw new Error("@migration task: Update load function (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292693)");


let count = 0;

/** @type {import('@sveltejs/kit').Load} */
export async function load({ fetch }) {
	const res = await fetch('/load/change-detection/data.json');
	const { type } = await res.json();

	count += 1;

	return {
		cache: { maxage: 5 },
		props: {
			type,
			loads: count
		},
		dependencies: ['custom:change-detection-layout']
	};
}
