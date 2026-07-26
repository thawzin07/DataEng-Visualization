# Q&A Preparation

## Why use 2019 as the baseline?

It is the last pre-Covid year in the selected news story, so it provides a fixed reference for evaluating recovery from 2020 to 2025.

## Why replace stacked bars with indexed lines?

Only the first segment of a stacked bar has a common baseline. Indexing gives Bus, MRT and LRT the same 2019 reference and prevents LRT from collapsing into a thin segment.

## Why is this still one visualization rather than a dashboard?

The buttons change the metric displayed by the same chart object. They do not create separate charts, panels or independent views.

## Why use the yearly dataset instead of monthly data?

The original story is annual, and LTA publishes an authoritative annual table. Reconstructing yearly figures from monthly averages can introduce weighting problems because months have different lengths.

## Does the dataset satisfy the four-dimension recommendation?

Yes. The chart-ready data includes year, mode, ridership and multiple derived measures, including recovery index, gap from 2019, year-on-year change and mode share.

## What is the main finding?

Total average daily ridership reached 98.0% of 2019 by 2025, but MRT was 3.1% above its baseline while Bus remained 6.3% below it.

## Why did MRT gain share while Bus lost share?

The dataset establishes the shift but not its cause. Explaining causality would require additional evidence about network changes, work patterns, trip purpose and traveller behaviour.

## How do you know the figures are correct?

The R script checks complete year-mode coverage, non-negative values and the official 2025 LTA figures before producing the processed CSV and chart-data resource.

## Why is JavaScript present in an R project?

R performs all data ingestion, validation, transformation and metric calculations. JavaScript only renders the interactive SVG and changes the displayed metric because RevealJS runs in a web browser; it does not replace the R data-engineering workflow.

## Why is the Bus share change shown as -2.4 percentage points?

The calculation uses unrounded shares: 53.296% in 2019 and 50.942% in 2025, a change of -2.354 percentage points, which rounds to -2.4.

## What changed from the proposal?

The recovery-index view and metric control were retained. The optional total line was omitted because it reduced mode-level readability; total ridership remains stated in the surrounding evidence. The final build remains in R but uses base R instead of multiple packages to reduce package-dependency risk when another team member reproduces the submission.
