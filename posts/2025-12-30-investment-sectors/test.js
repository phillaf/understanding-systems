// Test for investment-sectors blog post
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== Testing investment-sectors post ===\n');

const postDir = __dirname;
let failures = 0;

// Test 1: Check HTML structure
console.log('Test 1: HTML structure validation...');
const htmlPath = path.join(postDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Check for all 11 sectors
const requiredSectors = [
    'Industrials',
    'Financials',
    'Information Technology',
    'Health Care',
    'Consumer Discretionary',
    'Consumer Staples',
    'Energy',
    'Materials',
    'Utilities',
    'Real Estate',
    'Communication Services'
];

for (const sector of requiredSectors) {
    if (html.includes(sector)) {
        console.log(`  ✓ Found sector: ${sector}`);
    } else {
        console.error(`  ✗ Missing sector: ${sector}`);
        failures++;
    }
}

// Test 2: Validate sector cards structure
console.log('\nTest 2: Sector card structure...');
const sectorCardMatches = html.match(/<div class="sector-card">/g);
if (sectorCardMatches && sectorCardMatches.length >= 11) {
    console.log(`  ✓ Found ${sectorCardMatches.length} sector cards`);
} else {
    console.error(`  ✗ Expected at least 11 sector cards, found ${sectorCardMatches ? sectorCardMatches.length : 0}`);
    failures++;
}

// Test 3: Check for characteristics sections
console.log('\nTest 3: Characteristics sections validation...');
const characteristicsMatches = html.match(/<div class="characteristics">/g);
if (characteristicsMatches && characteristicsMatches.length >= 11) {
    console.log(`  ✓ Found ${characteristicsMatches.length} characteristics sections`);
} else {
    console.error(`  ✗ Expected at least 11 characteristics sections, found ${characteristicsMatches ? characteristicsMatches.length : 0}`);
    failures++;
}

// Test 4: Check for cycle behavior sections
console.log('\nTest 4: Economic cycle behavior validation...');
const cycleMatches = html.match(/<div class="cycle-behavior">/g);
if (cycleMatches && cycleMatches.length >= 11) {
    console.log(`  ✓ Found ${cycleMatches.length} cycle behavior sections`);
} else {
    console.error(`  ✗ Expected at least 11 cycle behavior sections, found ${cycleMatches ? cycleMatches.length : 0}`);
    failures++;
}

// Test 5: Check for comparison tables
console.log('\nTest 5: Comparison tables validation...');
const tableMatches = html.match(/<table class="comparison-table">/g);
if (tableMatches && tableMatches.length >= 2) {
    console.log(`  ✓ Found ${tableMatches.length} comparison tables`);
} else {
    console.error(`  ✗ Expected at least 2 comparison tables, found ${tableMatches ? tableMatches.length : 0}`);
    failures++;
}

// Test 6: Check for key companies
console.log('\nTest 6: Key companies validation...');
const companiesMatches = html.match(/<div class="key-companies">/g);
if (companiesMatches && companiesMatches.length >= 11) {
    console.log(`  ✓ Found ${companiesMatches.length} key companies sections`);
} else {
    console.error(`  ✗ Expected at least 11 key companies sections, found ${companiesMatches ? companiesMatches.length : 0}`);
    failures++;
}

// Test 7: Check for specific major companies
console.log('\nTest 7: Major companies mentioned...');
const majorCompanies = ['Apple', 'Microsoft', 'JPMorgan', 'ExxonMobil', 'Amazon', 'Pfizer'];
let foundCompanies = 0;
for (const company of majorCompanies) {
    if (html.includes(company)) {
        foundCompanies++;
    }
}
if (foundCompanies >= 5) {
    console.log(`  ✓ Found ${foundCompanies}/${majorCompanies.length} major companies`);
} else {
    console.error(`  ✗ Expected at least 5 major companies, found ${foundCompanies}`);
    failures++;
}

// Test 8: Check for key concepts
console.log('\nTest 8: Key investment concepts validation...');
const requiredConcepts = [
    'GICS',
    'diversification',
    'cyclical',
    'defensive',
    'P/E ratio',
    'dividend yield'
];

let foundConcepts = 0;
for (const concept of requiredConcepts) {
    if (html.toLowerCase().includes(concept.toLowerCase())) {
        foundConcepts++;
    }
}

if (foundConcepts >= 5) {
    console.log(`  ✓ Found ${foundConcepts}/${requiredConcepts.length} key concepts`);
} else {
    console.error(`  ✗ Expected at least 5 key concepts, found ${foundConcepts}`);
    failures++;
}

// Test 9: Check for key insights
console.log('\nTest 9: Key insights validation...');
const keyInsightMatches = html.match(/<div class="key-insight">/g);
if (keyInsightMatches && keyInsightMatches.length >= 4) {
    console.log(`  ✓ Found ${keyInsightMatches.length} key insight boxes`);
} else {
    console.error(`  ✗ Expected at least 4 key insights, found ${keyInsightMatches ? keyInsightMatches.length : 0}`);
    failures++;
}

// Test 10: Check for external references
console.log('\nTest 10: External references validation...');
const externalLinks = html.match(/href="https?:\/\//g);
if (externalLinks && externalLinks.length >= 4) {
    console.log(`  ✓ Found ${externalLinks.length} external links`);
} else {
    console.error(`  ✗ Expected at least 4 external links, found ${externalLinks ? externalLinks.length : 0}`);
    failures++;
}

// Test 11: Check for back to home link
console.log('\nTest 11: Navigation...');
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
