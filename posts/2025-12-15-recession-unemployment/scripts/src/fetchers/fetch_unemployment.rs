use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::Path;

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
struct ChartData {
    labels: Vec<String>,
    datasets: Vec<Dataset>,
}

#[derive(Debug, Serialize)]
struct Dataset {
    label: String,
    data: Vec<f64>,
    #[serde(rename = "borderColor")]
    border_color: String,
    #[serde(rename = "backgroundColor")]
    background_color: String,
    tension: f64,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Get API key from environment variable
    let api_key = env::var("FRED_API_KEY")
        .expect("FRED_API_KEY environment variable not set");

    // Fetch data from FRED API (UNRATE data available since 1948-01-01)
    let client = Client::new();
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&api_key={}&file_type=json&observation_start=1948-01-01",
        api_key
    );

    println!("Fetching unemployment data from FRED...");
    let response = client.get(&url).send()?;
    let fred_data: FredResponse = response.json()?;

    // Convert to Chart.js format
    let mut labels = Vec::new();
    let mut values = Vec::new();

    for obs in fred_data.observations {
        // Parse the value, skip if it's "."
        if let Ok(value) = obs.value.parse::<f64>() {
            labels.push(obs.date);
            values.push(value);
        }
    }

    let chart_data = ChartData {
        labels,
        datasets: vec![Dataset {
            label: "US Unemployment Rate (%)".to_string(),
            data: values,
            border_color: "rgb(220, 38, 38)".to_string(),
            background_color: "rgba(220, 38, 38, 0.2)".to_string(),
            tension: 0.1,
        }],
    };

    // Write to raw data directory
    let data_dir = Path::new("../data/raw");
    std::fs::create_dir_all(data_dir)?;
    let output = format!(
        "// US Unemployment Rate data from FRED\n// Last updated: {}\nconst unemploymentData = {};",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        serde_json::to_string_pretty(&chart_data)?
    );

    fs::write(data_dir.join("unemployment.js"), output)?;
    println!("✓ Successfully wrote unemployment data to ../data/raw/unemployment.js");
    
    Ok(())
}
