# AAI1001 Data Engineering and Visualization

Team 12's project examines how Singapore's public transport ridership recovered from 2019 to 2025 and how the transport mix shifted between bus, MRT and LRT.

## Final presentation

- `team_project_presentation.html` - self-contained RevealJS presentation
- `team12_final_presentation.zip` - forum-ready package containing the presentation, source code and data

## Repository structure

- `submission_source/` - Quarto source, styling, data and reproducible processing script
- `proposal/` - project proposal and supporting files
- `rehearsal/` - presentation run sheet, checklist and Q&A preparation

## Reproduce the presentation

From `submission_source/`, run:

```powershell
Rscript scripts/build_ridership_metrics.R
quarto render team_project_presentation.qmd
```

The project uses official Land Transport Authority yearly public transport ridership data. Full source details are recorded in `submission_source/data/raw/SOURCE.md`.
