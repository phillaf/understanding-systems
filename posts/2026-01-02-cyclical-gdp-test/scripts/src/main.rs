use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;

#[derive(Debug, Deserialize)]
struct FredObservations {
    observations: Vec<FredObservation>,
}

#[derive(Debug, Deserialize)]
struct FredObservation {
    date: String,
    value: String,
}

#[derive(Debug, Serialize)]
struct QuarterlyData {
    date: String,
    cyclical_gdp: f64,
    non_cyclical_gdp: f64,
    total_gdp: f64,
    cyclical_share: f64,
    durables: f64,
    residential: f64,
    equipment: f64,
}

fn fetch_fred_series(series_id: &str, api_key: &str) -> Result<Vec<(String, f64)>, Box<dyn std::error::Error>> {
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id={}&api_key={}&file_type=json&observation_start=1960-01-01",
        series_id, api_key
    );
    
    let response = reqwest::blocking::get(&url)?;
    let fred_data: FredObservations = response.json()?;
    
    let mut data = Vec::new();
    for obs in fred_data.observations {
        if let Ok(value) = obs.value.parse::<f64>() {
            data.push((obs.date, value));
        }
    }
    
    Ok(data)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Get API key from environment
    let api_key = std::env::var("FRED_API_KEY")
        .expect("FRED_API_KEY environment variable must be set");
    
    println!("Fetching GDP components from FRED...");
    
    // Fetch series
    // PCDG - Personal Consumption Expenditures: Durable Goods
    // PRFI - Private Residential Fixed Investment  
    // Y033RC1Q027SBEA - Equipment investment (chained 2017 dollars)
    // GDP - Gross Domestic Product
    
    let durables = fetch_fred_series("PCDG", &api_key)?;
    let residential = fetch_fred_series("PRFI", &api_key)?;
    let equipment = fetch_fred_series("Y033RC1Q027SBEA", &api_key)?;
    let total_gdp = fetch_fred_series("GDP", &api_key)?;
    
    println!("Fetched {} durable goods observations", durables.len());
    println!("Fetched {} residential investment observations", residential.len());
    println!("Fetched {} equipment investment observations", equipment.len());
    println!("Fetched {} total GDP observations", total_gdp.len());
    
    // Merge data by quarter
    let mut quarterly_map: HashMap<String, QuarterlyData> = HashMap::new();
    
    for (date, value) in &total_gdp {
        quarterly_map.insert(date.clone(), QuarterlyData {
            date: date.clone(),
            cyclical_gdp: 0.0,
            non_cyclical_gdp: 0.0,
            total_gdp: *value,
            cyclical_share: 0.0,
            durables: 0.0,
            residential: 0.0,
            equipment: 0.0,
        });
    }
    
    // Add durable goods
    for (date, value) in &durables {
        if let Some(entry) = quarterly_map.get_mut(date) {
            entry.durables = *value;
            entry.cyclical_gdp += *value;
        }
    }
    
    // Add residential investment
    for (date, value) in &residential {
        if let Some(entry) = quarterly_map.get_mut(date) {
            entry.residential = *value;
            entry.cyclical_gdp += *value;
        }
    }
    
    // Add equipment investment  
    for (date, value) in &equipment {
        if let Some(entry) = quarterly_map.get_mut(date) {
            entry.equipment = *value;
            entry.cyclical_gdp += *value;
        }
    }
    
    // Calculate non-cyclical and shares
    for entry in quarterly_map.values_mut() {
        entry.non_cyclical_gdp = entry.total_gdp - entry.cyclical_gdp;
        entry.cyclical_share = (entry.cyclical_gdp / entry.total_gdp) * 100.0;
    }
    
    // Sort by date
    let mut data_vec: Vec<QuarterlyData> = quarterly_map.into_values().collect();
    data_vec.sort_by(|a, b| a.date.cmp(&b.date));
    
    // Calculate contraction frequencies
    let mut cyclical_contractions = 0;
    let mut non_cyclical_contractions = 0;
    let mut total_contractions = 0;
    let total_quarters = data_vec.len() - 1;
    
    for i in 1..data_vec.len() {
        let prev = &data_vec[i - 1];
        let curr = &data_vec[i];
        
        if curr.cyclical_gdp < prev.cyclical_gdp {
            cyclical_contractions += 1;
        }
        if curr.non_cyclical_gdp < prev.non_cyclical_gdp {
            non_cyclical_contractions += 1;
        }
        if curr.total_gdp < prev.total_gdp {
            total_contractions += 1;
        }
    }
    
    let cyclical_pct = (cyclical_contractions as f64 / total_quarters as f64) * 100.0;
    let non_cyclical_pct = (non_cyclical_contractions as f64 / total_quarters as f64) * 100.0;
    let total_pct = (total_contractions as f64 / total_quarters as f64) * 100.0;
    
    println!("\n=== CONTRACTION FREQUENCIES ===");
    println!("Cyclical GDP: {}/{} quarters = {:.1}%", cyclical_contractions, total_quarters, cyclical_pct);
    println!("Non-Cyclical GDP: {}/{} quarters = {:.1}%", non_cyclical_contractions, total_quarters, non_cyclical_pct);
    println!("Total GDP: {}/{} quarters = {:.1}%", total_contractions, total_quarters, total_pct);
    
    // Save to JSON
    let json = serde_json::to_string_pretty(&data_vec)?;
    fs::write("data/cyclical_gdp_data.json", json)?;
    
    // Generate JavaScript file
    let js_data = format!(
        "const cyclicalGdpData = {};\n\nconst contractionStats = {{\n  cyclical: {:.1},\n  nonCyclical: {:.1},\n  total: {:.1}\n}};",
        serde_json::to_string_pretty(&data_vec)?,
        cyclical_pct,
        non_cyclical_pct,
        total_pct
    );
    
    fs::write("data/cyclical_gdp_data.js", js_data)?;
    
    println!("\nData saved to data/cyclical_gdp_data.json and data/cyclical_gdp_data.js");
    
    Ok(())
}
