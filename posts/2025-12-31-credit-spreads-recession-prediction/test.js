const fs = require('fs');
const path = require('path');

// Load HTML content
const htmlPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

// Test suite
const tests = [];
let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        tests.push({ description, passed: true });
        passed++;
    } catch (error) {
        tests.push({ description, passed: false, error: error.message });
        failed++;
    }
}

// Structure tests
test('Has proper HTML structure', () => {
    if (!html.includes('<!DOCTYPE html>')) throw new Error('Missing DOCTYPE');
    if (!html.includes('<html lang="en">')) throw new Error('Missing language attribute');
    if (!html.includes('<meta charset="UTF-8">')) throw new Error('Missing charset');
});

test('Has correct title', () => {
    if (!html.includes('<title>Do Credit Spreads Predict Recessions? Testing the Market Stress Signal</title>')) {
        throw new Error('Incorrect title');
    }
});

test('Has h1 heading matching title', () => {
    if (!html.includes('<h1>Do Credit Spreads Predict Recessions? Testing the Market Stress Signal</h1>')) {
        throw new Error('H1 does not match title');
    }
});

test('Has meta date information', () => {
    if (!html.includes('<time datetime="2025-12-31">')) throw new Error('Missing time element');
    if (!html.includes('December 31, 2025')) throw new Error('Missing readable date');
});

test('Has back to home link', () => {
    if (!html.includes('href="../../index.html"')) throw new Error('Missing home link');
    if (!html.includes('Back to home')) throw new Error('Missing back to home text');
});

test('Has lede/introduction paragraph', () => {
    if (!html.includes('class="lede"')) throw new Error('Missing lede paragraph');
    if (!html.includes('Credit spreads—the premium investors demand for corporate debt')) {
        throw new Error('Missing proper introduction');
    }
});

// Content tests - Key concepts
test('Explains what credit spreads are', () => {
    if (!html.includes('credit spread')) throw new Error('Missing credit spread definition');
    if (!html.includes('basis points')) throw new Error('Missing basis points explanation');
    if (!html.includes('default risk')) throw new Error('Missing default risk concept');
});

test('Explains investment-grade vs high-yield', () => {
    if (!html.includes('Investment-Grade')) throw new Error('Missing investment-grade definition');
    if (!html.includes('High-Yield')) throw new Error('Missing high-yield definition');
    if (!html.includes('BBB')) throw new Error('Missing BBB rating reference');
    if (!html.includes('junk bond')) throw new Error('Missing junk bond reference');
});

test('Presents theory of why spreads predict recessions', () => {
    if (!html.includes('Defaults rise in recessions')) throw new Error('Missing default theory');
    if (!html.includes('Credit tightening accelerates downturns')) throw new Error('Missing tightening theory');
    if (!html.includes('Market aggregates information')) throw new Error('Missing market information theory');
});

test('Includes data source and time period', () => {
    if (!html.includes('45 years')) throw new Error('Missing time period');
    if (!html.includes('1980')) throw new Error('Missing start date');
    if (!html.includes('ICE BofA')) throw new Error('Missing data source');
});

// Test 1: Lead time analysis
test('Has lead time analysis section', () => {
    if (!html.includes('Test 1: Do Spreads Widen Before Recessions Start')) {
        throw new Error('Missing lead time section');
    }
});

test('Has lead time data table', () => {
    if (!html.includes('Lead Time Analysis')) throw new Error('Missing lead time table');
    if (!html.includes('Recession Start')) throw new Error('Missing recession start column');
    if (!html.includes('Lead Time (Months)')) throw new Error('Missing lead time column');
});

test('Includes recession examples in lead time table', () => {
    if (!html.includes('Early 1980s')) throw new Error('Missing 1980s recession');
    if (!html.includes('Financial Crisis')) throw new Error('Missing 2008 recession');
    if (!html.includes('COVID-19')) throw new Error('Missing COVID recession');
});

test('States average lead time finding', () => {
    if (!html.includes('4.2 months')) throw new Error('Missing average lead time');
    if (!html.includes('4-6 months')) throw new Error('Missing lead time range');
});

test('Compares lead time to yield curve', () => {
    if (!html.includes('SHORTER than the')) throw new Error('Missing comparison to yield curve');
    if (!html.includes('yield curve')) throw new Error('Missing yield curve reference');
    if (!html.includes('6-16 months')) throw new Error('Missing yield curve lead time');
});

// Test 2: Threshold analysis
test('Has threshold analysis section', () => {
    if (!html.includes('Test 2: What Spread Level Signals Recession')) {
        throw new Error('Missing threshold section');
    }
});

test('Has threshold data table', () => {
    if (!html.includes('Threshold Results')) throw new Error('Missing threshold table');
    if (!html.includes('Spread Range')) throw new Error('Missing spread range column');
    if (!html.includes('Recession Probability')) throw new Error('Missing probability column');
});

test('Identifies 250 bps threshold', () => {
    if (!html.includes('250 basis points')) throw new Error('Missing 250 bps threshold');
    if (!html.includes('42.9%')) throw new Error('Missing 250 bps probability');
});

test('Identifies 300+ bps high probability', () => {
    if (!html.includes('>300 bps') || !html.includes('> 300 bps')) throw new Error('Missing 300+ category');
    if (!html.includes('73.1%')) throw new Error('Missing 300+ probability');
});

test('Shows low spreads are safe', () => {
    if (!html.includes('< 150 bps')) throw new Error('Missing low spread category');
    if (!html.includes('1.4%')) throw new Error('Missing low spread probability');
});

// Test 3: False positives
test('Has false positive analysis section', () => {
    if (!html.includes('Test 3: False Positives')) {
        throw new Error('Missing false positive section');
    }
});

test('Has false positive data table', () => {
    if (!html.includes('False Positive Events')) throw new Error('Missing false positive table');
});

test('Includes historical false positive examples', () => {
    if (!html.includes('1987 Crash')) throw new Error('Missing 1987 crash');
    if (!html.includes('LTCM Crisis')) throw new Error('Missing LTCM crisis');
    if (!html.includes('Europe Debt Crisis')) throw new Error('Missing Europe crisis');
    if (!html.includes('2011')) throw new Error('Missing 2011 episode');
});

test('Explains why false positives occurred', () => {
    if (!html.includes('Fed intervention') || !html.includes('Fed action')) {
        throw new Error('Missing Fed intervention explanation');
    }
    if (!html.includes('Policy responses matter')) throw new Error('Missing policy response theme');
});

// Test 4: Comparison to yield curve
test('Has yield curve comparison section', () => {
    if (!html.includes('Test 4: Comparing Credit Spreads to Yield Curve Inversion')) {
        throw new Error('Missing comparison section');
    }
});

test('Has comparison data table', () => {
    if (!html.includes('Head-to-Head Comparison')) throw new Error('Missing comparison table');
    if (!html.includes('Yield Curve Inversion')) throw new Error('Missing yield curve column');
    if (!html.includes('Credit Spreads')) throw new Error('Missing credit spreads column');
});

test('Shows accuracy metrics', () => {
    if (!html.includes('86%') || !html.includes('83%')) {
        throw new Error('Missing accuracy percentages');
    }
});

test('Discusses 2022-2025 case', () => {
    if (!html.includes('2022-2025')) throw new Error('Missing 2022-2025 discussion');
    if (!html.includes('Did not exceed 250 bps')) throw new Error('Missing spread behavior explanation');
});

test('Explains complementary nature', () => {
    if (!html.includes('Complementary Signals')) throw new Error('Missing complementary signals concept');
    if (!html.includes('Early warning') || !html.includes('early warning')) {
        throw new Error('Missing early warning discussion');
    }
    if (!html.includes('Imminent warning') || !html.includes('imminent')) {
        throw new Error('Missing imminent warning discussion');
    }
});

// Test 5: Different spread types
test('Has different spread types section', () => {
    if (!html.includes('Test 5: Do Different Spread Types Predict Differently')) {
        throw new Error('Missing spread types section');
    }
});

test('Has spread type comparison table', () => {
    if (!html.includes('Spread Type Performance')) throw new Error('Missing spread type table');
});

test('Compares investment-grade, high-yield, and TED', () => {
    if (!html.includes('Investment-Grade BBB')) throw new Error('Missing BBB in table');
    if (!html.includes('High-Yield Junk')) throw new Error('Missing high-yield in table');
    if (!html.includes('TED Spread')) throw new Error('Missing TED spread');
});

test('Explains pros and cons of each spread type', () => {
    if (!html.includes('Pro:')) throw new Error('Missing pros');
    if (!html.includes('Con:')) throw new Error('Missing cons');
});

// 2022-2025 case study
test('Has 2022-2025 case study section', () => {
    if (!html.includes('The 2022-2025 Test Case')) {
        throw new Error('Missing recent case study');
    }
});

test('Explains why spreads stayed contained', () => {
    if (!html.includes('180-200 bps')) throw new Error('Missing spread level');
    if (!html.includes('never exceeded the 250 bps threshold')) {
        throw new Error('Missing threshold comparison');
    }
    if (!html.includes('Corporate balance sheets remained healthy')) {
        throw new Error('Missing balance sheet explanation');
    }
});

test('States spreads were more accurate than curve', () => {
    if (!html.includes('more accurate signal than the yield curve')) {
        throw new Error('Missing accuracy comparison');
    }
    if (!html.includes('Spreads were right')) throw new Error('Missing verdict');
});

// Key insights box
test('Has key insights summary', () => {
    if (!html.includes('key-insight')) throw new Error('Missing key insights box');
    if (!html.includes('Key Takeaways')) throw new Error('Missing takeaways heading');
});

test('Key insights include main findings', () => {
    if (!html.includes('reliable short-term recession indicators')) {
        throw new Error('Missing reliability finding');
    }
    if (!html.includes('work differently than the yield curve')) {
        throw new Error('Missing curve comparison');
    }
    if (!html.includes('Policy responses matter')) {
        throw new Error('Missing policy finding');
    }
});

// Practical implications
test('Has practical implications section', () => {
    if (!html.includes('Practical Implications')) throw new Error('Missing implications section');
});

test('Has investor guidance', () => {
    if (!html.includes('For Investors')) throw new Error('Missing investor section');
    if (!html.includes('Monitor BBB spreads')) throw new Error('Missing monitoring advice');
});

test('Has policy maker guidance', () => {
    if (!html.includes('For Policy Makers')) throw new Error('Missing policy maker section');
});

// Limitations
test('Has limitations section', () => {
    if (!html.includes('Limitations and Caveats')) throw new Error('Missing limitations section');
});

test('Discusses methodological limitations', () => {
    if (!html.includes('Changing market structure')) throw new Error('Missing market structure limitation');
    if (!html.includes('Sample size')) throw new Error('Missing sample size limitation');
    if (!html.includes('QE distortions')) throw new Error('Missing QE limitation');
});

// Conclusion
test('Has bottom line conclusion', () => {
    if (!html.includes('The Bottom Line')) throw new Error('Missing conclusion section');
});

test('Restates main finding', () => {
    if (!html.includes('powerful, underappreciated')) throw new Error('Missing main assessment');
    if (!html.includes('83% accuracy')) throw new Error('Missing accuracy restatement');
});

// Charts
test('Loads Chart.js library', () => {
    if (!html.includes('chart.js')) throw new Error('Missing Chart.js library');
});

test('Has historical spread chart', () => {
    if (!html.includes('id="spreadHistoryChart"')) throw new Error('Missing spread history chart');
    if (!html.includes('Credit Spreads and Recessions: 1980-2025')) {
        throw new Error('Missing spread history title');
    }
});

test('Has threshold chart', () => {
    if (!html.includes('id="thresholdChart"')) throw new Error('Missing threshold chart');
});

test('Has comparison chart (spreads vs yield curve)', () => {
    if (!html.includes('id="comparisonChart"')) throw new Error('Missing comparison chart');
});

test('Has spread types chart', () => {
    if (!html.includes('id="spreadTypesChart"')) throw new Error('Missing spread types chart');
});

test('All charts have data sources', () => {
    const chartSources = html.match(/Source:.*?<\/em>/gi);
    if (!chartSources || chartSources.length < 4) {
        throw new Error('Not all charts have data sources');
    }
});

test('Charts reference Federal Reserve data', () => {
    if (!html.includes('Federal Reserve')) throw new Error('Missing Fed data source');
    if (!html.includes('FRED')) throw new Error('Missing FRED reference');
});

test('Charts reference ICE BofA indices', () => {
    if (!html.includes('ICE BofA')) throw new Error('Missing ICE BofA source');
});

test('Charts reference NBER recession dates', () => {
    if (!html.includes('NBER recession dates')) throw new Error('Missing NBER dates source');
});

// Cross-references
test('Links to bond markets article', () => {
    if (!html.includes('href="../2025-12-30-bond-markets-yield-curve/')) {
        throw new Error('Missing bond markets link');
    }
});

test('Links to banking article', () => {
    if (!html.includes('href="../2025-12-30-how-banks-make-money/')) {
        throw new Error('Missing banking link');
    }
});

// References section
test('Has references section', () => {
    if (!html.includes('References and Further Reading')) {
        throw new Error('Missing references section');
    }
});

test('Has at least 8 references', () => {
    const referenceMatches = html.match(/<li>.*?<\/li>/gi);
    const referencesSection = html.substring(html.indexOf('References and Further Reading'));
    const referencesInSection = referencesSection.match(/<li>.*?<\/li>/gi);
    if (!referencesInSection || referencesInSection.length < 8) {
        throw new Error('Fewer than 8 references found');
    }
});

test('References include hyperlinks', () => {
    const referencesSection = html.substring(html.indexOf('References and Further Reading'));
    if (!referencesSection.includes('<a href=')) {
        throw new Error('References not hyperlinked');
    }
});

test('References include Federal Reserve sources', () => {
    const referencesSection = html.substring(html.indexOf('References and Further Reading'));
    if (!referencesSection.includes('Federal Reserve') && !referencesSection.includes('FRED')) {
        throw new Error('Missing Fed references');
    }
});

test('References include academic papers', () => {
    const referencesSection = html.substring(html.indexOf('References and Further Reading'));
    if (!referencesSection.includes('Gilchrist')) throw new Error('Missing Gilchrist paper');
});

// Styling
test('Has no gradients', () => {
    if (html.match(/linear-gradient|radial-gradient/i)) {
        throw new Error('Contains gradients - user preference is no gradients');
    }
});

test('Uses solid colors', () => {
    if (!html.includes('background: #34495e')) throw new Error('Missing solid background colors');
});

// Print results
console.log('\n=================================');
console.log('Test Results: Credit Spreads Article');
console.log('=================================\n');

tests.forEach(test => {
    const status = test.passed ? '✓' : '✗';
    console.log(`${status} ${test.description}`);
    if (!test.passed) {
        console.log(`  Error: ${test.error}`);
    }
});

console.log('\n=================================');
console.log(`Total: ${tests.length} tests`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('=================================\n');

process.exit(failed > 0 ? 1 : 0);
