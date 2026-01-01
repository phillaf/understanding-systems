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

/// Calculate log difference (continuously compounded growth rate)
/// log(GDP_t) - log(GDP_{t-1}) = log(GDP_t / GDP_{t-1})
fn calculate_log_difference(values: &[f64]) -> (Vec<f64>, usize) {
    let mut log_diffs = Vec::new();
    
    for i in 1..values.len() {
        let prev = values[i - 1];
        let curr = values[i];
        let log_diff = (curr / prev).ln();
        log_diffs.push(log_diff);
    }
    
    (log_diffs, 1) // Returns log differences and the number of skipped elements
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Transforming GDP data to calculate log difference...");
    
    // Read raw GDP data
    let raw_dir = Path::new("../data/raw");
    let gdp_content = fs::read_to_string(raw_dir.join("gdp.js"))?;
    
    // Extract JSON from the JavaScript file
    let json_start = gdp_content.find('{').ok_or("No JSON found in gdp.js")?;
    let json_end = gdp_content.rfind('}').ok_or("No closing brace found")?;
    let gdp_data: ChartData = serde_json::from_str(&gdp_content[json_start..=json_end])?;
    
    // Calculate log difference
    let (log_diff_values, skip) = calculate_log_difference(&gdp_data.datasets[0].data);
    let log_diff_labels: Vec<String> = gdp_data.labels.iter().skip(skip).cloned().collect();
    
    // Create transformed dataset
    let transformed_data = TransformedChartData {
        labels: log_diff_labels,
        datasets: vec![TransformedDataset {
            label: "US GDP Log Difference (continuously compounded growth)".to_string(),
            data: log_diff_values,
            border_color: "rgb(75, 192, 192)".to_string(),
            background_color: "rgba(75, 192, 192, 0.2)".to_string(),
            tension: 0.1,
        }],
    };
    
    // Write transformed data
    let transformed_dir = Path::new("../data/transformed");
    std::fs::create_dir_all(transformed_dir)?;
    
    let output = format!(
        "// US GDP Log Difference data (continuously compounded growth rate)\n// Last updated: {}\n// Source: Transformed from data/raw/gdp.js\n// Formula: ln(GDP_t / GDP_{{t-1}})\n// Shows growth relative to current GDP value\nconst gdpLogDiffData = {};",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        serde_json::to_string_pretty(&transformed_data)?
    );
    
    fs::write(transformed_dir.join("gdp_log_diff.js"), output)?;
    println!("✓ Successfully wrote GDP log difference data to ../data/transformed/gdp_log_diff.js");
    
    Ok(())
}
