import { get_articles } from './_get_articles';

export async function get(request, context) {
	return get_articles(request, context, 'author');
}
