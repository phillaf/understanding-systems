const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

console.log('Testing: What Actually Moves Currency Exchange Rates?');

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
test('Has article title', html.includes('What Actually Moves Currency Exchange Rates?'));
test('Has publication date', html.includes('December 30, 2025'));
test('Has meta section', html.includes('class="meta"'));

// Content tests - 7 theory cards
test('Has interest rate theory card', html.includes('Interest Rate Differential Theory'));
test('Has PPP theory card', html.includes('Purchasing Power Parity (PPP)'));
test('Has trade balance theory card', html.includes('Trade Balance Theory'));
test('Has capital flows theory card', html.includes('Capital Flows Theory'));
test('Has GDP growth theory card', html.includes('Relative Economic Growth'));
test('Has inflation theory card', html.includes('Inflation Differential Theory'));
test('Has debt theory card', html.includes('Government Debt/GDP Ratios'));

// All 7 theory cards should have "theory-card" class
const theoryCardCount = (html.match(/class="theory-card"/g) || []).length;
test('Has exactly 7 theory cards', theoryCardCount === 7);

// Result boxes for each test
test('Has interest rate results', html.includes('Strong Evidence for Interest Rate Effect'));
test('Has PPP results', html.includes('Mixed Evidence for Mean Reversion'));
test('Has trade balance results', html.includes('Weak or Inconsistent Trade Balance Effects'));
test('Has capital flows results', html.includes('Strong Capital Flow Effects'));
test('Has GDP growth results', html.includes('Ambiguous Growth Effects'));
test('Has inflation results', html.includes('Strong Inflation Effects'));
test('Has debt results', html.includes('Minimal Debt Effects for Reserve Currencies'));

// Charts - should have 8 chart canvases
test('Has exchange rate history chart', html.includes('id="exchangeRateChart"'));
test('Has interest rate chart', html.includes('id="interestRateChart"'));
test('Has PPP deviation chart', html.includes('id="pppdChart"'));
test('Has trade balance chart', html.includes('id="tradeBalanceChart"'));
test('Has capital flows chart', html.includes('id="capitalFlowsChart"'));
test('Has GDP growth chart', html.includes('id="gdpGrowthChart"'));
test('Has inflation chart', html.includes('id="inflationChart"'));
test('Has debt chart', html.includes('id="debtChart"'));

const chartCount = (html.match(/new Chart\(/g) || []).length;
test('Has exactly 8 Chart.js visualizations', chartCount === 8);

// Data tables - should have multiple tables with statistics
const tableCount = (html.match(/class="data-table"/g) || []).length;
test('Has at least 6 data tables with results', tableCount >= 6);

// Check for key statistical concepts
test('Mentions R² (R-squared)', html.includes('R²'));
test('Mentions correlation coefficients', html.includes('Correlation'));
test('Mentions regression analysis', html.includes('regression'));
test('Discusses statistical significance', html.includes('systematic'));

// Key insights section
test('Has key insight box', html.includes('key-insight'));
test('Summarizes three main factors', html.includes('Three Factors That Actually Matter'));

// Cross-references to other articles
test('Links to financial system evolution article', html.includes('../2025-12-30-financial-system-evolution/'));
test('Links to global organizations article', html.includes('../2025-12-30-global-organizations/'));
test('Links to banking article', html.includes('../2025-12-30-how-banks-make-money/'));
test('Links to sectors article', html.includes('../2025-12-30-investment-sectors/'));

// Methodology section
test('Has methodology section', html.includes('class="methodology"'));
test('Explains data sources', html.includes('Data Sources and Methodology'));
test('Discusses limitations', html.includes('Limitations and Caveats'));

// References
test('Has references section', html.includes('References and Further Reading'));
const referenceCount = (html.match(/<li>/g) || []).length;
test('Has at least 8 references', referenceCount >= 8);

// Practical implications
test('Has investor implications section', html.includes('For Investors'));
test('Has policy implications section', html.includes('For Companies and Policy Makers'));
test('Discusses actionable insights', html.includes('actionable'));

// Chart.js integration
test('Includes Chart.js library', html.includes('chart.js'));
test('Has scatter plot configurations', html.includes("type: 'scatter'"));
test('Has line chart configuration', html.includes("type: 'line'"));

// CSS styling
test('Has responsive styling', html.includes('@media'));
test('Has chart containers', html.includes('chart-container'));
test('Has result box styling', html.includes('result-box'));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
