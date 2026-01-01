# Economics Blog

A modular static blog displaying US economic indicators with interactive Chart.js visualizations.

## Architecture

**Production (Docker/GitHub Pages)**
- nginx serving static HTML + data files from root
- Each blog post is self-contained in its own directory
- No build step required for serving

**Development (Local Machine)**
- Each post has its own Rust scripts for data fetching and transformations
- Scripts output data to the post's local `data/` directory
- Run natively on your machine

## Quick Start

### 1. Run the website locally
```bash
docker compose up -d
# Visit http://localhost
```

### 2. Update data for a post
Each post has its own scripts directory. Navigate to the post and run:

```bash
# Example: Update unemployment-trend post
cd posts/unemployment-trend/scripts
cargo run --release --bin fetch_unemployment
cargo run --release --bin recession_indicator
cargo run --release --bin unemployment_trend_analysis

# Example: Update recession-unemployment post
cd posts/recession-unemployment/scripts
cargo run --release --bin fetch_unemployment
cargo run --release --bin fetch_gdp
cargo run --release --bin recession_indicator
cargo run --release --bin gdp_growth
cargo run --release --bin gdp_log_diff
cargo run --release --bin unemployment_gdp_analysis

# Then restart web server to see changes
docker compose restart web
```

Or use the convenience scripts in each post:
```bash
cd posts/unemployment-trend
./update-data.sh

cd posts/recession-unemployment
./update-data.sh
```

## Project Structure

```
├── posts/
│   ├── YYYY-MM-DD-post-slug/      # Self-contained blog post (date-prefixed)
│   │   ├── index.html             # Post HTML
│   │   ├── meta.json              # Post metadata (title, date, excerpt)
│   │   ├── data/
│   │   │   ├── raw/               # Fetched from APIs
│   │   │   └── transformed/       # Calculated metrics
│   │   ├── scripts/               # Rust data tools
│   │   │   ├── Cargo.toml
│   │   │   └── src/
│   │   │       ├── fetchers/      # API data fetchers
│   │   │       └── transformations/ # Data processing
│   │   └── update-data.sh         # Convenience script
│   │
│   ├── 2025-12-15-unemployment-trend/
│   ├── 2025-12-20-recession-unemployment/
│   └── 2025-12-30-global-organizations/
│
├── index.html                     # Landing page (auto-generated)
├── about.html                     # About page
├── nginx.conf                     # Web server config
├── compose.yml                    # Docker configuration
└── generate-index.js              # Generates index.html from post metadata
```

## GitHub Pages Deployment

Configure GitHub Pages to serve from the root directory. The structure works seamlessly because:
- HTML and JS files are served normally
- Rust source files (`.rs`, `Cargo.toml`) are ignored by the web server
- Each post's data is relative to its own directory

## Adding a New Post

1. Create a new directory under `posts/` with date prefix:
```bash
mkdir -p posts/YYYY-MM-DD-my-new-post/{data/{raw,transformed},scripts/src/{fetchers,transformations}}
```

2. Create `meta.json` with post metadata:
```json
{
  "title": "My New Post Title",
  "date": "YYYY-MM-DD",
  "excerpt": "A brief description of the post content."
}
```

3. Copy and customize a `Cargo.toml` from an existing post

4. Create your Rust fetchers and transformations

5. Create your `index.html` with visualizations

6. Create an `update-data.sh` script for convenience

7. **Generate the index page**:
```bash
node generate-index.js
```

The home page will automatically list posts in reverse chronological order (newest first) with pagination (10 posts per page).

## Development

- Each post's Rust scripts are independent
- Data files are committed to git for static hosting
- Update data locally, commit, and push to deploy
- No build process needed for the website itself

## Testing

Each post has its own test file. Run tests for a specific post:

```bash
# Test unemployment-trend post
cd posts/unemployment-trend
npm install jsdom
node test.js

# Test recession-unemployment post
cd posts/recession-unemployment
npm install jsdom
node test.js

# Or use Docker:
docker compose --profile tools run --rm -e POST=unemployment-trend test
docker compose --profile tools run --rm -e POST=recession-unemployment test
```
│   ├── src/fetchers/     # API data fetchers
│   └── src/transformations/  # Data processors
└── compose.yml            # Just the web service for production
```

## Data Pipeline

1. **Fetch** → Pull raw economic data from FRED API
   - GDP levels, unemployment rates, etc.
   
2. **Transform** → Calculate derived metrics
   - Growth rates (percentage change)
   - Log differences (continuously compounded)
   - Moving averages, technical indicators (future)

3. **Serve** → nginx mounts data directories
   - No file copying
   - Hot reload on data changes

## Development Notes

- **No Docker build for data tools** - they run with local Rust installation
- **Directory mounts, not individual files** - add new files without updating compose.yml
- **Data tools are dev-only** - production just serves static files
- **API Key**: Stored in `.env` file (gitignored)

## Future Additions

- More indicators: ISM PMI, Consumer Confidence, Yield Curve
- Advanced transformations: Moving averages, volatility, correlations
- Libraries ready to add: ta-rs, augurs, scirs2
