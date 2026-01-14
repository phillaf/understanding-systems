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
    inventory: Option<f64>,           // MSACSR - Monthly Supply of Houses (months)
    new_listings: Option<f64>,        // Housing inventory flow
    median_price: Option<f64>,        // MSPUS - Median Sales Price
    existing_sales: Option<f64>,      // EXHOSLUSM495S - Existing Home Sales
    new_home_sales: Option<f64>,      // HSN1F - New Home Sales
    months_supply: Option<f64>,       // MSACSR duplicate tracking
    mortgage_rate: Option<f64>,       // MORTGAGE30US for context
    recession: Option<f64>,           // USREC
}

fn fetch_fred_series(api_key: &str, series_id: &str) -> Result<Vec<FredObservation>, Box<dyn std::error::Error>> {
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id={}&api_key={}&file_type=json&observation_start=1990-01-01",
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
    
    println!("Fetching housing market data from FRED...");
    
    // Fetch all series
    let months_supply = fetch_fred_series(&api_key, "MSACSR")?;           // Months supply of inventory
    let median_price = fetch_fred_series(&api_key, "MSPUS")?;             // Median sales price
    let new_sales = fetch_fred_series(&api_key, "HSN1F")?;                // New home sales
    let mortgage_rate = fetch_fred_series(&api_key, "MORTGAGE30US")?;     // 30Y mortgage rate
    let recession = fetch_fred_series(&api_key, "USREC")?;                // Recession indicator
    
    // Build hashmaps for easier lookup
    let mut months_supply_map: HashMap<String, f64> = HashMap::new();
    for obs in &months_supply {
        if let Some(val) = parse_value(&obs.value) {
            months_supply_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut median_price_map: HashMap<String, f64> = HashMap::new();
    for obs in &median_price {
        if let Some(val) = parse_value(&obs.value) {
            median_price_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut new_sales_map: HashMap<String, f64> = HashMap::new();
    for obs in &new_sales {
        if let Some(val) = parse_value(&obs.value) {
            new_sales_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut mortgage_rate_map: HashMap<String, f64> = HashMap::new();
    for obs in &mortgage_rate {
        if let Some(val) = parse_value(&obs.value) {
            mortgage_rate_map.insert(obs.date.clone(), val);
        }
    }
    
    let mut recession_map: HashMap<String, f64> = HashMap::new();
    for obs in &recession {
        if let Some(val) = parse_value(&obs.value) {
            recession_map.insert(obs.date.clone(), val);
        }
    }
    
    // Collect all unique dates from months_supply (monthly data)
    let mut all_dates: Vec<String> = months_supply_map.keys().cloned().collect();
    all_dates.sort();
    
    // Build combined dataset
    let mut data_points: Vec<DataPoint> = Vec::new();
    
    for date in &all_dates {
        let supply = months_supply_map.get(date).copied();
        let price = median_price_map.get(date).copied();
        let new = new_sales_map.get(date).copied();
        let rate = mortgage_rate_map.get(date).copied();
        let rec = recession_map.get(date).copied();
        
        data_points.push(DataPoint {
            date: date.clone(),
            inventory: supply,
            new_listings: None,
            median_price: price,
            existing_sales: None,
            new_home_sales: new,
            months_supply: supply,
            mortgage_rate: rate,
            recession: rec,
        });
    }
    
    println!("\n✓ Combined {} data points", data_points.len());
    
    // Save raw data
    let raw_json = serde_json::to_string_pretty(&data_points)?;
    fs::write("/app/data/raw/housing_data.js", format!("const housingData = {};", raw_json))?;
    println!("✓ Saved raw data to /app/data/raw/housing_data.js");
    
    println!("\n✓ Data fetching complete!");
    
    Ok(())
}
