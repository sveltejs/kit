import { mimes, lookup } from 'mrmime';

// `mrmime` does not include `.ico` in its database. The IANA-registered
// type is `image/vnd.microsoft.icon`, but `image/x-icon` is the
// semi-official type that is universally supported by browsers and other
// tools, so we use that.
mimes['ico'] = 'image/x-icon';

export { lookup };
