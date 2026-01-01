use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fs;
use std::path::Path;
use std::io::Read;

#[derive(Debug, Deserialize)]
struct FredResponse {
    observations: Vec<Observation>,
}

#[derive(Debug, Deserialize)]
struct Observation {
    date: String,
    value: String,
}

#[derive(Debug, Serialize)]
struct ChartDataset {
    label: String,
    data: Vec<DataPoint>,
    #[serde(rename = "borderColor")]
    border_color: String,
    #[serde(rename = "backgroundColor")]
    background_color: String,
    tension: f64,
}

#[derive(Debug, Serialize)]
struct DataPoint {
    x: String,
    y: f64,
}

#[derive(Debug, Serialize)]
struct ChartData {
    labels: Vec<String>,
    datasets: Vec<ChartDataset>,
}

fn main() -> Result<(), Box<dyn Error>> {
    println!("Fetching NBER recession indicator data...");
    
    // USREC: NBER recession indicator (0 = expansion, 1 = recession)
    // Monthly data from 1948 onwards
    let api_key = std::env::var("FRED_API_KEY")
        .unwrap_or_else(|_| "your_api_key_here".to_string());
    
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id=USREC&api_key={}&file_type=json&observation_start=1948-01-01",
        api_key
    );

    let body: String = ureq::get(&url).call()?.body_mut().read_to_string()?;
    let fred_data: FredResponse = serde_json::from_str(&body)?;

    let mut dates = Vec::new();
    let mut values = Vec::new();

    for obs in fred_data.observations {
        // Parse recession indicator (0 or 1)
        if let Ok(value) = obs.value.parse::<f64>() {
            dates.push(obs.date.clone());
            values.push(value);
        }
    }

    println!("  Fetched {} monthly observations", dates.len());

    // Create dataset
    let data_points: Vec<DataPoint> = dates
        .iter()
        .zip(values.iter())
        .map(|(date, value)| DataPoint {
            x: date.clone(),
            y: *value,
        })
        .collect();

    let dataset = ChartDataset {
        label: "NBER Recession Indicator".to_string(),
        data: data_points,
        border_color: "rgb(220, 53, 69)".to_string(),
        background_color: "rgba(220, 53, 69, 0.1)".to_string(),
        tension: 0.0,
    };

    let chart_data = ChartData {
        labels: vec![],
        datasets: vec![dataset],
    };

    // Write to file
    let output_dir = Path::new("../data/raw");
    fs::create_dir_all(output_dir)?;
    
    let output = format!(
        "// NBER Recession Indicator (USREC)\n// Monthly data: 0 = expansion, 1 = recession\n// Source: Federal Reserve Economic Data (FRED)\nconst recessionIndicator = {};",
        serde_json::to_string_pretty(&chart_data)?
    );
    
    fs::write(output_dir.join("recession_indicator.js"), output)?;

    println!("✓ Successfully wrote recession indicator data to ../data/raw/recession_indicator.js");
    Ok(())
}
