// Test for global-organizations blog post
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== Testing global-organizations post ===\n');

const postDir = __dirname;
let failures = 0;

// Test 1: Check HTML structure
console.log('Test 1: HTML structure validation...');
const htmlPath = path.join(postDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Check for key sections
const requiredSections = [
    'United Nations',
    'World Health Organization',
    'European Union',
    'NATO',
    'International Monetary Fund',
    'World Bank',
    'World Trade Organization',
    'G20',
    'Bank for International Settlements',
    'World Economic Forum',
    'OPEC',
    'Asian Infrastructure Investment Bank',
    'BRICS'
];

for (const section of requiredSections) {
    if (html.includes(section)) {
        console.log(`  ✓ Found section: ${section}`);
    } else {
        console.error(`  ✗ Missing section: ${section}`);
        failures++;
    }
}

// Test 2: Validate org cards structure
console.log('\nTest 2: Organization card structure...');
const orgCardMatches = html.match(/<div class="org-card">/g);
if (orgCardMatches && orgCardMatches.length >= 14) {
    console.log(`  ✓ Found ${orgCardMatches.length} organization cards`);
} else {
    console.error(`  ✗ Expected at least 14 org cards, found ${orgCardMatches ? orgCardMatches.length : 0}`);
    failures++;
}

// Test 3: Check for references
console.log('\nTest 3: External references validation...');
const referenceMatches = html.match(/<div class="reference">/g);
if (referenceMatches && referenceMatches.length >= 13) {
    console.log(`  ✓ Found ${referenceMatches.length} reference sections`);
} else {
    console.error(`  ✗ Expected at least 13 reference sections, found ${referenceMatches ? referenceMatches.length : 0}`);
    failures++;
}

// Test 4: Check for external links
console.log('\nTest 4: External link validation...');
const externalLinks = html.match(/href="https?:\/\//g);
if (externalLinks && externalLinks.length >= 30) {
    console.log(`  ✓ Found ${externalLinks.length} external links`);
} else {
    console.error(`  ✗ Expected at least 30 external links, found ${externalLinks ? externalLinks.length : 0}`);
    failures++;
}

// Test 5: Check for key structural elements
console.log('\nTest 5: Key structural elements...');
const requiredElements = [
    'org-purpose',
    'org-stats',
    'impact-list',
    'disclaimer'
];

for (const elem of requiredElements) {
    if (html.includes(`class="${elem}"`)) {
        console.log(`  ✓ Found element with class: ${elem}`);
    } else {
        console.error(`  ✗ Missing element with class: ${elem}`);
        failures++;
    }
}

// Test 6: Check for back to home link
console.log('\nTest 6: Navigation...');
if (html.includes('href="../../index.html"')) {
    console.log('  ✓ Found back to home link');
} else {
    console.error('  ✗ Missing back to home link');
    failures++;
}

// Summary
console.log('\n' + '='.repeat(50));
if (failures === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
} else {
    console.error(`✗ ${failures} test(s) failed`);
    process.exit(1);
}
