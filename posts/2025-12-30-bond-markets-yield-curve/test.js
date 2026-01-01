const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

console.log('Testing: Bond Markets and the Yield Curve');

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✓ ${name}`);
        passed++;
    } else {
        console.log(`✗ ${name}`);
        failed++;
    }
}

// Structure tests
test('Has proper HTML structure', html.includes('<!DOCTYPE html>') && html.includes('</html>'));
test('Has article title', html.includes('Bond Markets and the Yield Curve'));
test('Has publication date', html.includes('December 30, 2025'));
test('Has meta section', html.includes('class="meta"'));

// Core concepts
test('Explains bond basics', html.includes('Bond Basics'));
test('Explains inverse price-yield relationship', html.includes('inverse relationship'));
test('Defines yield curve', html.includes('The Yield Curve'));
test('Explains yield curve inversion', html.includes('Yield Curve Inversion'));
test('Explains duration', html.includes('Duration Risk'));
test('Discusses credit spreads', html.includes('Credit Spreads'));

// Concept cards
const conceptCardCount = (html.match(/class="concept-card"/g) || []).length;
test('Has at least 3 concept cards', conceptCardCount >= 3);

// Example boxes
const exampleBoxCount = (html.match(/class="example-box"/g) || []).length;
test('Has multiple example boxes', exampleBoxCount >= 3);

// Empirical analysis
test('Tests inversion signal empirically', html.includes('Testing the Inversion Signal'));
test('Has inversion history table', html.includes('Inversion Period'));
test('Shows track record', html.includes('Track Record'));
test('Discusses 2022-2023 inversion', html.includes('2022-2023'));
test('Mentions false positives', html.includes('1998') && html.includes('False signal'));

// Data tables
const dataTableCount = (html.match(/class="data-table"/g) || []).length;
test('Has at least 2 data tables', dataTableCount >= 2);

// Result boxes
const resultBoxCount = (html.match(/class="result-box"/g) || []).length;
test('Has result boxes', resultBoxCount >= 1);

// Charts - should have 5 Chart.js visualizations
test('Has yield curve shapes chart', html.includes('id="yieldCurveShapesChart"'));
test('Has historical spread chart', html.includes('id="yieldSpreadHistoryChart"'));
test('Has credit spreads chart', html.includes('id="creditSpreadsChart"'));
test('Has international comparison chart', html.includes('id="internationalYieldCurveChart"'));
test('Has bond price changes chart', html.includes('id="bondPriceChangesChart"'));

const chartCount = (html.match(/new Chart\(/g) || []).length;
test('Has exactly 5 Chart.js visualizations', chartCount === 5);

// Data sources for all charts
test('Chart 1 has source citation', html.includes('yieldCurveShapesChart') && html.includes('<em>Source:'));
test('Chart 2 has source citation', html.includes('yieldSpreadHistoryChart') && html.includes('Federal Reserve Board H.15'));
test('Chart 3 has source citation', html.includes('creditSpreadsChart') && html.includes('ICE BofA'));
test('Chart 4 has source citation', html.includes('internationalYieldCurveChart') && html.includes('FRED Economic Data'));
test('Chart 5 has source citation', html.includes('bondPriceChangesChart') && html.includes('Vanguard'));

// Key insights
test('Has key insight boxes', html.includes('key-insight'));
test('Explains why signal works', html.includes('Why the Signal Works'));

// Cross-references to other articles
test('Links to banking article', html.includes('../2025-12-30-how-banks-make-money/'));
test('Links to global organizations', html.includes('../2025-12-30-global-organizations/'));
test('Links to investment sectors', html.includes('../2025-12-30-investment-sectors/'));
test('Links to currency factors', html.includes('../2025-12-30-currency-factors/'));
test('Links to unemployment article', html.includes('../2025-12-20-unemployment-hidden-pattern/'));

// International comparison
test('Compares US, Germany, Japan', html.includes('Germany') && html.includes('Japan'));
test('Discusses international differences', html.includes('International Comparison'));

// Practical implications
test('Has investor implications', html.includes('For Investors'));
test('Has policy implications', html.includes('For Policy Makers'));

// Limitations section
test('Has methodology/limitations section', html.includes('class="methodology"'));
test('Discusses when signal fails', html.includes('When the Yield Curve Signal Fails'));
test('Mentions QE distortions', html.includes('Quantitative Easing') || html.includes('QE'));
test('Mentions sample size limitations', html.includes('sample'));

// References
test('Has references section', html.includes('References and Further Reading'));
const linkCount = (html.match(/target="_blank"/g) || []).length;
test('Has at least 9 linked references', linkCount >= 9);
test('Links to Federal Reserve', html.includes('federalreserve.gov'));
test('Links to NBER', html.includes('nber.org'));
test('Links to FRED', html.includes('fred.stlouisfed.org'));

// Recession discussion
test('Mentions NBER recession dates', html.includes('NBER'));
test('Discusses 2008 financial crisis', html.includes('2008'));
test('Discusses COVID recession', html.includes('COVID'));
test('Analyzes recession prediction accuracy', html.includes('86%') || html.includes('7 of 8'));

// Chart.js integration
test('Includes Chart.js library', html.includes('chart.js'));
test('Has line chart configurations', html.includes("type: 'line'"));
test('Has bar chart configuration', html.includes("type: 'bar'"));

// CSS styling
test('Has responsive styling', html.includes('@media'));
test('Has chart containers', html.includes('chart-container'));
test('No gradient backgrounds', !html.includes('linear-gradient'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
