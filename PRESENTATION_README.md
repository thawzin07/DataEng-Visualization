# Reproducing the RevealJS Presentation

## Requirements

- R 4.x
- RStudio or `Rscript`
- Quarto 1.9 or later

The final package was verified with R 4.6.0, RStudio 2026.04 and Quarto 1.9.37. The data build uses only base R, so no additional R packages are required.

## Build in RStudio

1. Open the extracted project folder in RStudio.
2. Run this command in the R Console:

```r
source("scripts/build_ridership_metrics.R")
```

3. Open `team_project_presentation.qmd` and select **Render**.

## Command-line alternative

From the project folder, run:

```powershell
Rscript scripts\build_ridership_metrics.R
quarto render team_project_presentation.qmd
```

The build script reads `data/raw/yearly_ave_daily_pt_ridership.csv` and writes:

- `data/processed/ridership_metrics_2019_2025.csv`
- `data/processed/ridership_chart_data.js`

Quarto embeds the generated chart-data resource, styling and image into the final self-contained `team_project_presentation.html`.

R performs the ingestion, validation and metric calculations. The small JavaScript block in the `.qmd` only draws the interactive SVG and switches its displayed metric inside RevealJS.

## Presenting

Open `team_project_presentation.html` in Chrome or Edge. Use the arrow keys to navigate and press `F` for full screen. No local server or internet connection is required for the slides or interactive chart; internet access is only needed to open external source links.
