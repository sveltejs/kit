# Internally Shared Code For This Monorepo

Put things you want to use across packages in here. This package is not published, it should be inlined into the compiled output of the packages using it. When making changes to this package, you need to run `pnpm build` inside it for the changes to take effect in other packages. This package has no exports map specified, so you can import all files, but you need to declare the file ending specifier. Example: `import { posixify } from '@internal/shared/utils/filesystem.js`
