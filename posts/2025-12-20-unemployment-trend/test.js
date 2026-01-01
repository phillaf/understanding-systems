// Test for unemployment-trend blog post
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('=== Testing unemployment-trend post ===\n');

const postDir = __dirname;
let failures = 0;

// Test 1: Check required data files exist
console.log('Test 1: Data file dependencies...');
const requiredDataFiles = [
    'data/raw/unemployment.js',
    'data/raw/recession_indicator.js',
    'data/transformed/unemployment_trend_analysis.js'
];

for (const file of requiredDataFiles) {
    const filePath = path.join(postDir, file);
    if (!fs.existsSync(filePath)) {
        console.error(`  ✗ Missing: ${file}`);
        failures++;
    } else {
        console.log(`  ✓ Found: ${file}`);
    }
}

// Test 2: Parse and validate HTML structure
console.log('\nTest 2: HTML structure validation...');
const htmlPath = path.join(postDir, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

const requiredElements = [
    { id: 'unemploymentTrendChart', type: 'canvas' },
    { id: 'detrendedRecessionChart', type: 'canvas' },
    { id: 'overlayChart', type: 'canvas' },
    { id: 'forecastChart', type: 'canvas' }
];

for (const elem of requiredElements) {
    const regex = new RegExp(`<${elem.type}[^>]*id="${elem.id}"`, 'i');
    if (regex.test(html)) {
        console.log(`  ✓ Found <${elem.type}> with id="${elem.id}"`);
    } else {
        console.error(`  ✗ Missing <${elem.type}> with id="${elem.id}"`);
        failures++;
    }
}

// Test 3: Validate all required scripts are loaded
console.log('\nTest 3: Script tag validation...');
const requiredScripts = [
    'chart.js',
    'data/raw/unemployment.js',
    'data/transformed/unemployment_trend_analysis.js'
];

for (const script of requiredScripts) {
    if (html.includes(script)) {
        console.log(`  ✓ Found script: ${script}`);
    } else {
        console.error(`  ✗ Missing script: ${script}`);
        failures++;
    }
}

// Test 4: Validate data files are valid JavaScript
console.log('\nTest 4: Data file JavaScript validation...');
for (const file of requiredDataFiles) {
    const filePath = path.join(postDir, file);
    if (!fs.existsSync(filePath)) continue;
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Extract variable name
        const match = content.match(/const\s+(\w+)\s*=/);
        if (!match) {
            console.error(`  ✗ ${file}: No variable declaration found`);
            failures++;
            continue;
        }
        
        const varName = match[1];
        
        // Execute in isolated context
        const context = {};
        const func = new Function('context', content + `\ncontext.${varName} = ${varName};`);
        func(context);
        
        const data = context[varName];
        
        // Validate structure
        if (!data || typeof data !== 'object') {
            console.error(`  ✗ ${file}: Invalid data structure`);
            failures++;
            continue;
        }
        
        if (!Array.isArray(data.labels)) {
            console.error(`  ✗ ${file}: Missing or invalid 'labels' array`);
            failures++;
            continue;
        }
        
        if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
            console.error(`  ✗ ${file}: Missing or empty 'datasets' array`);
            failures++;
            continue;
        }
        
        console.log(`  ✓ ${file}: Valid (${data.labels.length} labels, ${data.datasets.length} dataset(s))`);
        
    } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
        failures++;
    }
}

// Test 5: Simulate page load and check for JavaScript errors
console.log('\nTest 5: JavaScript runtime simulation...');
try {
    // Create minimal Chart.js mock
    const chartMock = `
        class Chart {
            constructor(ctx, config) {
                this.ctx = ctx;
                this.config = config;
                this.data = config.data;
                this.options = config.options;
            }
            update() {}
            destroy() {}
        }
        window.Chart = Chart;
    `;
    
    // Load all data files
    let dataScripts = '';
    for (const file of requiredDataFiles) {
        const filePath = path.join(postDir, file);
        if (fs.existsSync(filePath)) {
            dataScripts += fs.readFileSync(filePath, 'utf-8') + '\n';
        }
    }
    
    // Create DOM
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        resources: 'usable',
        beforeParse(window) {
            const errors = [];
            window.console.error = (...args) => {
                errors.push(args.join(' '));
            };
            window._testErrors = errors;
        }
    });
    
    const { window } = dom;
    
    try {
        // Execute Chart.js mock
        window.eval(chartMock);
        
        // Execute data scripts
        window.eval(dataScripts);
        
        // Extract and execute inline scripts
        const scriptMatches = html.matchAll(/<script>([\s\S]*?)<\/script>/g);
        for (const match of scriptMatches) {
            const scriptContent = match[1];
            if (scriptContent.trim() && !scriptContent.includes('src=')) {
                window.eval(scriptContent);
            }
        }
        
        console.log('  ✓ No JavaScript runtime errors');
        
    } catch (err) {
        console.error(`  ✗ Runtime error: ${err.message}`);
        failures++;
    }
    
} catch (err) {
    console.error(`  ✗ Failed to simulate page: ${err.message}`);
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
