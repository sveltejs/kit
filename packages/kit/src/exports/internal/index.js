export * from '#internal';

// re-exporting this allows us to import it from generated modules under @sveltejs/kit/internal
// whereas importing devalue directly would error if the user doesn't have it in
// their package.json
export * as devalue from 'devalue';
