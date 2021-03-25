import { get_articles } from './_get_articles';

export async function get(request) {
	return get_articles(request, 'favorited');
}
