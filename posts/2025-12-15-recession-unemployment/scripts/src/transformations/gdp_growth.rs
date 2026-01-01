use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Deserialize)]
struct ChartData {
    labels: Vec<String>,
    datasets: Vec<Dataset>,
}

#[derive(Debug, Deserialize)]
struct Dataset {
    label: String,
    data: Vec<f64>,
    #[serde(rename = "borderColor")]
    border_color: String,
    #[serde(rename = "backgroundColor")]
    background_color: String,
    tension: f64,
}

#[derive(Debug, Serialize)]
struct TransformedChartData {
    labels: Vec<String>,
    datasets: Vec<TransformedDataset>,
}

#[derive(Debug, Serialize)]
struct TransformedDataset {
    label: String,
    data: Vec<f64>,
    #[serde(rename = "borderColor")]
    border_color: String,
    #[serde(rename = "backgroundColor")]
    background_color: String,
    tension: f64,
}

/// Calculate quarter-over-quarter percentage change (growth rate)
fn calculate_percentage_change(values: &[f64]) -> (Vec<f64>, usize) {
    let mut growth_rates = Vec::new();
    
    for i in 1..values.len() {
        let prev = values[i - 1];
        let curr = values[i];
        let growth_rate = ((curr - prev) / prev) * 100.0;
        growth_rates.push(growth_rate);
    }
    
    (growth_rates, 1) // Returns growth rates and the number of skipped elements (1 for first element)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Transforming GDP data to calculate growth rate...");
    
    // Read raw GDP data
    let raw_dir = Path::new("../data/raw");
    let gdp_content = fs::read_to_string(raw_dir.join("gdp.js"))?;
    
    // Extract JSON from the JavaScript file (skip comments and variable declaration)
    let json_start = gdp_content.find('{').ok_or("No JSON found in gdp.js")?;
    let json_end = gdp_content.rfind('}').ok_or("No closing brace found")?;
    let gdp_data: ChartData = serde_json::from_str(&gdp_content[json_start..=json_end])?;
    
    // Calculate growth rate
    let (growth_values, skip) = calculate_percentage_change(&gdp_data.datasets[0].data);
    let growth_labels: Vec<String> = gdp_data.labels.iter().skip(skip).cloned().collect();
    
    // Create transformed dataset
    let transformed_data = TransformedChartData {
        labels: growth_labels,
        datasets: vec![TransformedDataset {
            label: "US GDP Growth Rate (%)".to_string(),
            data: growth_values,
            border_color: "rgb(34, 139, 34)".to_string(),
            background_color: "rgba(34, 139, 34, 0.2)".to_string(),
            tension: 0.1,
        }],
    };
    
    // Write transformed data
    let transformed_dir = Path::new("../data/transformed");
    std::fs::create_dir_all(transformed_dir)?;
    
    let output = format!(
        "// US GDP Growth Rate data (quarter-over-quarter % change)\n// Last updated: {}\n// Source: Transformed from data/raw/gdp.js\n// Recessions show as negative values\nconst gdpGrowthData = {};",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        serde_json::to_string_pretty(&transformed_data)?
    );
    
    fs::write(transformed_dir.join("gdp_growth.js"), output)?;
    println!("✓ Successfully wrote GDP growth rate data to ../data/transformed/gdp_growth.js");
    
    Ok(())
}
