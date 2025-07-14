import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export const load = ({ depends, url, untrack }) => {
    depends('app:navigation');
    if (untrack(() => url.searchParams.get('redirect') !== null)) {
        return redirect(302, '/navigation/loadreplace1');
    }
};