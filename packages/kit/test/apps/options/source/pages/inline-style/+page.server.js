// test that the server-client stylesheet map is constructed correctly when
// a page is imported. Importing a page causes Vite to associate the css with
// a separate chunk instead of the page component itself
import.meta.glob('./import-meta/+page.svelte', { eager: true });
