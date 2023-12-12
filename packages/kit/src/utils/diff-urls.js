/**
 * Get's the shortest href that gets from `from` to `to`
 * 
 * @param {URL} from 
 * @param {URL} to 
 * 
 * @returns {string} The shortest href that gets from `from` to `to`
 */
export function getHrefBetween(from, to) {
    //check if they use the same protocol - If not, we can't do anything
    if (from.protocol !== to.protocol) {
        return to.href;
    }

    //check if they use the same host - If not, we can't do anything
    // host = hostname + port
    if (from.host !== to.host) {
        //since they have the same protocol, we can omit the protocol
        return "//" + to.host + to.pathname + to.search + to.hash;
    }

    if (from.pathname === to.pathname) {
        return to.search + to.hash;
    }


    //If the pathnames are different, we need to find the shortest path between them
    const relativePath = getRelativePath(from.pathname, to.pathname);
    const absolutePath = to.pathname;

    const path = absolutePath.length < relativePath.length ? absolutePath : relativePath;
    return path + to.search + to.hash;
}

/**
 * Get's the relative path from the "from" pathname to the "to" pathname.
 * 
 * @param {string} from Pathname to start from
 * @param {string} to Pathname to end at
 * @returns {string} The relative path from "from" to "to"
 */
function getRelativePath(from, to) {
    const fromPath = from.split("/").filter(Boolean);
    const toPath = to.split("/").filter(Boolean);


    const commonPrefixSegments = [];
    for (let i = 0; i < fromPath.length; i++) {
        if (fromPath[i] !== toPath[i]) break;
        commonPrefixSegments.push(fromPath[i]);
    }


    // If all but the last segment matches, we can just return the last segment
    if (commonPrefixSegments.length === fromPath.length - 1 && commonPrefixSegments.length === toPath.length - 1) {
        return toPath[toPath.length - 1];
    }


    const relativePath = [];
    for (let i = commonPrefixSegments.length; i < fromPath.length - 1; i++) {
        relativePath.push("..");
    }

    for (let i = commonPrefixSegments.length; i < toPath.length; i++) {
        relativePath.push(toPath[i]);
    }

    if (relativePath.length === 0) relativePath.push(".");

    return relativePath.join("/");
}
