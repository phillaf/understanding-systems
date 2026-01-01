use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use chrono::Utc;
use ndarray::{Array1, Array2, Axis};
use linfa::prelude::*;
use linfa_linear::LinearRegression;
use linfa::Dataset as LinfaDataset;

#[derive(Debug, Deserialize)]
struct ChartData {
    labels: Vec<String>,
    datasets: Vec<Dataset>,
}

#[derive(Debug, Deserialize)]
struct Dataset {
    data: Vec<f64>,
}

#[derive(Debug, Serialize)]
struct AnalysisResult {
    labels: Vec<String>,
    datasets: Vec<AnalysisDataset>,
}

#[derive(Debug, Serialize)]
struct AnalysisDataset {
    label: String,
    data: Vec<CorrelationPoint>,
    #[serde(rename = "borderColor")]
    border_color: String,
    #[serde(rename = "backgroundColor")]
    background_color: String,
    tension: f64,
    #[serde(rename = "pointRadius")]
    point_radius: f64,
}

#[derive(Debug, Serialize)]
struct CorrelationPoint {
    x: String,
    y: f64,
}

fn parse_js_data(content: &str) -> Result<ChartData, Box<dyn std::error::Error>> {
    // Find the JSON object (starts after '=')
    let json_start = content.find('=').ok_or("No '=' found in JS file")?;
    let after_equals = &content[json_start + 1..];
    let json_start_brace = after_equals.find('{').ok_or("No '{' found")?;
    let json_str = &after_equals[json_start_brace..];
    
    // Find the end of the JSON (before semicolon or end)
    let json_end = json_str.rfind(';').unwrap_or(json_str.len());
    let json_str = &json_str[..json_end].trim();
    
    Ok(serde_json::from_str(json_str)?)
}

fn calculate_correlation(x: &[f64], y: &[f64]) -> f64 {
    let n = x.len() as f64;
    let mean_x: f64 = x.iter().sum::<f64>() / n;
    let mean_y: f64 = y.iter().sum::<f64>() / n;
    
    let mut numerator = 0.0;
    let mut sum_sq_x = 0.0;
    let mut sum_sq_y = 0.0;
    
    for i in 0..x.len() {
        let dx = x[i] - mean_x;
        let dy = y[i] - mean_y;
        numerator += dx * dy;
        sum_sq_x += dx * dx;
        sum_sq_y += dy * dy;
    }
    
    numerator / (sum_sq_x.sqrt() * sum_sq_y.sqrt())
}

fn calculate_cross_correlation(x: &[f64], y: &[f64], max_lag: usize) -> Vec<(i32, f64)> {
    let mut results = Vec::new();
    
    for lag in -(max_lag as i32)..=(max_lag as i32) {
        let (x_slice, y_slice) = if lag >= 0 {
            let lag = lag as usize;
            if lag >= x.len() {
                continue;
            }
            (&x[lag..], &y[..y.len().saturating_sub(lag)])
        } else {
            let lag = (-lag) as usize;
            if lag >= y.len() {
                continue;
            }
            (&x[..x.len().saturating_sub(lag)], &y[lag..])
        };
        
        let min_len = x_slice.len().min(y_slice.len());
        if min_len > 10 {
            let corr = calculate_correlation(&x_slice[..min_len], &y_slice[..min_len]);
            results.push((lag, corr));
        }
    }
    
    results
}

// Proper Granger causality test using linear regression
// Tests if X helps predict Y beyond Y's own history
fn granger_causality(x: &[f64], y: &[f64], max_lag: usize) -> Vec<(usize, f64)> {
    let mut results = Vec::new();
    
    for lag in 1..=max_lag {
        let n = y.len().saturating_sub(lag);
        if n < 20 || x.len() < n + lag {
            break;
        }
        
        // Build restricted model: Y[t] ~ Y[t-1] + Y[t-2] + ... + Y[t-lag]
        let mut y_target = Vec::new();
        let mut x_restricted = Vec::new();
        let mut x_unrestricted = Vec::new();
        
        for t in lag..n {
            if t >= y.len() {
                break;
            }
            y_target.push(y[t]);
            
            // Restricted features: only Y's own lags
            let mut features_restricted = Vec::new();
            for l in 1..=lag.min(3) {  // Use up to 3 lags for computational efficiency
                if t >= l {
                    features_restricted.push(y[t - l]);
                }
            }
            x_restricted.push(features_restricted.clone());
            
            // Unrestricted features: Y's lags + X's lags
            let mut features_unrestricted = features_restricted.clone();
            for l in 1..=lag.min(3) {
                if t >= l && t - l < x.len() {
                    features_unrestricted.push(x[t - l]);
                }
            }
            x_unrestricted.push(features_unrestricted);
        }
        
        if y_target.is_empty() || x_restricted.is_empty() || x_unrestricted.is_empty() {
            continue;
        }
        
        let n_samples = y_target.len();
        let n_features_restricted = x_restricted[0].len();
        let n_features_unrestricted = x_unrestricted[0].len();
        
        // Convert to ndarray
        let y_array = Array1::from(y_target.clone());
        
        // Restricted model
        let mut x_restricted_flat = Vec::new();
        for row in &x_restricted {
            x_restricted_flat.extend(row);
        }
        let x_restricted_array = Array2::from_shape_vec(
            (n_samples, n_features_restricted),
            x_restricted_flat
        );
        
        // Unrestricted model
        let mut x_unrestricted_flat = Vec::new();
        for row in &x_unrestricted {
            x_unrestricted_flat.extend(row);
        }
        let x_unrestricted_array = Array2::from_shape_vec(
            (n_samples, n_features_unrestricted),
            x_unrestricted_flat
        );
        
        if x_restricted_array.is_err() || x_unrestricted_array.is_err() {
            continue;
        }
        
        let x_restricted_array = x_restricted_array.unwrap();
        let x_unrestricted_array = x_unrestricted_array.unwrap();
        
        // Fit restricted model
        let dataset_restricted = LinfaDataset::new(x_restricted_array.clone(), y_array.clone());
        let model_restricted = LinearRegression::default().fit(&dataset_restricted);
        
        // Fit unrestricted model
        let dataset_unrestricted = LinfaDataset::new(x_unrestricted_array.clone(), y_array.clone());
        let model_unrestricted = LinearRegression::default().fit(&dataset_unrestricted);
        
        if model_restricted.is_err() || model_unrestricted.is_err() {
            continue;
        }
        
        let model_restricted = model_restricted.unwrap();
        let model_unrestricted = model_unrestricted.unwrap();
        
        // Calculate RSS for both models
        let pred_restricted = model_restricted.predict(&x_restricted_array);
        let pred_unrestricted = model_unrestricted.predict(&x_unrestricted_array);
        
        let rss_restricted: f64 = y_array.iter()
            .zip(pred_restricted.iter())
            .map(|(y_true, y_pred)| (*y_true - *y_pred).powi(2))
            .sum();
            
        let rss_unrestricted: f64 = y_array.iter()
            .zip(pred_unrestricted.iter())
            .map(|(y_true, y_pred)| (*y_true - *y_pred).powi(2))
            .sum();
        
        // Calculate F-statistic
        // F = ((RSS_restricted - RSS_unrestricted) / (p2 - p1)) / (RSS_unrestricted / (n - p2))
        // where p1 = # params in restricted, p2 = # params in unrestricted, n = sample size
        let df1 = (n_features_unrestricted - n_features_restricted) as f64;
        let df2 = (n_samples - n_features_unrestricted) as f64;
        
        let f_stat = if rss_unrestricted > 0.0 && df1 > 0.0 && df2 > 0.0 && rss_restricted > rss_unrestricted {
            ((rss_restricted - rss_unrestricted) / df1) / (rss_unrestricted / df2)
        } else {
            0.0
        };
        
        results.push((lag, f_stat.max(0.0)));
    }
    
    results
}

// Spectral coherence (simplified via windowed correlation in frequency domain proxy)
fn calculate_spectral_coherence(x: &[f64], y: &[f64], n_windows: usize) -> Vec<(String, f64)> {
    let mut results = Vec::new();
    let window_size = x.len() / n_windows;
    
    if window_size < 10 {
        return results;
    }
    
    for i in 0..n_windows {
        let start = i * window_size;
        let end = ((i + 1) * window_size).min(x.len());
        
        if end - start < 10 {
            break;
        }
        
        let x_window = &x[start..end];
        let y_window = &y[start..end];
        
        // Coherence is |correlation|² in simplified form
        let corr = calculate_correlation(x_window, y_window);
        let coherence = corr * corr;
        
        let freq_label = format!("Window {}", i + 1);
        results.push((freq_label, coherence));
    }
    
    results
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Analyzing correlation between unemployment and GDP log difference...");

    let raw_dir = Path::new("../data/raw");
    let transformed_dir = Path::new("../data/transformed");

    // Read unemployment data
    let unemployment_content = fs::read_to_string(raw_dir.join("unemployment.js"))?;
    let unemployment_data = parse_js_data(&unemployment_content)?;
    let unemployment_values = &unemployment_data.datasets[0].data;
    let dates = &unemployment_data.labels;

    // Read GDP log difference data
    let gdp_log_diff_content = fs::read_to_string(transformed_dir.join("gdp_log_diff.js"))?;
    let gdp_log_diff_data = parse_js_data(&gdp_log_diff_content)?;
    let gdp_log_diff_values = &gdp_log_diff_data.datasets[0].data;

    // Ensure we have matching data
    let min_len = unemployment_values.len().min(gdp_log_diff_values.len());
    let unemployment = &unemployment_values[..min_len];
    let gdp_growth = &gdp_log_diff_values[..min_len];
    let analysis_dates = &dates[..min_len];

    // Calculate change in unemployment rate for Okun's Law
    let mut unemployment_change = Vec::new();
    for i in 1..unemployment.len() {
        unemployment_change.push(unemployment[i] - unemployment[i-1]);
    }
    
    // Align GDP growth with unemployment change (both start from index 1)
    let gdp_growth_aligned = &gdp_growth[1..unemployment.len()];
    
    // Okun's Law correlation (change in unemployment vs GDP growth)
    let okun_correlation = calculate_correlation(&unemployment_change, gdp_growth_aligned);
    println!("  Okun's Law correlation (Δ unemployment vs GDP growth): {:.4}", okun_correlation);

    // Calculate simple correlation (unemployment rate vs GDP growth)
    let correlation = calculate_correlation(unemployment, gdp_growth);
    println!("  Pearson correlation (unemployment rate vs GDP growth): {:.4}", correlation);

    // Calculate cross-correlation: -10 to +20 quarters (focus on current cycle, not long-term business cycles)
    let cross_corr_full = calculate_cross_correlation(unemployment, gdp_growth, 20);
    let cross_corr: Vec<_> = cross_corr_full.into_iter()
        .filter(|(lag, _)| *lag >= -10 && *lag <= 20)
        .collect();
    println!("  Cross-correlation calculated for {} lags", cross_corr.len());

    // Calculate Granger causality: 3-15 quarters (exclude edge values where sample size degrades)
    let granger_unemp_to_gdp_full = granger_causality(unemployment, gdp_growth, 15);
    let granger_unemp_to_gdp: Vec<_> = granger_unemp_to_gdp_full.into_iter()
        .filter(|(lag, _)| *lag >= 3 && *lag <= 15)
        .collect();
    
    let granger_gdp_to_unemp_full = granger_causality(gdp_growth, unemployment, 15);
    let granger_gdp_to_unemp: Vec<_> = granger_gdp_to_unemp_full.into_iter()
        .filter(|(lag, _)| *lag >= 3 && *lag <= 15)
        .collect();
    println!("  Granger causality tests calculated");

    // Calculate spectral coherence
    let coherence = calculate_spectral_coherence(unemployment, gdp_growth, 10);
    println!("  Spectral coherence calculated for {} windows", coherence.len());

    // Create datasets for visualization
    let mut datasets = Vec::new();

    // Dataset 0: Okun's Law scatter plot (Δ unemployment vs GDP growth)
    let okun_points: Vec<CorrelationPoint> = unemployment_change
        .iter()
        .zip(gdp_growth_aligned.iter())
        .map(|(du, gdp)| CorrelationPoint {
            x: format!("{:.4}", gdp * 100.0), // GDP growth as percentage
            y: *du, // Change in unemployment rate (percentage points)
        })
        .collect();

    datasets.push(AnalysisDataset {
        label: "Okun's Law (Δ Unemployment vs GDP Growth)".to_string(),
        data: okun_points,
        border_color: "rgb(99, 132, 255)".to_string(),
        background_color: "rgba(99, 132, 255, 0.5)".to_string(),
        tension: 0.0,
        point_radius: 2.0,
    });

    // Dataset 2: Simple correlation over time (rolling window)
    let window_size = 40; // 10 years
    let mut rolling_corr_points = Vec::new();
    for i in window_size..min_len {
        let window_unemp = &unemployment[i - window_size..i];
        let window_gdp = &gdp_growth[i - window_size..i];
        let corr = calculate_correlation(window_unemp, window_gdp);
        rolling_corr_points.push(CorrelationPoint {
            x: analysis_dates[i].clone(),
            y: corr,
        });
    }

    datasets.push(AnalysisDataset {
        label: "Rolling Correlation (10yr window)".to_string(),
        data: rolling_corr_points,
        border_color: "rgb(75, 192, 192)".to_string(),
        background_color: "rgba(75, 192, 192, 0.2)".to_string(),
        tension: 0.4,
        point_radius: 1.0,
    });

    // Dataset 3: Cross-correlation at different lags
    let cross_corr_points: Vec<CorrelationPoint> = cross_corr
        .iter()
        .map(|(lag, corr)| CorrelationPoint {
            x: format!("Lag {} quarters", lag),
            y: *corr,
        })
        .collect();

    datasets.push(AnalysisDataset {
        label: "Cross-Correlation".to_string(),
        data: cross_corr_points,
        border_color: "rgb(255, 99, 132)".to_string(),
        background_color: "rgba(255, 99, 132, 0.2)".to_string(),
        tension: 0.1,
        point_radius: 3.0,
    });

    // Dataset 4: Granger causality (unemployment → GDP)
    let granger_unemp_points: Vec<CorrelationPoint> = granger_unemp_to_gdp
        .iter()
        .map(|(lag, f_stat)| CorrelationPoint {
            x: format!("Lag {}", lag),
            y: *f_stat,
        })
        .collect();

    datasets.push(AnalysisDataset {
        label: "Granger: Unemployment→GDP (F-stat)".to_string(),
        data: granger_unemp_points,
        border_color: "rgb(54, 162, 235)".to_string(),
        background_color: "rgba(54, 162, 235, 0.2)".to_string(),
        tension: 0.1,
        point_radius: 3.0,
    });

    // Dataset 5: Granger causality (GDP → unemployment)
    let granger_gdp_points: Vec<CorrelationPoint> = granger_gdp_to_unemp
        .iter()
        .map(|(lag, f_stat)| CorrelationPoint {
            x: format!("Lag {}", lag),
            y: *f_stat,
        })
        .collect();

    datasets.push(AnalysisDataset {
        label: "Granger: GDP→Unemployment (F-stat)".to_string(),
        data: granger_gdp_points,
        border_color: "rgb(255, 159, 64)".to_string(),
        background_color: "rgba(255, 159, 64, 0.2)".to_string(),
        tension: 0.1,
        point_radius: 3.0,
    });

    // Dataset 6: Spectral coherence
    let coherence_points: Vec<CorrelationPoint> = coherence
        .iter()
        .map(|(window, coh)| CorrelationPoint {
            x: window.clone(),
            y: *coh,
        })
        .collect();

    datasets.push(AnalysisDataset {
        label: "Spectral Coherence".to_string(),
        data: coherence_points,
        border_color: "rgb(153, 102, 255)".to_string(),
        background_color: "rgba(153, 102, 255, 0.2)".to_string(),
        tension: 0.1,
        point_radius: 3.0,
    });

    // Create output structure
    let result = AnalysisResult {
        labels: vec![], // Not used with point data
        datasets,
    };

    // Write to output file
    fs::create_dir_all(transformed_dir)?;
    let output = format!(
        "// Unemployment vs GDP Log Difference Analysis\n// Last updated: {}\n// Pearson correlation (Unemployment Rate vs GDP Growth): {:.4}\n// Okun's Law correlation (Δ Unemployment vs GDP Growth): {:.4}\n// Source: Transformed from unemployment.js and gdp_log_diff.js\nconst unemploymentGdpAnalysis = {};",
        Utc::now().format("%Y-%m-%d"),
        correlation,
        okun_correlation,
        serde_json::to_string_pretty(&result)?
    );
    fs::write(transformed_dir.join("unemployment_gdp_analysis.js"), output)?;

    println!("✓ Successfully wrote analysis data to ../data/transformed/unemployment_gdp_analysis.js");
    Ok(())
}
