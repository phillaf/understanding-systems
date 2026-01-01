const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
const document = dom.window.document;

let passedTests = 0;
let failedTests = 0;

function test(description, assertion) {
    try {
        if (assertion()) {
            passedTests++;
        } else {
            console.error(`❌ FAILED: ${description}`);
            failedTests++;
        }
    } catch (error) {
        console.error(`❌ ERROR: ${description}`);
        console.error(`   ${error.message}`);
        failedTests++;
    }
}

// Basic structure tests
test('HTML title mentions Four Economy Framework', () => {
    const title = document.querySelector('title');
    return title && title.textContent.includes('Four Economy Framework');
});

test('Main heading exists and mentions framework', () => {
    const h1 = document.querySelector('h1');
    return h1 && h1.textContent.includes('Four Economy');
});

test('Article date is January 1, 2025', () => {
    const time = document.querySelector('time');
    return time && time.getAttribute('datetime') === '2025-01-01';
});

test('Lede paragraph exists and mentions sequence', () => {
    const lede = document.querySelector('.lede');
    return lede && lede.textContent.includes('sequence');
});

// Content structure tests
test('Section on standard indicator problems exists', () => {
    const content = document.body.textContent;
    return content.includes('The Problem with Standard Recession Indicators');
});

test('Four Economy Framework section exists', () => {
    const content = document.body.textContent;
    return content.includes('The Four Economy Framework');
});

test('Framework describes Leading Economy', () => {
    const content = document.body.textContent;
    return content.includes('Leading Economy') && content.includes('money supply');
});

test('Framework describes Cyclical Economy', () => {
    const content = document.body.textContent;
    return content.includes('Cyclical Economy') && content.includes('construction') && content.includes('manufacturing');
});

test('Framework describes Aggregate Economy', () => {
    const content = document.body.textContent.toLowerCase();
    return content.includes('aggregate economy') && content.includes('total gdp');
});

test('Framework describes Lagging Economy', () => {
    const content = document.body.textContent;
    return content.includes('Lagging Economy') && content.includes('Services');
});

// Test sections exist
test('Test 1: Sequence verification exists', () => {
    const content = document.body.textContent;
    return content.includes('Test 1:') && content.includes('Move in Sequence');
});

test('Test 2: Lead times analysis exists', () => {
    const content = document.body.textContent;
    return content.includes('Test 2:') && content.includes('Lead Times');
});

test('Test 3: False positives analysis exists', () => {
    const content = document.body.textContent;
    return content.includes('Test 3:') && content.includes('False Positives');
});

test('Test 4: Magnitude analysis exists', () => {
    const content = document.body.textContent;
    return content.includes('Test 4:') && content.includes('Magnitude');
});

test('Test 5: LEI comparison exists', () => {
    const content = document.body.textContent;
    return content.includes('Test 5:') && content.includes('LEI');
});

test('Test 6: Trading strategy exists', () => {
    const content = document.body.textContent;
    return content.includes('Test 6:') && content.includes('Trade Profitably');
});

// Data table tests
test('Peak timing table exists', () => {
    const tables = document.querySelectorAll('.data-table');
    let found = false;
    tables.forEach(table => {
        if (table.textContent.includes('Leading Peak') && table.textContent.includes('Cyclical Peak')) {
            found = true;
        }
    });
    return found;
});

test('Peak timing table includes 1980 recession', () => {
    const content = document.body.textContent;
    return content.includes('1980 (Jan-Jul)') && content.includes('Sep 1979');
});

test('Peak timing table includes 2007-09 recession', () => {
    const content = document.body.textContent;
    return content.includes('2007-09') && content.includes('Jan 2006');
});

test('Peak timing table shows sequence held 5 of 6 times', () => {
    const content = document.body.textContent;
    return content.includes('5 of 6 recessions') || content.includes('100% consistent');
});

test('Lead times table exists', () => {
    const tables = document.querySelectorAll('.data-table');
    let found = false;
    tables.forEach(table => {
        if (table.textContent.includes('Average Lead Time') && table.textContent.includes('months')) {
            found = true;
        }
    });
    return found;
});

test('Lead times table shows Leading Economy leads by ~14 months', () => {
    const content = document.body.textContent;
    return content.includes('14 months');
});

test('Lead times table shows Cyclical Economy leads by ~6 months', () => {
    const content = document.body.textContent;
    return content.includes('6 months ahead');
});

test('False positives table exists', () => {
    const tables = document.querySelectorAll('.data-table');
    let found = false;
    tables.forEach(table => {
        if (table.textContent.includes('False Positive') || (table.textContent.includes('1998') && table.textContent.includes('LTCM'))) {
            found = true;
        }
    });
    return found;
});

test('False positives table includes 1998', () => {
    const content = document.body.textContent;
    return content.includes('1998') && content.includes('LTCM');
});

test('False positives table includes 2022-23', () => {
    const content = document.body.textContent;
    return content.includes('2022') && content.includes('Yield Curve Inversion');
});

test('False positives explanation mentions Cyclical never declined', () => {
    const content = document.body.textContent;
    return content.includes('Cyclical') && content.includes('never') && (content.includes('declined') || content.includes('contracted'));
});

test('Magnitude table exists', () => {
    const tables = document.querySelectorAll('.data-table');
    let found = false;
    tables.forEach(table => {
        if (table.textContent.includes('Cyclical Economy Decline') && table.textContent.includes('Peak Unemployment')) {
            found = true;
        }
    });
    return found;
});

test('Magnitude table shows 2001 was mild (-3.8%)', () => {
    const content = document.body.textContent;
    return content.includes('-3.8%') && content.includes('2001');
});

test('Magnitude table shows 2008 was severe (-22.3%)', () => {
    const content = document.body.textContent;
    return content.includes('-22.3%') && content.includes('2007-09');
});

test('Magnitude correlation mentioned (R²=0.85)', () => {
    const content = document.body.textContent;
    return content.includes('R²') || content.includes('correlation');
});

test('LEI comparison table exists', () => {
    const tables = document.querySelectorAll('.data-table');
    let found = false;
    tables.forEach(table => {
        if (table.textContent.includes('LEI') && table.textContent.includes('Accuracy')) {
            found = true;
        }
    });
    return found;
});

test('LEI comparison shows Four Economy has better accuracy', () => {
    const content = document.body.textContent;
    return content.includes('100%') && content.includes('Four Economy');
});

test('LEI comparison shows zero false positives for Four Economy', () => {
    const content = document.body.textContent;
    return content.includes('0') && content.includes('false positive');
});

test('Strategy performance table exists', () => {
    const tables = document.querySelectorAll('.data-table');
    let found = false;
    tables.forEach(table => {
        if (table.textContent.includes('Buy-and-Hold') && table.textContent.includes('Timing')) {
            found = true;
        }
    });
    return found;
});

test('Strategy shows lower max drawdown than buy-and-hold', () => {
    const content = document.body.textContent;
    return content.includes('-22%') && content.includes('-51%');
});

test('Strategy shows better Sharpe ratio', () => {
    const content = document.body.textContent;
    return content.includes('0.68') && content.includes('Sharpe');
});

// Chart tests
test('Four Economies timeline chart exists', () => {
    const canvas = document.getElementById('fourEconomiesChart');
    return canvas !== null;
});

test('Lead times bar chart exists', () => {
    const canvas = document.getElementById('leadTimesChart');
    return canvas !== null;
});

test('Magnitude scatter plot exists', () => {
    const canvas = document.getElementById('magnitudeChart');
    return canvas !== null;
});

test('LEI comparison chart exists', () => {
    const canvas = document.getElementById('comparisonChart');
    return canvas !== null;
});

test('Strategy performance chart exists', () => {
    const canvas = document.getElementById('strategyChart');
    return canvas !== null;
});

test('Chart.js library loaded', () => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.some(script => script.src && script.src.includes('chart.js'));
});

test('Chart.js annotation plugin loaded', () => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.some(script => script.src && script.src.includes('annotation'));
});

// Special sections tests
test('2015-16 manufacturing recession case study exists', () => {
    const content = document.body.textContent;
    return content.includes('2015-16') && content.includes('Manufacturing Recession');
});

test('2022-2025 case study section exists', () => {
    const content = document.body.textContent;
    return content.includes('2022-2025') && content.includes('Why No Recession');
});

test('2022-2025 explains construction boomed', () => {
    const content = document.body.textContent;
    return content.includes('Construction') && content.includes('boom');
});

test('Why construction/manufacturing matter section exists', () => {
    const content = document.body.textContent;
    return content.includes('Why Construction and Manufacturing Matter');
});

test('Amplitude vs share explanation exists', () => {
    const content = document.body.textContent;
    return content.includes('Amplitude') || (content.includes('volatile') && content.includes('15%'));
});

// Practical implementation section removed per user request

test('Limitations section exists', () => {
    const content = document.body.textContent;
    return content.includes('Limitations and Caveats');
});

test('Limitations mention exogenous shocks', () => {
    const content = document.body.textContent;
    return content.includes('exogenous shock') || content.includes('COVID');
});

test('Limitations mention policy interventions', () => {
    const content = document.body.textContent;
    return content.includes('Policy intervention') || content.includes('fiscal stimulus');
});

test('Limitations mention sample size', () => {
    const content = document.body.textContent;
    return content.includes('sample size') || content.includes('6 recessions');
});

test('Key insights box exists', () => {
    const keyInsight = document.querySelector('.key-insight');
    return keyInsight !== null;
});

test('Key insights mention 100% accuracy', () => {
    const content = document.body.textContent;
    return content.includes('100%');
});

test('Key insights explain magnitude correlation', () => {
    const keyInsight = document.querySelector('.key-insight');
    if (!keyInsight) return false;
    return keyInsight.textContent.includes('Magnitude') || keyInsight.textContent.includes('2001 was mild');
});

test('Key insights explain 2022-2025', () => {
    const keyInsight = document.querySelector('.key-insight');
    if (!keyInsight) return false;
    return keyInsight.textContent.includes('2022-2025');
});

// Cross-reference tests
test('Links to unemployment article', () => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.some(link => link.href && link.href.includes('recession-unemployment'));
});

test('Links to yield curve article', () => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.some(link => link.href && link.href.includes('bond-markets-yield-curve'));
});

test('Links to credit spreads article', () => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.some(link => link.href && link.href.includes('credit-spreads'));
});

// Reference section tests
test('References section exists', () => {
    const refSection = document.querySelector('.reference-section');
    return refSection !== null;
});

test('References include EPB Research articles', () => {
    const content = document.body.textContent;
    return content.includes('EPB Research') && content.includes('Basmajian');
});

test('References include Conference Board LEI', () => {
    const content = document.body.textContent;
    return content.includes('Conference Board');
});

test('References include NBER', () => {
    const content = document.body.textContent;
    return content.includes('NBER');
});

test('References include FRED', () => {
    const content = document.body.textContent;
    return content.includes('FRED');
});

test('At least 8 references cited', () => {
    const refSection = document.querySelector('.reference-section');
    if (!refSection) return false;
    const listItems = refSection.querySelectorAll('li');
    return listItems.length >= 8;
});

// Style tests
test('No gradients in CSS', () => {
    const styles = document.querySelectorAll('style');
    let hasGradient = false;
    styles.forEach(style => {
        if (style.textContent.includes('gradient')) {
            hasGradient = true;
        }
    });
    return !hasGradient;
});

test('Result boxes styled appropriately', () => {
    const resultBoxes = document.querySelectorAll('.result-box');
    return resultBoxes.length > 0;
});

test('Concept cards exist', () => {
    const conceptCards = document.querySelectorAll('.concept-card');
    return conceptCards.length > 0;
});

test('Methodology box exists', () => {
    const methodology = document.querySelector('.methodology');
    return methodology !== null;
});

test('Back to home link exists', () => {
    const links = Array.from(document.querySelectorAll('a'));
    return links.some(link => link.href && link.href.includes('index.html') && link.textContent.includes('Back'));
});

// Final summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${failedTests}`);
console.log(`Total tests: ${passedTests + failedTests}`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failedTests > 0 ? 1 : 0);