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
    let api_key = env::var("FRED_API_KEY")
        .expect("FRED_API_KEY environment variable not set");

    let client = Client::new();

    // Fetch Real GDP (GDPC1)
    println!("Fetching Real GDP data from FRED...");
    let gdp_url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id=GDPC1&api_key={}&file_type=json&observation_start=1947-01-01",
        api_key
    );
    let gdp_response = client.get(&gdp_url).send()?;
    let gdp_data: FredResponse = gdp_response.json()?;

    // Fetch Real GDP per Capita (A939RX0Q048SBEA)
    println!("Fetching Real GDP per Capita data from FRED...");
    let per_capita_url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id=A939RX0Q048SBEA&api_key={}&file_type=json&observation_start=1947-01-01",
        api_key
    );
    let per_capita_response = client.get(&per_capita_url).send()?;
    let per_capita_data: FredResponse = per_capita_response.json()?;

    // Convert GDP to Chart.js format
    let mut gdp_labels = Vec::new();
    let mut gdp_values = Vec::new();

    for obs in gdp_data.observations {
        if let Ok(value) = obs.value.parse::<f64>() {
            gdp_labels.push(obs.date);
            gdp_values.push(value);
        }
    }

    // Convert GDP per Capita to Chart.js format
    let mut per_capita_labels = Vec::new();
    let mut per_capita_values = Vec::new();

    for obs in per_capita_data.observations {
        if let Ok(value) = obs.value.parse::<f64>() {
            per_capita_labels.push(obs.date);
            per_capita_values.push(value);
        }
    }

    let chart_data = ChartData {
        labels: gdp_labels,
        datasets: vec![Dataset {
            label: "US Real GDP (Billions of 2017 Dollars)".to_string(),
            data: gdp_values,
            border_color: "rgb(34, 139, 34)".to_string(),
            background_color: "rgba(34, 139, 34, 0.2)".to_string(),
            tension: 0.1,
        }],
    };

    let per_capita_chart_data = ChartData {
        labels: per_capita_labels,
        datasets: vec![Dataset {
            label: "US Real GDP per Capita (2017 Dollars)".to_string(),
            data: per_capita_values,
            border_color: "rgb(34, 139, 34)".to_string(),
            background_color: "rgba(34, 139, 34, 0.2)".to_string(),
            tension: 0.1,
        }],
    };

    // Write to data directories
    let raw_dir = Path::new("../data/raw");
    let transformed_dir = Path::new("../data/transformed");
    std::fs::create_dir_all(raw_dir)?;
    std::fs::create_dir_all(transformed_dir)?;
    
    // Write absolute GDP data
    let output = format!(
        "// US Real GDP data from FRED (inflation-adjusted)\n// Last updated: {}\nconst gdpData = {};",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        serde_json::to_string_pretty(&chart_data)?
    );
    fs::write(raw_dir.join("gdp.js"), output)?;
    println!("✓ Successfully wrote GDP data to ../data/raw/gdp.js");
    
    // Write per capita GDP data
    let per_capita_output = format!(
        "// US Real GDP per Capita data from FRED (removes population growth)\n// Last updated: {}\nconst gdpPerCapitaData = {};",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        serde_json::to_string_pretty(&per_capita_chart_data)?
    );
    fs::write(raw_dir.join("gdp_per_capita.js"), per_capita_output)?;
    println!("✓ Successfully wrote GDP per capita data to ../data/raw/gdp_per_capita.js");
    
    Ok(())
}