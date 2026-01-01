#!/bin/bash
set -e

echo "Updating data for recession-unemployment post..."

cd "$(dirname "$0")/scripts"

echo "→ Fetching unemployment data..."
cargo run --release --bin fetch_unemployment

echo "→ Fetching GDP data..."
cargo run --release --bin fetch_gdp

echo "→ Fetching recession indicators..."
cargo run --release --bin recession_indicator

echo "→ Calculating GDP growth..."
cargo run --release --bin gdp_growth

echo "→ Calculating GDP log difference..."
cargo run --release --bin gdp_log_diff

echo "→ Running unemployment-GDP analysis..."
cargo run --release --bin unemployment_gdp_analysis

echo "✓ Data update complete!"
echo "Restart the web server to see changes: docker compose restart web"
