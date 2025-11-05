import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'jwplayer-react': 'src/jwplayer.tsx',
  },
  format: ['cjs'],
  dts: true,
  outDir: 'lib',
  external: ['react', 'react-dom'],
  clean: true,
  sourcemap: false,
  minify: false,
  splitting: false,
  treeshake: true,
});

