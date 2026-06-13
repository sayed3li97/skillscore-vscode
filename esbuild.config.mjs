import esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  outfile: 'dist/extension.js',
  // The vscode module is provided by the extension host at runtime.
  external: ['vscode'],
  logLevel: 'silent',
  plugins: [
    {
      name: 'log',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length) {
            console.error(`Build failed with ${result.errors.length} error(s).`);
          } else {
            console.log(`Build succeeded ${production ? '(production)' : '(dev)'}.`);
          }
        });
      },
    },
  ],
});

if (watch) {
  await ctx.watch();
  console.log('Watching for changes…');
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
