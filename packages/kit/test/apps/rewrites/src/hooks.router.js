/**
 * @type {import("@sveltejs/kit").RewriteURL}
 */
export const rewriteURL = ({ url }) => {
    if (url.pathname.startsWith("/rewrites/from")) {
        url.pathname = url.pathname.replace("/rewrites/from", "/rewrites/to");
        return url;
    }

    return url;
}