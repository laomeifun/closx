#!/usr/bin/env node

// Choose the correct entry file format based on environment
import { createRequire } from 'module';

/**
 * Create a require function to load CJS modules in ESM environment
 * @type {NodeRequire}
 */
const require = createRequire(import.meta.url);

try {
  // First try ESM import
  await import('../dist/index.mjs');
} catch (error) {
  try {
    // If ESM import fails, try CJS import
    require('../dist/index.cjs');
  } catch (innerError) {
    console.error('Failed to load application:', innerError);
    process.exit(1);
  }
}
