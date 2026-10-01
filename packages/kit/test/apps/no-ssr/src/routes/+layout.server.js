/** @type {import('./$types').LayoutServerLoad} */
export const load = ({ route }) => {
	return { server_route_id: route.id };
};
