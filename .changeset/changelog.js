import github from '@changesets/changelog-github';

export const getReleaseLine = github.getReleaseLine;

// The dependency's own changelog already links to its changesets. Repeating them here
// produces hundreds of commit links when graduating a large prerelease to stable.
/** @type {typeof github.getDependencyReleaseLine} */
export const getDependencyReleaseLine = (_changesets, dependencies_updated) => {
	return Promise.resolve(
		dependencies_updated.length === 0
			? ''
			: [
					'- Updated dependencies:',
					...dependencies_updated.map(
						(dependency) => `  - ${dependency.name}@${dependency.newVersion}`
					)
				].join('\n')
	);
};
