import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { execSync } from 'child_process';

let version = 'v0.0.0';
try {
  // Fetch tags to make sure describe works on shallow clones (e.g. Cloudflare Pages build environment)
  execSync('git fetch --tags --depth=1', { stdio: 'ignore' });
  version = execSync('git describe --tags --always').toString().trim();
} catch (e) {
  try {
    version = execSync('git describe --tags --always').toString().trim();
  } catch (err) {
    console.warn('Failed to retrieve version from git:', err);
  }
}

// https://astro.build/config
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    imageService: 'passthrough'
  }),
  outDir: './dist',
  publicDir: './public',
  srcDir: './src',
  compressHTML: true,
  vite: {
    define: {
      'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(version)
    }
  }
});

