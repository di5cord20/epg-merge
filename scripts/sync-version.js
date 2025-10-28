#!/usr/bin/env node
/**
 * Sync version from backend/version.py to frontend/package.json
 * Run before build: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

// Read version from backend/version.py
const versionPath = path.join(__dirname, '../backend/version.py');
const versionContent = fs.readFileSync(versionPath, 'utf8');
const versionMatch = versionContent.match(/__version__\s*=\s*"([^"]+)"/);

if (!versionMatch) {
  console.error('❌ Could not find __version__ in backend/version.py');
  process.exit(1);
}

const version = versionMatch[1];
console.log(`📌 Version from backend: ${version}`);

// Update package.json
const packagePath = path.join(__dirname, '../frontend/package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (packageJson.version === version) {
  console.log(`✓ package.json already at version ${version}`);
} else {
  packageJson.version = version;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Updated package.json to version ${version}`);
}

// Set environment variable for build
process.env.REACT_APP_VERSION = version;
console.log(`✓ REACT_APP_VERSION set to ${version}`);

module.exports = version;