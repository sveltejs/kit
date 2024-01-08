const mapping = {
    "/basic/a": "/basic/b",
}

/** @type {import("@sveltejs/kit").RewriteUrl} */
export const rewriteUrl = ({ url }) => {
    url.pathname = mapping[url.pathname] || url.pathname
    return url
}
