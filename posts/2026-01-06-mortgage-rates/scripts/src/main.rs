use chrono::NaiveDate;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::fs;

#[derive(Debug, Deserialize)]
struct FredResponse {
    observations: Vec<FredObservation>,
}

#[derive(Debug, Deserialize)]
struct FredObservation {
    date: String,
    value: String,
}

#[derive(Debug, Serialize, Clone)]
struct DataPoint {
    date: String,
    mortgage_30y: Option<f64>,
    mortgage_15y: Option<f64>,
    mortgage_5_1_arm: Option<f64>,
    treasury_10y: Option<f64>,
    fed_funds: Option<f64>,
    inflation_expectation: Option<f64>,
    mortgage_spread: Option<f64>,
}

fn fetch_fred_series(api_key: &str, series_id: &str) -> Result<Vec<FredObservation>, Box<dyn std::error::Error>> {
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id={}&api_key={}&file_type=json&observation_start=1971-01-01",
        series_id, api_key
    );
    
    let client = Client::new();
    let response = client.get(&url).send()?;
    let fred_response: FredResponse = response.json()?;
    
    println!("✓ Got {} observations for {}", fred_response.observations.len(), series_id);
    Ok(fred_response.observations)
}

fn parse_value(value_str: &str) -> Option<f64> {
    if value_str == "." {
        None
    } else {
        value_str.parse::<f64>().ok()
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = env::var("FRED_API_KEY").expect("FRED_API_KEY must be set");
    
    println!("Fetching mortgage and related data from FRED...");
    
    // Fetch all series
    let mortgage_30y = fetch_fred_series(&api_key, "MORTGAGE30US")?;
    let mortgage_15y = fetch_fred_series(&api_key, "MORTGAGE15US")?;
    let mortgage_5_1_arm = fetch_fred_series(&api_key, "MORTGAGE5US")?;
    let treasury_10y = fetch_fred_series(&api_key, "DGS10")?;
    let fed_funds = fetch_fred_series(&api_key, "DFF")?;
    let inflation_exp = fetch_fred_series(&api_key, "T10YIE")?;
    
    // Build hashmaps for easier lookup
    let mut mortgage_30y_map: HashMap<String, f64> = HashMap::new();
    for obs in &mortgage_30y {
        if let Some(val) = parse_value(&obs.value) {
            mortgage_30y_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut mortgage_15y_map: HashMap<String, f64> = HashMap::new();
    for obs in &mortgage_15y {
        if let Some(val) = parse_value(&obs.value) {
            mortgage_15y_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut mortgage_5_1_arm_map: HashMap<String, f64> = HashMap::new();
    for obs in &mortgage_5_1_arm {
        if let Some(val) = parse_value(&obs.value) {
            mortgage_5_1_arm_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut treasury_10y_map: HashMap<String, f64> = HashMap::new();
    for obs in &treasury_10y {
        if let Some(val) = parse_value(&obs.value) {
            treasury_10y_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut fed_funds_map: HashMap<String, f64> = HashMap::new();
    for obs in &fed_funds {
        if let Some(val) = parse_value(&obs.value) {
            fed_funds_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut inflation_exp_map: HashMap<String, f64> = HashMap::new();
    for obs in &inflation_exp {
        if let Some(val) = parse_value(&obs.value) {
            inflation_exp_map.insert(obs.date.clone(), val);
        }
    }
    
    // Collect all unique dates
    let mut all_dates: Vec<String> = mortgage_30y_map.keys().cloned().collect();
    all_dates.sort();
    
    // Build combined dataset
    let mut data_points: Vec<DataPoint> = Vec::new();
    
    for date in &all_dates {
        let mortgage_30 = mortgage_30y_map.get(date).copied();
        let mortgage_15 = mortgage_15y_map.get(date).copied();
        let mortgage_arm = mortgage_5_1_arm_map.get(date).copied();
        let treasury = treasury_10y_map.get(date).copied();
        let fed = fed_funds_map.get(date).copied();
        let inflation = inflation_exp_map.get(date).copied();
        
        // Calculate mortgage spread (30Y mortgage - 10Y Treasury)
        let spread = match (mortgage_30, treasury) {
            (Some(m), Some(t)) => Some(m - t),
            _ => None,
        };
        
        data_points.push(DataPoint {
            date: date.clone(),
            mortgage_30y: mortgage_30,
            mortgage_15y: mortgage_15,
            mortgage_5_1_arm: mortgage_arm,
            treasury_10y: treasury,
            fed_funds: fed,
            inflation_expectation: inflation,
            mortgage_spread: spread,
        });
    }
    
    println!("\n✓ Combined {} data points", data_points.len());
    
    // Save raw data
    let raw_json = serde_json::to_string_pretty(&data_points)?;
    fs::write("/app/data/raw/mortgage_rates.js", format!("const mortgageRatesData = {};", raw_json))?;
    println!("✓ Saved raw data to /app/data/raw/mortgage_rates.js");
    
    // Calculate some analysis: monthly averages and rolling correlations
    println!("\n✓ Data fetching complete!");
    
    Ok(())
}
