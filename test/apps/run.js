
process.chdir('basics');

require('@sveltejs/kit/dist/cli.js');

const { dev } = await import('./api/dev');

try {
  const watcher = dev({
    port: opts.port
  });

  let first = true;

  watcher.on('stdout', data => {
    process.stdout.write(data);
  });

  watcher.on('stderr', data => {
    process.stderr.write(data);
  });

  watcher.on('ready', async (event: ReadyEvent) => {
    if (first) {
      console.log(colors.bold().cyan(`> Listening on http://localhost:${event.port}`));
      if (opts.open) {
        const { exec } = await import('child_process');
        exec(`open http://localhost:${event.port}`);
      }
      first = false;
    }
  });
} catch (err) {
  console.log(colors.bold().red(`> ${err.message}`));
  console.log(colors.gray(err.stack));
  process.exit(1);
}