// Test for financial-system-evolution blog post
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== Testing financial-system-evolution post ===\n');

const postDir = __dirname;
let failures = 0;

// Test 1: Check HTML structure
console.log('Test 1: HTML structure validation...');
const htmlPath = path.join(postDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Check for key historical periods
const requiredPeriods = [
    'Gold Standard',
    'Bretton Woods',
    'Nixon Shock',
    'Washington Consensus',
    'Financial Crisis',
    'Volcker',
    'Multipolar'
];

for (const period of requiredPeriods) {
    if (html.includes(period)) {
        console.log(`  ✓ Found period: ${period}`);
    } else {
        console.error(`  ✗ Missing period: ${period}`);
        failures++;
    }
}

// Test 2: Validate era cards structure
console.log('\nTest 2: Era card structure...');
const eraCardMatches = html.match(/<div class="era-card">/g);
if (eraCardMatches && eraCardMatches.length >= 6) {
    console.log(`  ✓ Found ${eraCardMatches.length} era cards`);
} else {
    console.error(`  ✗ Expected at least 6 era cards, found ${eraCardMatches ? eraCardMatches.length : 0}`);
    failures++;
}

// Test 3: Check for timeline
console.log('\nTest 3: Timeline validation...');
if (html.includes('class="timeline"') && html.includes('timeline-item')) {
    const timelineItems = html.match(/<div class="timeline-item">/g);
    console.log(`  ✓ Found timeline with ${timelineItems ? timelineItems.length : 0} events`);
    if (!timelineItems || timelineItems.length < 8) {
        console.error(`  ✗ Expected at least 8 timeline events`);
        failures++;
    }
} else {
    console.error('  ✗ Missing timeline structure');
    failures++;
}

// Test 4: Check for key institutions
console.log('\nTest 4: Key institutions validation...');
const institutions = ['IMF', 'World Bank', 'BIS', 'Federal Reserve', 'BRICS'];
let foundInstitutions = 0;
for (const institution of institutions) {
    if (html.includes(institution)) {
        foundInstitutions++;
    }
}
if (foundInstitutions >= 4) {
    console.log(`  ✓ Found ${foundInstitutions}/${institutions.length} key institutions`);
} else {
    console.error(`  ✗ Expected at least 4 institutions, found ${foundInstitutions}`);
    failures++;
}

// Test 5: Check for key features sections
console.log('\nTest 5: Key features sections validation...');
const keyFeaturesMatches = html.match(/<div class="key-features">/g);
if (keyFeaturesMatches && keyFeaturesMatches.length >= 5) {
    console.log(`  ✓ Found ${keyFeaturesMatches.length} key features sections`);
} else {
    console.error(`  ✗ Expected at least 5 key features sections, found ${keyFeaturesMatches ? keyFeaturesMatches.length : 0}`);
    failures++;
}

// Test 6: Check for crisis/collapse sections
console.log('\nTest 6: Crisis sections validation...');
const collapseMatches = html.match(/<div class="collapse-trigger">/g);
const consequencesMatches = html.match(/<div class="consequences">/g);
const totalCrisisSections = (collapseMatches ? collapseMatches.length : 0) + (consequencesMatches ? consequencesMatches.length : 0);
if (totalCrisisSections >= 4) {
    console.log(`  ✓ Found ${totalCrisisSections} crisis/collapse sections`);
} else {
    console.error(`  ✗ Expected at least 4 crisis sections, found ${totalCrisisSections}`);
    failures++;
}

// Test 7: Check for key concepts
console.log('\nTest 7: Key economic concepts validation...');
const requiredConcepts = [
    'reserve currency',
    'exchange rate',
    'capital controls',
    'fiat',
    'quantitative easing',
    'inflation'
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

// Test 8: Check for key insights
console.log('\nTest 8: Key insights validation...');
const keyInsightMatches = html.match(/<div class="key-insight">/g);
if (keyInsightMatches && keyInsightMatches.length >= 8) {
    console.log(`  ✓ Found ${keyInsightMatches.length} key insight boxes`);
} else {
    console.error(`  ✗ Expected at least 8 key insights, found ${keyInsightMatches ? keyInsightMatches.length : 0}`);
    failures++;
}

// Test 9: Check for specific historical events
console.log('\nTest 9: Historical events validation...');
const historicalEvents = ['1944', '1971', '2008', 'Great Depression', 'Asian Financial Crisis'];
let foundEvents = 0;
for (const event of historicalEvents) {
    if (html.includes(event)) {
        foundEvents++;
    }
}
if (foundEvents >= 4) {
    console.log(`  ✓ Found ${foundEvents}/${historicalEvents.length} historical events`);
} else {
    console.error(`  ✗ Expected at least 4 historical events, found ${foundEvents}`);
    failures++;
}

// Test 10: Check for external references
console.log('\nTest 10: External references validation...');
const externalLinks = html.match(/href="https?:\/\//g);
if (externalLinks && externalLinks.length >= 5) {
    console.log(`  ✓ Found ${externalLinks.length} external links`);
} else {
    console.error(`  ✗ Expected at least 5 external links, found ${externalLinks ? externalLinks.length : 0}`);
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
