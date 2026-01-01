#!/bin/bash
set -e

echo "Updating data for unemployment-trend post..."

cd "$(dirname "$0")/scripts"

echo "→ Fetching unemployment data..."
cargo run --release --bin fetch_unemployment

echo "→ Fetching recession indicators..."
cargo run --release --bin recession_indicator

echo "→ Running unemployment trend analysis..."
cargo run --release --bin unemployment_trend_analysis

echo "✓ Data update complete!"
echo "Restart the web server to see changes: docker compose restart web"
