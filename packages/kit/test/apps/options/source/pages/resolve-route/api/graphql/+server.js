import { json } from '@sveltejs/kit';

const allMethod = async () => {
	return json({ my: 'Graphql server 🎉' });
};

export { allMethod as GET, allMethod as POST };
