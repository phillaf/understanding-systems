// Test for how-banks-make-money blog post
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== Testing how-banks-make-money post ===\n');

const postDir = __dirname;
let failures = 0;

// Test 1: Check HTML structure
console.log('Test 1: HTML structure validation...');
const htmlPath = path.join(postDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Check for key sections
const requiredSections = [
    'The Four Revenue Streams',
    'Net Interest Income',
    'Fee Income',
    'Investment Banking',
    'Asset Management',
    'The Cost Side',
    'Provision for Credit Losses',
    'Operating Expenses',
    'Regulatory Compliance',
    'Why Banks Are Actually Fragile'
];

for (const section of requiredSections) {
    if (html.includes(section)) {
        console.log(`  ✓ Found section: ${section}`);
    } else {
        console.error(`  ✗ Missing section: ${section}`);
        failures++;
    }
}

// Test 2: Validate revenue cards structure
console.log('\nTest 2: Revenue card structure...');
const revenueCardMatches = html.match(/<div class="revenue-card">/g);
if (revenueCardMatches && revenueCardMatches.length >= 4) {
    console.log(`  ✓ Found ${revenueCardMatches.length} revenue cards`);
} else {
    console.error(`  ✗ Expected at least 4 revenue cards, found ${revenueCardMatches ? revenueCardMatches.length : 0}`);
    failures++;
}

// Test 3: Check for example boxes
console.log('\nTest 3: Example boxes validation...');
const exampleBoxMatches = html.match(/<div class="example-box">/g);
if (exampleBoxMatches && exampleBoxMatches.length >= 3) {
    console.log(`  ✓ Found ${exampleBoxMatches.length} example boxes`);
} else {
    console.error(`  ✗ Expected at least 3 example boxes, found ${exampleBoxMatches ? exampleBoxMatches.length : 0}`);
    failures++;
}

// Test 4: Check for real bank examples
console.log('\nTest 4: Real bank data validation...');
const bankNames = ['JPMorgan Chase', 'Bank of America', 'Goldman Sachs'];
let foundBanks = 0;
for (const bank of bankNames) {
    if (html.includes(bank)) {
        console.log(`  ✓ Found example from: ${bank}`);
        foundBanks++;
    }
}
if (foundBanks < 2) {
    console.error(`  ✗ Expected at least 2 bank examples, found ${foundBanks}`);
    failures++;
}

// Test 5: Check for key insights
console.log('\nTest 5: Key insights validation...');
const keyInsightMatches = html.match(/<div class="key-insight">/g);
if (keyInsightMatches && keyInsightMatches.length >= 3) {
    console.log(`  ✓ Found ${keyInsightMatches.length} key insight boxes`);
} else {
    console.error(`  ✗ Expected at least 3 key insights, found ${keyInsightMatches ? keyInsightMatches.length : 0}`);
    failures++;
}

// Test 6: Check for financial table
console.log('\nTest 6: Financial breakdown table...');
if (html.includes('breakdown-table') && html.includes('Net Income')) {
    console.log('  ✓ Found financial breakdown table');
} else {
    console.error('  ✗ Missing financial breakdown table');
    failures++;
}

// Test 7: Check for external references
console.log('\nTest 7: External references validation...');
const externalLinks = html.match(/href="https?:\/\//g);
if (externalLinks && externalLinks.length >= 5) {
    console.log(`  ✓ Found ${externalLinks.length} external links`);
} else {
    console.error(`  ✗ Expected at least 5 external links, found ${externalLinks ? externalLinks.length : 0}`);
    failures++;
}

// Test 8: Check for key structural elements
console.log('\nTest 8: Key structural elements...');
const requiredElements = [
    'intro',
    'revenue-card',
    'cost-card',
    'example-box',
    'key-insight',
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

// Test 9: Check for back to home link
console.log('\nTest 9: Navigation...');
if (html.includes('href="../../index.html"')) {
    console.log('  ✓ Found back to home link');
} else {
    console.error('  ✗ Missing back to home link');
    failures++;
}

// Test 10: Check for specific financial concepts
console.log('\nTest 10: Financial concepts validation...');
const requiredConcepts = [
    'Net Interest Margin',
    'leverage',
    'capital requirements',
    'credit risk',
    'liquidity'
];

let foundConcepts = 0;
for (const concept of requiredConcepts) {
    if (html.toLowerCase().includes(concept.toLowerCase())) {
        foundConcepts++;
    }
}

if (foundConcepts >= 4) {
    console.log(`  ✓ Found ${foundConcepts}/${requiredConcepts.length} key financial concepts`);
} else {
    console.error(`  ✗ Expected at least 4 key concepts, found ${foundConcepts}`);
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
