# svelte-migrate

## 1.3.4

### Patch Changes

- suggest running migrate command with latest if migration does not exist ([#11362](https://github.com/sveltejs/kit/pull/11362))

## 1.3.3

### Patch Changes

- chore: insert package at sorted position ([#11332](https://github.com/sveltejs/kit/pull/11332))

- fix: adjust cookie migration logic, note installation ([#11331](https://github.com/sveltejs/kit/pull/11331))

## 1.3.2

### Patch Changes

- fix: handle jsconfig.json ([#11325](https://github.com/sveltejs/kit/pull/11325))

## 1.3.1

### Patch Changes

- chore: fix broken migration links ([#11320](https://github.com/sveltejs/kit/pull/11320))

## 1.3.0

### Minor Changes

- feat: add sveltekit v2 migration ([#11294](https://github.com/sveltejs/kit/pull/11294))

## 1.2.8

### Patch Changes

- chore(deps): update dependency ts-morph to v21 ([#11181](https://github.com/sveltejs/kit/pull/11181))

## 1.2.7

### Patch Changes

- chore(deps): update dependency ts-morph to v20 ([#10766](https://github.com/sveltejs/kit/pull/10766))

## 1.2.6

### Patch Changes

- fix: do not downgrade versions ([#10352](https://github.com/sveltejs/kit/pull/10352))

## 1.2.5

### Patch Changes

- fix: note old eslint plugin deprecation ([#10319](https://github.com/sveltejs/kit/pull/10319))

## 1.2.4

### Patch Changes

- fix: ensure glob finds all files in folders ([#10230](https://github.com/sveltejs/kit/pull/10230))

## 1.2.3

### Patch Changes

- fix: handle missing fields in migrate script ([#10221](https://github.com/sveltejs/kit/pull/10221))

## 1.2.2

### Patch Changes

- fix: finalize svelte-4 migration ([#10195](https://github.com/sveltejs/kit/pull/10195))

- fix: changed `index` to `index.d.ts` in `typesVersions` ([#10180](https://github.com/sveltejs/kit/pull/10180))

## 1.2.1

### Patch Changes

- docs: update readme ([#10066](https://github.com/sveltejs/kit/pull/10066))

## 1.2.0

### Minor Changes

- feat: add Svelte 4 migration ([#9729](https://github.com/sveltejs/kit/pull/9729))

## 1.1.3

### Patch Changes

- fix: include index in typesVersions because it's always matched ([#9147](https://github.com/sveltejs/kit/pull/9147))

## 1.1.2

### Patch Changes

- fix: update existing exports with prepended outdir ([#9133](https://github.com/sveltejs/kit/pull/9133))

- fix: use typesVersions to wire up deep imports ([#9133](https://github.com/sveltejs/kit/pull/9133))

## 1.1.1

### Patch Changes

- fix: include utils in migrate's published files ([#9085](https://github.com/sveltejs/kit/pull/9085))

## 1.1.0

### Minor Changes

- feat: add `@sveltejs/package` migration (v1->v2) ([#8922](https://github.com/sveltejs/kit/pull/8922))

## 1.0.1

### Patch Changes

- fix: correctly check for old load props ([#8537](https://github.com/sveltejs/kit/pull/8537))

## 1.0.0

### Major Changes

First major release, see below for the history of changes that lead up to this.
Starting from now all releases follow semver and changes will be listed as Major/Minor/Patch

## 1.0.0-next.13

### Patch Changes

- fix: more robust uppercase migration ([#7033](https://github.com/sveltejs/kit/pull/7033))

## 1.0.0-next.12

### Patch Changes

- feat: do uppercase http verbs migration on the fly ([#6371](https://github.com/sveltejs/kit/pull/6371))

## 1.0.0-next.11

### Patch Changes

- fix: git mv files correctly when they contain \$ characters ([#6129](https://github.com/sveltejs/kit/pull/6129))

## 1.0.0-next.10

### Patch Changes

- Revert change to suggest props destructuring ([#6099](https://github.com/sveltejs/kit/pull/6099))

## 1.0.0-next.9

### Patch Changes

- Handle Error without message, handle status 200, handle missing body ([#6096](https://github.com/sveltejs/kit/pull/6096))

## 1.0.0-next.8

### Patch Changes

- Suggest props destructuring if possible ([#6069](https://github.com/sveltejs/kit/pull/6069))
- Fix typo in migration task ([#6070](https://github.com/sveltejs/kit/pull/6070))

## 1.0.0-next.7

### Patch Changes

- Migrate type comments on arrow functions ([#5933](https://github.com/sveltejs/kit/pull/5933))
- Use LayoutLoad inside +layout.js files ([#5931](https://github.com/sveltejs/kit/pull/5931))

## 1.0.0-next.6

### Patch Changes

- Create `.ts` files from `<script context="module" lang="ts">` ([#5905](https://github.com/sveltejs/kit/pull/5905))

## 1.0.0-next.5

### Patch Changes

- Rewrite type names ([#5778](https://github.com/sveltejs/kit/pull/5778))

## 1.0.0-next.4

### Patch Changes

- handle lone return statements ([#5831](https://github.com/sveltejs/kit/pull/5831))
- Fix error placement on (arrow) function when checking load input ([#5840](https://github.com/sveltejs/kit/pull/5840))

## 1.0.0-next.3

### Patch Changes

- handle more import cases ([#5828](https://github.com/sveltejs/kit/pull/5828))
- check load function input ([#5838](https://github.com/sveltejs/kit/pull/5838))

## 1.0.0-next.2

### Patch Changes

- Correctly rename files with spaces when migrating ([#5820](https://github.com/sveltejs/kit/pull/5820))

## 1.0.0-next.1

### Patch Changes

- Add a README ([#5817](https://github.com/sveltejs/kit/pull/5817))
