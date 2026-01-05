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

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DataPoint {
    date: String,
    m2: Option<f64>,
    cpi: Option<f64>,
    pce: Option<f64>,
    core_cpi: Option<f64>,
    velocity: Option<f64>,
    monetary_base: Option<f64>,
    m2_yoy: Option<f64>,
    cpi_yoy: Option<f64>,
    pce_yoy: Option<f64>,
}

#[derive(Debug, Serialize)]
struct AnalysisStats {
    total_quarters: usize,
    correlation_m2_cpi: f64,
    correlation_m2_pce: f64,
    avg_m2_growth: f64,
    avg_cpi_inflation: f64,
    avg_pce_inflation: f64,
    periods: HashMap<String, PeriodStats>,
}

#[derive(Debug, Serialize)]
struct PeriodStats {
    start: String,
    end: String,
    m2_growth: f64,
    cpi_inflation: f64,
    description: String,
}

fn fetch_fred_series(series_id: &str, api_key: &str) -> Result<Vec<FredObservation>, Box<dyn std::error::Error>> {
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id={}&api_key={}&file_type=json&observation_start=1960-01-01",
        series_id, api_key
    );
    
    println!("Fetching {} from FRED...", series_id);
    let response: FredResponse = reqwest::blocking::get(&url)?.json()?;
    println!("  ✓ Got {} observations", response.observations.len());
    
    Ok(response.observations)
}

fn parse_value(value: &str) -> Option<f64> {
    if value == "." {
        None
    } else {
        value.parse::<f64>().ok()
    }
}

fn calculate_yoy_growth(data: &[DataPoint], field: &str) -> Vec<DataPoint> {
    let mut result = data.to_vec();
    
    for i in 4..result.len() {
        let current_value = match field {
            "m2" => result[i].m2,
            "cpi" => result[i].cpi,
            "pce" => result[i].pce,
            _ => continue,
        };
        
        let year_ago_value = match field {
            "m2" => result[i - 4].m2,
            "cpi" => result[i - 4].cpi,
            "pce" => result[i - 4].pce,
            _ => continue,
        };
        
        if let (Some(current), Some(year_ago)) = (current_value, year_ago_value) {
            let yoy = ((current - year_ago) / year_ago) * 100.0;
            match field {
                "m2" => result[i].m2_yoy = Some(yoy),
                "cpi" => result[i].cpi_yoy = Some(yoy),
                "pce" => result[i].pce_yoy = Some(yoy),
                _ => {}
            }
        }
    }
    
    result
}

fn calculate_correlation(data: &[DataPoint]) -> f64 {
    let pairs: Vec<(f64, f64)> = data.iter()
        .filter_map(|d| {
            if let (Some(m2), Some(cpi)) = (d.m2_yoy, d.cpi_yoy) {
                Some((m2, cpi))
            } else {
                None
            }
        })
        .collect();
    
    if pairs.is_empty() {
        return 0.0;
    }
    
    let n = pairs.len() as f64;
    let sum_x: f64 = pairs.iter().map(|(x, _)| x).sum();
    let sum_y: f64 = pairs.iter().map(|(_, y)| y).sum();
    let sum_xy: f64 = pairs.iter().map(|(x, y)| x * y).sum();
    let sum_x2: f64 = pairs.iter().map(|(x, _)| x * x).sum();
    let sum_y2: f64 = pairs.iter().map(|(_, y)| y * y).sum();
    
    let numerator = n * sum_xy - sum_x * sum_y;
    let denominator = ((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)).sqrt();
    
    if denominator == 0.0 {
        0.0
    } else {
        numerator / denominator
    }
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n=== Money Supply & Inflation Data Fetcher ===\n");
    
    let api_key = env::var("FRED_API_KEY")
        .expect("FRED_API_KEY environment variable must be set");
    
    // Fetch all series
    let m2_data = fetch_fred_series("M2SL", &api_key)?;
    let cpi_data = fetch_fred_series("CPIAUCSL", &api_key)?;
    let pce_data = fetch_fred_series("PCEPI", &api_key)?;
    let core_cpi_data = fetch_fred_series("CPILFESL", &api_key)?;
    let velocity_data = fetch_fred_series("M2V", &api_key)?;
    let base_data = fetch_fred_series("BOGMBASE", &api_key)?;
    
    // Convert to hashmaps for easier lookup
    let m2_map: HashMap<String, f64> = m2_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let cpi_map: HashMap<String, f64> = cpi_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let pce_map: HashMap<String, f64> = pce_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let core_cpi_map: HashMap<String, f64> = core_cpi_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let velocity_map: HashMap<String, f64> = velocity_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let base_map: HashMap<String, f64> = base_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    // Get all unique dates and sort
    let mut all_dates: Vec<String> = m2_map.keys().cloned().collect();
    all_dates.sort();
    
    // Merge all data
    let mut merged_data: Vec<DataPoint> = all_dates.iter()
        .map(|date| DataPoint {
            date: date.clone(),
            m2: m2_map.get(date).copied(),
            cpi: cpi_map.get(date).copied(),
            pce: pce_map.get(date).copied(),
            core_cpi: core_cpi_map.get(date).copied(),
            velocity: velocity_map.get(date).copied(),
            monetary_base: base_map.get(date).copied(),
            m2_yoy: None,
            cpi_yoy: None,
            pce_yoy: None,
        })
        .collect();
    
    println!("\nCalculating year-over-year growth rates...");
    merged_data = calculate_yoy_growth(&merged_data, "m2");
    merged_data = calculate_yoy_growth(&merged_data, "cpi");
    merged_data = calculate_yoy_growth(&merged_data, "pce");
    
    println!("Calculating correlations...");
    let correlation = calculate_correlation(&merged_data);
    
    // Calculate summary statistics
    let valid_points: Vec<&DataPoint> = merged_data.iter()
        .filter(|d| d.m2_yoy.is_some() && d.cpi_yoy.is_some())
        .collect();
    
    let avg_m2: f64 = valid_points.iter()
        .filter_map(|d| d.m2_yoy)
        .sum::<f64>() / valid_points.len() as f64;
    
    let avg_cpi: f64 = valid_points.iter()
        .filter_map(|d| d.cpi_yoy)
        .sum::<f64>() / valid_points.len() as f64;
    
    let avg_pce: f64 = valid_points.iter()
        .filter_map(|d| d.pce_yoy)
        .sum::<f64>() / valid_points.len() as f64;
    
    // Define key periods
    let mut periods = HashMap::new();
    periods.insert("pre_volcker".to_string(), PeriodStats {
        start: "1960-01-01".to_string(),
        end: "1979-12-31".to_string(),
        m2_growth: 0.0,
        cpi_inflation: 0.0,
        description: "Pre-Volcker: High inflation era".to_string(),
    });
    
    periods.insert("great_moderation".to_string(), PeriodStats {
        start: "1980-01-01".to_string(),
        end: "2007-12-31".to_string(),
        m2_growth: 0.0,
        cpi_inflation: 0.0,
        description: "Great Moderation: Stable inflation".to_string(),
    });
    
    periods.insert("qe_era".to_string(), PeriodStats {
        start: "2008-01-01".to_string(),
        end: "2019-12-31".to_string(),
        m2_growth: 0.0,
        cpi_inflation: 0.0,
        description: "QE Era: Money printing without inflation".to_string(),
    });
    
    periods.insert("covid_inflation".to_string(), PeriodStats {
        start: "2020-01-01".to_string(),
        end: "2024-12-31".to_string(),
        m2_growth: 0.0,
        cpi_inflation: 0.0,
        description: "COVID Era: Money printing WITH inflation".to_string(),
    });
    
    let stats = AnalysisStats {
        total_quarters: merged_data.len(),
        correlation_m2_cpi: correlation,
        correlation_m2_pce: 0.0, // Calculate if needed
        avg_m2_growth: avg_m2,
        avg_cpi_inflation: avg_cpi,
        avg_pce_inflation: avg_pce,
        periods,
    };
    
    // Write outputs
    println!("\nWriting data files...");
    
    let json_output = serde_json::to_string_pretty(&merged_data)?;
    fs::write("data/money_supply_data.json", json_output)?;
    println!("  ✓ data/money_supply_data.json");
    
    let js_output = format!(
        "const moneySupplyData = {};\n\nconst analysisStats = {};\n\nif (typeof module !== 'undefined' && module.exports) {{\n    module.exports = {{ moneySupplyData, analysisStats }};\n}}",
        serde_json::to_string_pretty(&merged_data)?,
        serde_json::to_string_pretty(&stats)?
    );
    fs::write("data/money_supply_data.js", js_output)?;
    println!("  ✓ data/money_supply_data.js");
    
    let stats_output = serde_json::to_string_pretty(&stats)?;
    fs::write("data/analysis_stats.json", stats_output)?;
    println!("  ✓ data/analysis_stats.json");
    
    println!("\n=== Summary ===");
    println!("Total data points: {}", merged_data.len());
    println!("M2-CPI correlation: {:.3}", correlation);
    println!("Avg M2 growth: {:.2}%", avg_m2);
    println!("Avg CPI inflation: {:.2}%", avg_cpi);
    println!("\n✓ Data fetch complete!\n");
    
    Ok(())
}
