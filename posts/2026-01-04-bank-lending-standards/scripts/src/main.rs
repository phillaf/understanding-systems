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
    ci_standards: Option<f64>,      // C&I lending standards (tightening %)
    consumer_standards: Option<f64>, // Consumer lending standards
    mortgage_standards: Option<f64>, // Mortgage lending standards
    ci_demand: Option<f64>,          // C&I loan demand
    ci_loans: Option<f64>,           // Total C&I loans outstanding
    consumer_credit: Option<f64>,    // Total consumer credit
    yield_curve: Option<f64>,        // 10Y-2Y spread
    recession: bool,                 // NBER recession indicator
}

#[derive(Debug, Serialize)]
struct RecessionTiming {
    recession_start: String,
    peak_tightening: Option<String>,
    peak_tightening_value: Option<f64>,
    lead_time_months: Option<i32>,
}

#[derive(Debug, Serialize)]
struct AnalysisStats {
    total_quarters: usize,
    recessions_analyzed: Vec<RecessionTiming>,
    avg_lead_time_months: f64,
    tightening_threshold: f64,
    false_signals: Vec<String>,
}

fn fetch_fred_series(series_id: &str, api_key: &str) -> Result<Vec<FredObservation>, Box<dyn std::error::Error>> {
    let url = format!(
        "https://api.stlouisfed.org/fred/series/observations?series_id={}&api_key={}&file_type=json&observation_start=1990-01-01",
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

fn find_recession_periods(data: &[DataPoint]) -> Vec<(String, String)> {
    let mut periods = Vec::new();
    let mut in_recession = false;
    let mut start_date = String::new();
    
    for point in data {
        if point.recession && !in_recession {
            in_recession = true;
            start_date = point.date.clone();
        } else if !point.recession && in_recession {
            in_recession = false;
            periods.push((start_date.clone(), point.date.clone()));
        }
    }
    
    periods
}

fn find_peak_tightening_before_recession(
    data: &[DataPoint],
    recession_start: &str,
    lookback_quarters: usize,
) -> Option<(String, f64)> {
    let recession_idx = data.iter().position(|d| d.date == recession_start)?;
    
    if recession_idx < lookback_quarters {
        return None;
    }
    
    let search_start = recession_idx.saturating_sub(lookback_quarters);
    let search_data = &data[search_start..recession_idx];
    
    let mut max_tightening = f64::NEG_INFINITY;
    let mut max_date = String::new();
    
    for point in search_data {
        if let Some(standards) = point.ci_standards {
            if standards > max_tightening {
                max_tightening = standards;
                max_date = point.date.clone();
            }
        }
    }
    
    if max_tightening > 0.0 {
        Some((max_date, max_tightening))
    } else {
        None
    }
}

fn calculate_lead_time_months(peak_date: &str, recession_start: &str) -> Option<i32> {
    // Simple quarter difference * 3 for monthly approximation
    let peak_parts: Vec<&str> = peak_date.split('-').collect();
    let recession_parts: Vec<&str> = recession_start.split('-').collect();
    
    if peak_parts.len() < 2 || recession_parts.len() < 2 {
        return None;
    }
    
    let peak_year: i32 = peak_parts[0].parse().ok()?;
    let peak_month: i32 = peak_parts[1].parse().ok()?;
    
    let recession_year: i32 = recession_parts[0].parse().ok()?;
    let recession_month: i32 = recession_parts[1].parse().ok()?;
    
    let months = (recession_year - peak_year) * 12 + (recession_month - peak_month);
    
    Some(months)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("\n=== Bank Lending Standards Data Fetcher ===\n");
    
    let api_key = env::var("FRED_API_KEY")
        .expect("FRED_API_KEY environment variable must be set");
    
    // Fetch all series
    println!("Fetching lending standards data...");
    let ci_standards_data = fetch_fred_series("DRTSCILM", &api_key)?;  // C&I tightening standards
    let consumer_standards_data = fetch_fred_series("DRTSCLCC", &api_key)?;  // Consumer standards
    let mortgage_standards_data = fetch_fred_series("DRTSSP", &api_key)?;  // Mortgage standards
    
    println!("Fetching yield curve data...");
    let yield_curve_data = fetch_fred_series("T10Y2Y", &api_key)?;  // 10Y-2Y spread
    
    // Skip CI demand - may not be available
    let ci_loans_data = fetch_fred_series("BUSLOANS", &api_key)?;  // Total C&I loans
    let consumer_credit_data = fetch_fred_series("TOTALSL", &api_key)?;  // Total consumer credit
    let recession_data = fetch_fred_series("USREC", &api_key)?;  // NBER recession indicator
    
    // Convert to hashmaps
    let ci_standards_map: HashMap<String, f64> = ci_standards_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let consumer_standards_map: HashMap<String, f64> = consumer_standards_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let mortgage_standards_map: HashMap<String, f64> = mortgage_standards_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let yield_curve_map: HashMap<String, f64> = yield_curve_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let ci_loans_map: HashMap<String, f64> = ci_loans_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let consumer_credit_map: HashMap<String, f64> = consumer_credit_data.iter()
        .filter_map(|obs| parse_value(&obs.value).map(|v| (obs.date.clone(), v)))
        .collect();
    
    let recession_map: HashMap<String, bool> = recession_data.iter()
        .map(|obs| (obs.date.clone(), obs.value == "1"))
        .collect();
    
    // Get all unique dates and sort
    let mut all_dates: Vec<String> = ci_standards_map.keys().cloned().collect();
    all_dates.sort();
    
    // Helper function to find nearest yield curve value
    let find_nearest_yield_curve = |target_date: &str| -> Option<f64> {
        use chrono::NaiveDate;
        let target = NaiveDate::parse_from_str(target_date, "%Y-%m-%d").ok()?;
        
        // Look for yield curve data within 45 days before or after target
        let mut best_match: Option<(i64, f64)> = None;
        
        for (date, value) in &yield_curve_map {
            if let Ok(yc_date) = NaiveDate::parse_from_str(date, "%Y-%m-%d") {
                let diff_days = (target - yc_date).num_days().abs();
                if diff_days <= 45 {
                    if let Some((best_diff, _)) = best_match {
                        if diff_days < best_diff {
                            best_match = Some((diff_days, *value));
                        }
                    } else {
                        best_match = Some((diff_days, *value));
                    }
                }
            }
        }
        
        best_match.map(|(_, value)| value)
    };
    
    // Merge all data
    let merged_data: Vec<DataPoint> = all_dates.iter()
        .map(|date| DataPoint {
            date: date.clone(),
            ci_standards: ci_standards_map.get(date).copied(),
            consumer_standards: consumer_standards_map.get(date).copied(),
            yield_curve: find_nearest_yield_curve(date),
            mortgage_standards: mortgage_standards_map.get(date).copied(),
            ci_demand: None, // Removed due to data availability
            ci_loans: ci_loans_map.get(date).copied(),
            consumer_credit: consumer_credit_map.get(date).copied(),
            recession: *recession_map.get(date).unwrap_or(&false),
        })
        .collect();
    
    println!("\nAnalyzing recession timing...");
    let recession_periods = find_recession_periods(&merged_data);
    
    let mut recession_timings = Vec::new();
    for (start, _end) in &recession_periods {
        if let Some((peak_date, peak_value)) = find_peak_tightening_before_recession(&merged_data, start, 12) {
            let lead_time = calculate_lead_time_months(&peak_date, start);
            
            recession_timings.push(RecessionTiming {
                recession_start: start.clone(),
                peak_tightening: Some(peak_date),
                peak_tightening_value: Some(peak_value),
                lead_time_months: lead_time,
            });
        } else {
            recession_timings.push(RecessionTiming {
                recession_start: start.clone(),
                peak_tightening: None,
                peak_tightening_value: None,
                lead_time_months: None,
            });
        }
    }
    
    // Calculate average lead time
    let valid_lead_times: Vec<i32> = recession_timings.iter()
        .filter_map(|rt| rt.lead_time_months)
        .collect();
    
    let avg_lead_time = if !valid_lead_times.is_empty() {
        valid_lead_times.iter().sum::<i32>() as f64 / valid_lead_times.len() as f64
    } else {
        0.0
    };
    
    // Find false signals (tightening > threshold but no recession within 12 months)
    let mut false_signals = Vec::new();
    let threshold = 20.0; // Net percentage of banks tightening
    
    for (i, point) in merged_data.iter().enumerate() {
        if let Some(standards) = point.ci_standards {
            if standards > threshold {
                // Check if recession occurs within next 12 months (4 quarters)
                let future_window = &merged_data[i..std::cmp::min(i + 5, merged_data.len())];
                let recession_occurs = future_window.iter().any(|p| p.recession);
                
                if !recession_occurs && i < merged_data.len() - 5 {
                    false_signals.push(point.date.clone());
                }
            }
        }
    }
    
    let false_signals_count = false_signals.len();
    
    let stats = AnalysisStats {
        total_quarters: merged_data.len(),
        recessions_analyzed: recession_timings,
        avg_lead_time_months: avg_lead_time,
        tightening_threshold: threshold,
        false_signals,
    };
    
    // Write outputs
    println!("\nWriting data files...");
    
    let json_output = serde_json::to_string_pretty(&merged_data)?;
    fs::write("data/lending_standards_data.json", json_output)?;
    println!("  ✓ data/lending_standards_data.json");
    
    let js_output = format!(
        "const lendingStandardsData = {};\n\nconst analysisStats = {};\n\nif (typeof module !== 'undefined' && module.exports) {{\n    module.exports = {{ lendingStandardsData, analysisStats }};\n}}",
        serde_json::to_string_pretty(&merged_data)?,
        serde_json::to_string_pretty(&stats)?
    );
    fs::write("data/lending_standards_data.js", js_output)?;
    println!("  ✓ data/lending_standards_data.js");
    
    let stats_output = serde_json::to_string_pretty(&stats)?;
    fs::write("data/analysis_stats.json", stats_output)?;
    println!("  ✓ data/analysis_stats.json");
    
    println!("\n=== Summary ===");
    println!("Total quarters: {}", merged_data.len());
    println!("Recessions analyzed: {}", stats.recessions_analyzed.len());
    println!("Average lead time: {:.1} months", avg_lead_time);
    println!("False signals (>{:.0}% tightening, no recession): {}", threshold, false_signals_count);
    println!("\n✓ Data fetch complete!\n");
    
    Ok(())
}
