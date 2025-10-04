// src/lib/server/search.js

import { query } from '$app/server';

export const my_search_query = query(async (searchTerm) => {
	// Simulate a 2-second network delay
	await new Promise((resolve) => setTimeout(resolve, 2000));

	// Return the result
	return { result: `Search results for "${searchTerm}"` };
});
