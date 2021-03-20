const vegetables = new Set(['asparagus', 'broccoli', 'carrot', 'daikon', 'endive']);

/** @type {import("../../../../../../../types").RequestHandler} */
export function get({ params }) {
	if (vegetables.has(params.vegetable)) {
		return {
			body: { type: 'vegetable' }
		};
	}
}
