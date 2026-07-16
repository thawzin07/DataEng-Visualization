# Build the 2019-2025 visualization-ready ridership dataset.
#
# This implementation uses only base R so it can be run directly in RStudio or
# with Rscript on a clean R installation. It writes deterministic CSV and
# JavaScript artifacts for the self-contained RevealJS presentation.

find_script_file <- function() {
  file_arg <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)
  if (length(file_arg) > 0L) {
    return(sub("^--file=", "", file_arg[[1L]]))
  }

  frame_files <- vapply(
    sys.frames(),
    function(frame) {
      if (is.null(frame$ofile)) "" else as.character(frame$ofile)
    },
    character(1L)
  )
  frame_files <- frame_files[nzchar(frame_files)]
  if (length(frame_files) > 0L) tail(frame_files, 1L) else NULL
}

script_file <- find_script_file()
root <- if (is.null(script_file)) {
  normalizePath(getwd(), winslash = "/", mustWork = TRUE)
} else {
  dirname(dirname(normalizePath(script_file, winslash = "/", mustWork = TRUE)))
}

input_path <- file.path(root, "data", "raw", "yearly_ave_daily_pt_ridership.csv")
output_path <- file.path(root, "data", "processed", "ridership_metrics_2019_2025.csv")
chart_data_path <- file.path(root, "data", "processed", "ridership_chart_data.js")
mode_labels <- c("Public Bus" = "Bus", "MRT" = "MRT", "LRT" = "LRT")

format_one_decimal <- function(value) {
  format(value, nsmall = 1L, scientific = FALSE, trim = TRUE)
}

format_integer <- function(value) {
  format(as.integer(value), scientific = FALSE, trim = TRUE)
}

json_quote <- function(value) {
  encodeString(as.character(value), quote = "\"")
}

format_keys <- function(keys) {
  if (length(keys) == 0L) "[]" else paste0("[", paste(sort(keys), collapse = ", "), "]")
}

read_source <- function() {
  source <- read.csv(
    input_path,
    stringsAsFactors = FALSE,
    check.names = FALSE,
    colClasses = c(year = "integer", mode = "character", ridership = "integer"),
    fileEncoding = "UTF-8-BOM"
  )

  required_columns <- c("year", "mode", "ridership")
  if (!all(required_columns %in% names(source))) {
    stop(
      sprintf(
        "Source must contain columns: %s",
        paste(required_columns, collapse = ", ")
      ),
      call. = FALSE
    )
  }

  keep <- source$year >= 2019L & source$year <= 2025L & source$mode %in% names(mode_labels)
  rows <- source[keep, required_columns, drop = FALSE]
  rows$mode <- unname(mode_labels[rows$mode])
  rownames(rows) <- NULL
  rows
}

build_metrics <- function(rows) {
  expected <- expand.grid(
    year = 2019:2025,
    mode = unname(mode_labels),
    stringsAsFactors = FALSE
  )
  expected_keys <- paste(expected$year, expected$mode, sep = "|")
  observed_keys <- paste(rows$year, rows$mode, sep = "|")

  if (nrow(rows) != length(expected_keys)) {
    stop(
      sprintf("Expected %d unique records, found %d rows", length(expected_keys), nrow(rows)),
      call. = FALSE
    )
  }
  if (!setequal(observed_keys, expected_keys)) {
    missing <- setdiff(expected_keys, observed_keys)
    extra <- setdiff(observed_keys, expected_keys)
    stop(
      sprintf(
        "Unexpected year-mode coverage; missing=%s, extra=%s",
        format_keys(missing),
        format_keys(extra)
      ),
      call. = FALSE
    )
  }
  if (any(rows$ridership < 0L)) {
    stop("Ridership values must be non-negative", call. = FALSE)
  }

  published_2025 <- c(Bus = 3841000L, MRT = 3490000L, LRT = 209000L)
  rows_2025 <- rows[rows$year == 2025L, , drop = FALSE]
  observed_2025 <- setNames(rows_2025$ridership, rows_2025$mode)
  observed_2025 <- observed_2025[names(published_2025)]
  if (!identical(unname(observed_2025), unname(published_2025))) {
    stop(
      sprintf(
        "2025 source values do not match the published LTA table: %s",
        paste(paste(names(observed_2025), observed_2025, sep = "="), collapse = ", ")
      ),
      call. = FALSE
    )
  }

  rows <- rows[order(rows$year, rows$mode), , drop = FALSE]
  rownames(rows) <- NULL

  baseline_rows <- rows[rows$year == 2019L, , drop = FALSE]
  baselines <- setNames(baseline_rows$ridership, baseline_rows$mode)
  totals <- tapply(rows$ridership, rows$year, sum)

  output <- data.frame(
    year = rows$year,
    mode = rows$mode,
    ridership = rows$ridership,
    ridership_thousands = numeric(nrow(rows)),
    recovery_index = numeric(nrow(rows)),
    gap_from_2019 = integer(nrow(rows)),
    change_from_2019_pct = numeric(nrow(rows)),
    year_on_year_pct = rep(NA_real_, nrow(rows)),
    mode_share_pct = numeric(nrow(rows)),
    stringsAsFactors = FALSE
  )

  prior <- setNames(rep(NA_integer_, length(mode_labels)), unname(mode_labels))
  for (index in seq_len(nrow(rows))) {
    year <- rows$year[[index]]
    mode <- rows$mode[[index]]
    ridership <- rows$ridership[[index]]
    baseline <- baselines[[mode]]
    previous <- prior[[mode]]

    output$ridership_thousands[[index]] <- round(ridership / 1000, 1L)
    output$recovery_index[[index]] <- round(ridership / baseline * 100, 1L)
    output$gap_from_2019[[index]] <- ridership - baseline
    output$change_from_2019_pct[[index]] <- round((ridership / baseline - 1) * 100, 1L)
    if (!is.na(previous)) {
      output$year_on_year_pct[[index]] <- round((ridership / previous - 1) * 100, 1L)
    }
    output$mode_share_pct[[index]] <- round(ridership / totals[[as.character(year)]] * 100, 1L)
    prior[[mode]] <- ridership
  }

  output
}

write_metrics_csv <- function(metrics) {
  header <- paste(names(metrics), collapse = ",")
  lines <- vapply(seq_len(nrow(metrics)), function(index) {
    paste(
      format_integer(metrics$year[[index]]),
      metrics$mode[[index]],
      format_integer(metrics$ridership[[index]]),
      format_one_decimal(metrics$ridership_thousands[[index]]),
      format_one_decimal(metrics$recovery_index[[index]]),
      format_integer(metrics$gap_from_2019[[index]]),
      format_one_decimal(metrics$change_from_2019_pct[[index]]),
      if (is.na(metrics$year_on_year_pct[[index]])) "" else format_one_decimal(metrics$year_on_year_pct[[index]]),
      format_one_decimal(metrics$mode_share_pct[[index]]),
      sep = ","
    )
  }, character(1L))

  dir.create(dirname(output_path), recursive = TRUE, showWarnings = FALSE)
  writeBin(charToRaw(paste0(paste(c(header, lines), collapse = "\r\n"), "\r\n")), output_path)
}

write_chart_data <- function(metrics) {
  rows <- vapply(seq_len(nrow(metrics)), function(index) {
    paste0(
      "{\"year\":", format_integer(metrics$year[[index]]),
      ",\"mode\":", json_quote(metrics$mode[[index]]),
      ",\"ridership\":", format_integer(metrics$ridership[[index]]),
      ",\"recovery_index\":", format_one_decimal(metrics$recovery_index[[index]]),
      ",\"gap_from_2019\":", format_integer(metrics$gap_from_2019[[index]]),
      ",\"year_on_year_pct\":",
      if (is.na(metrics$year_on_year_pct[[index]])) "null" else format_one_decimal(metrics$year_on_year_pct[[index]]),
      ",\"mode_share_pct\":", format_one_decimal(metrics$mode_share_pct[[index]]),
      "}"
    )
  }, character(1L))

  javascript <- paste0("window.RIDERSHIP_CHART_DATA = [", paste(rows, collapse = ","), "];\r\n")
  writeBin(charToRaw(javascript), chart_data_path)
}

main <- function() {
  metrics <- build_metrics(read_source())
  write_metrics_csv(metrics)
  write_chart_data(metrics)
  message(sprintf("Wrote %d rows to %s", nrow(metrics), output_path))
  message(sprintf("Wrote chart data to %s", chart_data_path))
}

main()
