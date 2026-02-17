#!/usr/bin/env node
console.log('Script started');

import('./autonomous-engine-safe.js')
  .then(() => console.log('Import successful'))
  .catch(err => console.error('Import failed:', err));
