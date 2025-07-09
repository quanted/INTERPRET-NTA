const getNumber = (d) => (Number.isNaN(d) ? "" : Number(d).toFixed(3));

const QNTAData = "Example_NTA_NTA_WebApp_qNTA.xlsx";
const QAQCData = "Example_NTA_NTA_WebApp_QAQC.xlsx";

const MainSheet = "Surrogate Detection Statistics";
const SlopeValsSheet = "Calibration Curve Metrics";
const QAQCSheet = "Decision Documentation";

// tvalue table
const tStatisticValues = {
  "50%": {
    1: 1.0,
    2: 0.816,
    3: 0.765,
    4: 0.741,
    5: 0.727,
    6: 0.718,
    7: 0.711,
    8: 0.706,
    9: 0.703,
    10: 0.7,
    11: 0.697,
    12: 0.695,
    13: 0.694,
    14: 0.692,
    15: 0.691,
    16: 0.69,
    17: 0.689,
    18: 0.688,
    19: 0.688,
    20: 0.687,
  },
  "60%": {
    1: 1.376,
    2: 1.061,
    3: 0.978,
    4: 0.941,
    5: 0.92,
    6: 0.906,
    7: 0.896,
    8: 0.889,
    9: 0.883,
    10: 0.897,
    11: 0.876,
    12: 0.873,
    13: 0.87,
    14: 0.868,
    15: 0.866,
    16: 0.865,
    17: 0.863,
    18: 0.862,
    19: 0.861,
    20: 0.86,
  },
  "70%": {
    1: 1.963,
    2: 1.386,
    3: 1.25,
    4: 1.19,
    5: 1.156,
    6: 1.134,
    7: 1.119,
    8: 1.108,
    9: 1.1,
    10: 1.093,
    11: 1.088,
    12: 1.083,
    13: 1.079,
    14: 1.076,
    15: 1.074,
    16: 1.071,
    17: 1.069,
    18: 1.067,
    19: 1.066,
    20: 1.064,
  },
  "80%": {
    1: 3.078,
    2: 1.886,
    3: 1.638,
    4: 1.533,
    5: 1.476,
    6: 1.44,
    7: 1.415,
    8: 1.397,
    9: 1.383,
    10: 1.372,
    11: 1.363,
    12: 1.356,
    13: 1.35,
    14: 1.345,
    15: 1.341,
    16: 1.337,
    17: 1.333,
    18: 1.33,
    19: 1.328,
    20: 1.325,
  },
  "90%": {
    1: 6.314,
    2: 2.92,
    3: 2.353,
    4: 2.132,
    5: 2.015,
    6: 1.943,
    7: 1.895,
    8: 1.86,
    9: 1.833,
    10: 1.812,
    11: 1.796,
    12: 1.782,
    13: 1.771,
    14: 1.761,
    15: 1.753,
    16: 1.746,
    17: 1.74,
    18: 1.734,
    19: 1.729,
    20: 1.725,
  },
  "95%": {
    1: 12.71,
    2: 4.303,
    3: 3.182,
    4: 2.776,
    5: 2.571,
    6: 2.447,
    7: 2.365,
    8: 2.306,
    9: 2.262,
    10: 2.228,
    11: 2.201,
    12: 2.179,
    13: 2.16,
    14: 2.145,
    15: 2.131,
    16: 2.12,
    17: 2.11,
    18: 2.101,
    19: 2.093,
    20: 2.086,
  },
  "98%": {
    1: 31.821,
    2: 6.965,
    3: 4.541,
    4: 3.747,
    5: 3.365,
    6: 3.143,
    7: 2.998,
    8: 2.896,
    9: 2.821,
    10: 2.764,
    11: 2.718,
    12: 2.681,
    13: 2.65,
    14: 2.624,
    15: 2.602,
    16: 2.583,
    17: 2.567,
    18: 2.552,
    19: 2.539,
    20: 2.528,
  },
  "99%": {
    1: 63.657,
    2: 9.925,
    3: 5.841,
    4: 4.604,
    5: 4.032,
    6: 3.707,
    7: 3.499,
    8: 3.355,
    9: 3.25,
    10: 3.169,
    11: 3.106,
    12: 3.055,
    13: 3.012,
    14: 2.977,
    15: 2.947,
    16: 2.921,
    17: 2.898,
    18: 2.878,
    19: 2.861,
    20: 2.845,
  },
};

function getExcludedData(pointDataAll, qaqcData) {
  const excludedData = [];
  pointDataAll.forEach((row) => {
    if (!Array.isArray(row)) {
      if (!row["Enabled"]) {
        excludedData.push([
          row["Chemical Name"],
          row["Feature ID"],
          row["Sample Name"],
          qaqcData.filter(
            (q) =>
              q["Feature ID"] === row["Feature ID"] &&
              Number.isNaN(parseFloat(q[`Mean ${row["Sample Name"]}`]))
          ).length > 0
            ? qaqcData.filter((q) => q["Feature ID"] === row["Feature ID"])[0][
                `Mean ${row["Sample Name"]}`
              ]
            : "None",
        ]);
      }
    }
  });

  return excludedData;
}

// setup a data structure for generating 1x1, 2x2, 3x3 and 4x4 plots
const resolutionData = {
  gridID: "svg-grid-container",
  "1x1": {
    n: 1,
    svgIDs: ["svg00"],
    ddIDs: ["dd00"], // dropdown IDs
    circleR: 15,
    bestFitLW: 6.5,
    "grid-template-columns": "1fr",
    "grid-template-rows": "1fr",
    svgWidth: 1110,
    svgHeight: 520,
    nYTicks: 7,
    fontSize: "24px",
  },
  "2x2": {
    n: 4,
    svgIDs: ["svg00", "svg01", "svg10", "svg11"],
    ddIDs: ["dd00", "dd01", "dd10", "dd11"],
    circleR: 11,
    bestFitLW: 5.5,
    "grid-template-columns": "1fr 1fr",
    "grid-template-rows": "auto 1fr",
    svgWidth: 550,
    svgHeight: 260,
    nYTicks: 5,
    fontSize: "22px",
  },
  "3x3": {
    n: 9,
    svgIDs: [
      "svg00",
      "svg01",
      "svg02",
      "svg10",
      "svg11",
      "svg12",
      "svg20",
      "svg21",
      "svg22",
    ],
    ddIDs: [
      "dd00",
      "dd01",
      "dd02",
      "dd10",
      "dd11",
      "dd12",
      "dd20",
      "dd21",
      "dd22",
    ],
    circleR: 7.5,
    bestFitLW: 4.5,
    "grid-template-columns": "1fr 1fr 1fr",
    "grid-template-rows": "auto 1fr 1fr",
    svgWidth: 363.5,
    svgHeight: 173.3,
    nYTicks: 5,
    fontSize: "20px",
  },
  "4x4": {
    n: 16,
    svgIDs: [
      "svg00",
      "svg01",
      "svg02",
      "svg03",
      "svg10",
      "svg11",
      "svg12",
      "svg13",
      "svg20",
      "svg21",
      "svg22",
      "svg23",
      "svg30",
      "svg31",
      "svg32",
      "svg33",
    ],
    ddIDs: [
      "dd00",
      "dd01",
      "dd02",
      "dd03",
      "dd10",
      "dd11",
      "dd12",
      "dd13",
      "dd20",
      "dd21",
      "dd22",
      "dd23",
      "dd30",
      "dd31",
      "dd32",
      "dd33",
    ],
    circleR: 5,
    bestFitLW: 3.5,
    "grid-template-columns": "1fr 1fr 1fr 1fr",
    "grid-template-rows": "auto 1fr 1fr 1fr",
    svgWidth: 270,
    svgHeight: 130,
    nYTicks: 4,
    fontSize: "16px",
  },
};

/**
 * Returns the Positive AND Negative mode data from the INTERPRET NTA results .xlsx file.
 * @param {string} filePath Path to the INTERPRET NTA results .xlsx file.
 * @returns {[Object[], Object[]]} An array whose first element is an array of objects, one object for each row of data
 * for positive mode; and whose second element is an array of object for negative mode.
 */
async function readInterpretOutputXLSX(filePath) {
  // fetch file
  const qNTAresponse = await fetch(filePath + QNTAData);
  const qNTAArrayBuffer = await qNTAresponse.arrayBuffer();

  const qAQCResponse = await fetch(filePath + QAQCData);
  const qAQCArrayBuffer = await qAQCResponse.arrayBuffer();

  // access data from desired tracer detection sheet and write to json object
  const qNTAWorkbook = XLSX.read(new Uint8Array(qNTAArrayBuffer), {
    type: "array",
  });
  const qAQCWorkbook = XLSX.read(new Uint8Array(qAQCArrayBuffer), {
    type: "array",
  });
  const options = {
    header: 0, // Use the first row as headers
    defval: 0, // Set a default value for empty cells
    raw: true,
  };
  const jsonData = XLSX.utils.sheet_to_json(
    qNTAWorkbook.Sheets[MainSheet],
    options
  );

  const qAQCJsonData = XLSX.utils.sheet_to_json(
    qAQCWorkbook.Sheets[QAQCSheet],
    options
  );

  const filteredQAQCJsonData = qAQCJsonData.filter(
    (q) => q["Surrogate Chemical Match?"] !== 0
  );

  const slopeData = XLSX.utils.sheet_to_json(
    qNTAWorkbook.Sheets[SlopeValsSheet],
    options
  );

  return { main: jsonData, slope: slopeData, qaqc: filteredQAQCJsonData };
}

function cleanQaqcData(data) {
  const columnPrefix = "Mean";
  const keysToKeep = [];
  if (data.length > 0) {
    Object.keys(data[0]).forEach((k) => {
      if (k.startsWith(columnPrefix)) keysToKeep.push(k);
    });

    return data.map((d) => {
      const retObject = {};
      keysToKeep.forEach((k) => {
        retObject[k] = d[k];
      });
      return {
        ...retObject,
        ["Feature ID"]: d["Feature ID"],
      };
    });
  }
  return data;
}

/**
 * Cleans the XLSX input data by removing unwanted columns and generating the log10 of concentrations and
 * blank subtracted means. Also returns unique sample names (e.g., 10ppb, 100ppb, etc...)
 * @param {object[]} data The raw data pulled from the XLSX file.
 * @returns {object[], string[]} The cleaned data and an array of unique sample names.
 */
function cleanData(data) {
  const blankSubHeaderSuffix = "BlankSub Mean ";
  const controlSubBlankSubHeaderSuffix = "ControlSub BlankSub Mean";
  const concentrationHeaderSuffix = "Conc ";
  const columnsToKeep = [
    "Feature ID",
    "Chemical Name",
    "Ionization Mode",
    "Retention Time",
  ];

  // remove any unwanted columns from our data
  const uniqueSampleNames = [];
  data.forEach((row) => {
    Object.entries(row).forEach(([colName, value]) => {
      if (
        !columnsToKeep.includes(colName) &&
        !colName.startsWith(blankSubHeaderSuffix) &&
        !colName.startsWith(controlSubBlankSubHeaderSuffix) &&
        !colName.startsWith(concentrationHeaderSuffix)
      ) {
        delete row[colName];
        return;
      }

      // We need to append the ionization mode to the chemical name
      if (colName === "Chemical Name") {
        row[colName] = `${row[colName]} (${row["Ionization Mode"]})`;
        return;
      }

      // if blank subtracted mean OR concentration, go ahead and take the log
      if (colName.startsWith(concentrationHeaderSuffix)) {
        row[`log${colName}`] =
          Math.log10(value) !== -Infinity ? Math.log10(value) : undefined;
        const sampleName = colName.split(" ")[1];
        if (!uniqueSampleNames.includes(sampleName)) {
          uniqueSampleNames.push(sampleName);
        }
        return;
      }

      if (colName.startsWith(blankSubHeaderSuffix)) {
        row[`log${colName}`] =
          Math.log10(value) !== -Infinity ? Math.log10(value) : undefined;
      }

      if (colName.startsWith(controlSubBlankSubHeaderSuffix)) {
        row[`log${colName}`] =
          Math.log10(value) !== -Infinity ? Math.log10(value) : undefined;
      }
    });
  });
  return [data, uniqueSampleNames];
}

/**
 * Returns an array of objects, each holding data for a single point on the scatter plots.
 * @param {object[]} data The cleaned data.
 * @param {string[]} uniqueSampleNames The array of unique sample ground names (e.g., 10ppb, 100ppb, etc...)
 * @returns {object[]} An array of object, each mapped to a single point.
 */
function getPointData(data, uniqueSampleNames, qaqcData = []) {
  const columnsToKeep = [
    "Feature ID",
    "Chemical Name",
    "Ionization Mode",
    "Retention Time",
  ];

  const pointData = [];
  data.forEach((row) => {
    for (let sampleName of uniqueSampleNames) {
      const pointDatum = {};

      // remove undefined values
      if (
        (row[`logBlankSub Mean ${sampleName}`] === undefined &&
          row[`logControlSub BlankSub Mean ${sampleName}`] === undefined) ||
        row[`logConc ${sampleName}`] === undefined
      ) {
        continue;
      }

      pointDatum[`Conc`] = row[`Conc ${sampleName}`];
      pointDatum[`logConc`] = row[`logConc ${sampleName}`];
      pointDatum[`BlankSub Mean`] =
        row[`BlankSub Mean ${sampleName}`] ??
        row[`ControlSub BlankSub Mean ${sampleName}`];
      pointDatum[`logBlankSub Mean`] =
        row[`logBlankSub Mean ${sampleName}`] ??
        row[`logControlSub BlankSub Mean ${sampleName}`];
      pointDatum["Sample Name"] = sampleName;
      pointDatum["Enabled"] =
        qaqcData.filter((q) => {
          return (
            q["Feature ID"] === row["Feature ID"] &&
            Number.isNaN(Number.parseFloat(q[`Mean ${sampleName}`]))
          );
        }).length < 1;
      pointDatum["Color"] = pointDatum["Enabled"]
        ? "rgb(1, 199, 234)"
        : "rgb(0, 0, 0)";
      pointDatum["Hovered"] = false;

      columnsToKeep.forEach((colName) => {
        pointDatum[colName] = row[colName];
      });
      pointData.push(pointDatum);
    }
  });

  return pointData;
}

function ols(data, xName, yName) {
  // find average of x and y variables
  const n = data.length;
  let xBar = 0;
  let yBar = 0;
  data.forEach((row) => {
    xBar += row[xName];
    yBar += row[yName];
  });
  xBar /= n;
  yBar /= n;

  // find variance and covariance
  let sXX = 0;
  let sXY = 0;
  data.forEach((row) => {
    sXX += (row[xName] - xBar) ** 2;
    sXY += (row[yName] - yBar) * (row[xName] - xBar);
  });

  // find slope and y-intercept
  const slope = sXY / sXX;
  const yIntercept = yBar - slope * xBar;

  // r squared
  let sst = 0; // total sum of squares
  let sse = 0; // estimated sum of squares
  data.forEach((row) => {
    const estimate = yIntercept + slope * row[xName];
    sse += (row[yName] - estimate) ** 2;
    sst += (row[yName] - yBar) ** 2;
  });

  const r_sq = 1 - sse / sst;

  return [slope, yIntercept, r_sq];
}

function calculatePredictionIntervals(
  data,
  xName,
  yName,
  slope,
  yIntercept,
  confidence
) {
  const n = data.length;
  const df = n - 2;
  let xBar = d3.mean(data, (d) => d[xName]);

  let mse = 0;
  data.forEach(
    (row) => (mse += (row[yName] - (yIntercept + slope * row[xName])) ** 2)
  );
  mse /= df;

  return data.map((row) => {
    const x = row[xName];
    const y = yIntercept + slope * x;
    const numerator = (x - xBar) ** 2;
    const denominator = d3.sum(data, (d) => (d[xName] - xBar) ** 2);

    const t = tStatisticValues[confidence][df];

    const radicand = mse * (1 + 1 / n + numerator / denominator);
    const marginOfError = t * Math.sqrt(radicand);
    return {
      x: x,
      y: y,
      yLower: y - marginOfError,
      yUpper: y + marginOfError,
    };
  });
}

/**
 * Filters the primary cleaned data for a single chemical.
 * @param {object[]} data The cleaned data ready for plotting all chemicals.
 * @param {string} chemName The chemical name.
 * @returns {object[]} The data for plotting points of a single chemical.
 */
function getPlottingDataForChem(data, chemName) {
  return data.filter((d) => d["Chemical Name"] === chemName);
}

/**
 * Returns an array of chemical names found in the main data structure. If no chemical names found, returns an array
 * of empty strings.
 * @param {Object[]} dataMain dataMain The main data array of objects (for Pos or Neg mode).
 * @returns {string[]} An array of the chemical names pulled from the main data structure.
 */
function getChemNames(dataMain, chemNameSuffix = "(ESI+)") {
  let chemNames = [];

  // allow for "Chemical Name" or "Chemical_Name" as keys
  let chemNameKey;
  if (Object.keys(dataMain[0]).includes("Chemical Name")) {
    chemNameKey = "Chemical Name";
  } else if (Object.keys(dataMain[0]).includes("Chemical_Name")) {
    chemNameKey = "Chemical_Name";
  } else {
    // if no chemical names found, generate a list of empty strings
    dataMain.forEach(() => {
      chemNames.push("");
    });

    return chemNames;
  }

  // now pull the chemical names using the key found above
  dataMain.forEach((row) => {
    chemNames.push(`${row[chemNameKey]} ${chemNameSuffix}`);
  });

  return chemNames;
}

/**
 * Generates a SVG within the specified parentElement.
 * @param {number} width The width of the SVG.
 * @param {number} height The height of the SVG.
 * @param {string} className The SVG class.
 * @param {string} id The SVG id.
 * @param {D3Selection} parentElement The d3 selection of the container the SVG should be appended to.
 * @returns
 */
function makeSvgElement(width, height, className, id, parentElement) {
  const svg = parentElement
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("overflow", "hidden")
    .attr("class", className)
    .attr("id", id);

  return svg;
}

/**
 * Creates a tooltip container and the tooltip itself for displaying data when scatter points are hovered over.
 * @returns {[D3Selection, D3Selection]} The tooltip container and the tooltip itself.
 */
function makeTooltip(parentGrid) {
  const tooltipContainer = parentGrid
    .append("div")
    .attr("class", "tooltip-container")
    .attr("id", "calCurveTooltip")
    .style("position", "absolute")
    .style("border-left", "1px solid black")
    .style("background-color", "rgb(1, 199, 234)")
    .style("height", "170px")
    .style("width", "350px")
    .style("margin-top", "50px");

  const tooltip = tooltipContainer
    .append("div")
    .style("background", "#fff")
    .style("color", "#000")
    .style("padding", "5px 10px")
    .style("height", "160px")
    .style("width", "345px")
    .style("border-left", "1px solid black")
    .style("font-size", "18px")
    .style("line-height", "1.5")
    .style("padding", "5px")
    .style("margin", "0px")
    .style("margin-left", "5px")
    .style("pointer-events", "none");

  return [tooltipContainer, tooltip];
}

/**
 * Generates plots based on the resolution being used.
 * @param {object} resolutionData The resolution data structure.
 * @param {string} resolution The resolution ("1x1", "2x2", "3x3" or "4x4").
 * @param {object[]} plottingData The data used for generating plots.
 * @param {string[]} chemNames An array of chemical names to plot.
 * @param {D3Selection} tooltip The tooltip selection.
 * @param {D3Selection} tooltipContainer The tooltip container selection.
 * @param {Function} colorScale The d3 color scale function being used.
 * @param {boolean} linesOfBestFit If true, plots are generated with the best fit lines.
 * @param {string} yScaleType The y-axis scale ("logarithmic" or "linear")
 */
function makeCalCurvesXxY(
  resolutionData,
  resolution,
  plottingData,
  chemNames,
  tooltip,
  tooltipContainer,
  cleanedQaqcData,
  confidence = "95%",
  chemNamesAll = []
) {
  // store values based on our resolution in variables for easy access
  const nSVGs = resolutionData[resolution]["n"];
  const svgIDs = resolutionData[resolution]["svgIDs"];
  const circleR = resolutionData[resolution]["circleR"];
  const bestFitLW = resolutionData[resolution]["bestFitLW"];
  const svgWidth = resolutionData[resolution]["svgWidth"];
  const svgHeight = resolutionData[resolution]["svgHeight"];
  const gridTemplateCols = resolutionData[resolution]["grid-template-columns"];
  const gridTemplateRows = resolutionData[resolution]["grid-template-rows"];
  const nYTicks = resolutionData[resolution]["nYTicks"];
  const fontSize = resolutionData[resolution]["fontSize"];

  // first let's empty our svg grid container and change the number of rows and columns based on the resolution
  const gridID = resolutionData["gridID"];
  const svgParentGrid = d3
    .select(`#${gridID}`)
    .style("grid-template-columns", gridTemplateCols)
    .style("grid-template-rows", gridTemplateRows);

  svgParentGrid.selectAll("svg").remove();

  // now we can iterate through our SVGs and chemNames to generate our plots one by one
  for (let i = 0; i < nSVGs; i++) {
    const svgID = svgIDs[i];
    const chemName = i < chemNames.length ? chemNames[i] : "Empty";

    // get the plotting data for the current chemical
    const pointData = getPlottingDataForChem(plottingData, chemName);

    const svg = makeSvgElement(
      svgWidth,
      svgHeight,
      "calCurveSVG",
      svgID,
      svgParentGrid
    );

    makeCalCurve(
      svg,
      svgWidth,
      svgHeight,
      pointData,
      chemName,
      resolution,
      tooltip,
      tooltipContainer,
      confidence,
      cleanedQaqcData,
      circleR,
      bestFitLW,
      nYTicks,
      fontSize,
      chemNamesAll,
      plottingData
    );
  }
}

function makeCalCurve(
  svg,
  svgWidth,
  svgHeight,
  pointData,
  chemName,
  resolution,
  tooltip,
  tooltipContainer,
  confidence,
  qaqcData,
  circleR = 10,
  bestFitLW = 5,
  nYticks = 6,
  fontSize = "20px",
  chemNames = [],
  pointDataAll = []
) {
  // reset svg contents
  svg.innerHTML = "";
  svg.selectAll("*").remove();

  if (chemName === "Empty") {
    return;
  }
  const pointDataChem = getPlottingDataForChem(pointData, chemName);

  // Add X axis
  const tickFontSize = resolution === "3x3" ? "12px" : "14px";
  let widthOffset = 50;
  let heightOffset = 20;
  let [xMin, xMax] = d3.extent(pointDataChem, (d) => d["logConc"]);
  xMin -= 0.1;
  xMax += 0.1;
  const x = d3
    .scaleLinear()
    .domain([xMin, xMax])
    .range([widthOffset, svgWidth - 10]);
  svg
    .attr("class", chemName)
    .append("g")
    .attr("transform", `translate(0, ${svgHeight - heightOffset})`) // Adjusted transformation
    .call(d3.axisBottom(x).ticks(5))
    .selectAll("text")
    .style("font-size", tickFontSize);

  // Calculate linear regression coefficients
  const filteredPointData = pointDataChem.filter((d) => d["Enabled"]);
  const [slope, intercept, r_sq] = ols(
    filteredPointData,
    "logConc",
    "logBlankSub Mean"
  );

  // Calculate prediction intervals
  let plotPredictionIntervals = filteredPointData.length >= 3;
  let plotBestFitLine = filteredPointData.length >= 2;
  let predictionIntervals;
  let yMin, yMax;
  if (pointDataChem.length > 2) {
    // calculate prediction intervals for entire dataset first to determine the y-axis limits
    const [slopeTemp, interceptTemp, r_sqTemp] = ols(
      pointDataChem,
      "logConc",
      "logBlankSub Mean"
    );
    predictionIntervals = calculatePredictionIntervals(
      pointDataChem,
      "logConc",
      "logBlankSub Mean",
      slopeTemp,
      interceptTemp,
      confidence
    );
    yMin = d3.min(predictionIntervals, (d) => d["yLower"]) - 0.1;
    yMax = d3.max(predictionIntervals, (d) => d["yUpper"]) + 0.1;

    // now get the actual prediction intervals that will be used on the plot
    if (plotPredictionIntervals) {
      predictionIntervals = calculatePredictionIntervals(
        filteredPointData,
        "logConc",
        "logBlankSub Mean",
        slope,
        intercept,
        confidence
      );
      const yMinFiltered =
        d3.min(predictionIntervals, (d) => d["yLower"]) - 0.1;
      const yMaxFiltered =
        d3.max(predictionIntervals, (d) => d["yUpper"]) + 0.1;

      yMin = Math.min(yMin, yMinFiltered);
      yMax = Math.max(yMax, yMaxFiltered);
    }
  } else {
    yMin = d3.min(pointDataChem, (d) => d["logBlankSub Mean"]) - 0.1;
    yMax = d3.max(pointDataChem, (d) => d["logBlankSub Mean"]) + 0.1;
  }

  // Add Y axis
  let yTicks = [];
  let stepSize = (yMax - yMin) / nYticks;
  for (let i = 0; i <= nYticks; i++) {
    yTicks.push(yMin + i * stepSize);
  }
  const y = d3
    .scaleLinear()
    .domain([yMin, yMax])
    .range([svgHeight - heightOffset, 75]);
  svg
    .append("g")
    .attr("transform", `translate(${widthOffset}, 0)`)
    .call(d3.axisLeft(y).tickValues(yTicks))
    .selectAll("text")
    .style("font-size", tickFontSize);

  // Define clipping path
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("x", widthOffset)
    .attr("y", 75)
    .attr("width", svgWidth - widthOffset - 10)
    .attr("height", svgHeight - heightOffset - 75);

  // Add a group element and apply the clipping path
  const plotArea = svg.append("g").attr("clip-path", "url(#clip)");

  // Add dots
  svg
    .append("g")
    .selectAll("circle")
    .data(pointDataChem)
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return x(d["logConc"]);
    })
    .attr("cy", function (d) {
      return y(d["logBlankSub Mean"]);
    })
    .attr("r", (d) => (!d["Hovered"] ? circleR : circleR * 1.8))
    .attr("class", "enabled")
    .style("fill", (d) => d["Color"])
    .style("opacity", "0.7")
    .style("stroke", "black")
    .style("stroke-width", "1.2px")
    .on("mouseover", function (event, d) {
      d["Hovered"] = true;
      d3.selectAll("circle")
        .transition()
        .duration(300)
        .attr("r", circleR)
        .style("opacity", "0.7");
      d3.select(this)
        .transition()
        .duration(300)
        .attr("r", circleR * 1.8)
        .style("opacity", "1");
      tooltipContainer.style("visibility", "visible");
      tooltipContainer.transition().duration(300).style("opacity", 1);
      tooltip.html(
        `<b>Chemical:</b> ${d["Chemical Name"]}<br><b>Feature ID:</b> ${
          d["Feature ID"]
        }<br><b>Sample Name:</b> ${
          d["Sample Name"]
        }<br><b>log<sub>10</sub>(Conc):</b> ${d["logConc"].toFixed(
          3
        )}<br><b>log<sub>10</sub>(Mean Area):</b> ${d[
          "logBlankSub Mean"
        ].toFixed(3)}<br><b>Flag(s):</b> ${
          qaqcData.filter(
            (q) =>
              q["Feature ID"] === d["Feature ID"] &&
              Number.isNaN(parseFloat(q[`Mean ${d["Sample Name"]}`]))
          ).length > 0
            ? qaqcData.filter((q) => q["Feature ID"] === d["Feature ID"])[0][
                `Mean ${d["Sample Name"]}`
              ]
            : "None"
        }`
      );

      d3.select("#calCurveTooltip")
        .transition()
        .duration(300)
        .style("background-color", d["Color"]);
    })
    .on("mouseleave", function (event, d) {
      d["Hovered"] = false;
    })
    .on("click", function (event, d) {
      // toggle color and enabled status
      d["Enabled"] = !d["Enabled"];
      if (d["Enabled"]) {
        d["Color"] = "rgb(1, 199, 234)";
      } else {
        d["Color"] = "rgb(0, 0, 0)";
      }

      d3.selectAll(`[class="${chemName}"]`).each(function (d, i) {
        makeCalCurve(
          d3.select(this),
          svgWidth,
          svgHeight,
          pointData,
          chemName,
          resolution,
          tooltip,
          tooltipContainer,
          confidence,
          qaqcData,
          circleR,
          bestFitLW,
          nYticks,
          fontSize,
          chemNames,
          [...pointDataAll]
        );
      });

      // update the tooltip
      d3.select("#calCurveTooltip")
        .transition()
        .duration(300)
        .style("background-color", d["Color"]);
    });

  // update table of slopes
  const tableData = chemNames.map((thisChemName) => {
    const pData = getPlottingDataForChem(pointDataAll, thisChemName);

    const filteredPData = pData.filter((d) => d["Enabled"]);
    const [slopeT, interceptT, r_sqT] = ols(
      filteredPData,
      "logConc",
      "logBlankSub Mean"
    );

    return [thisChemName, slopeT, interceptT, r_sqT];
  });

  const tableRows = d3
    .select("#slopeTableContainer")
    .select("tbody")
    .selectAll("tr")
    .data(tableData);

  tableRows
    .enter()
    .append("tr")
    .merge(tableRows)
    .selectAll("td")
    .data((d) => d)
    .join("td")
    .style("border", "1px solid black")
    .style("padding", "6px 10px")
    .text((d, i) => (i === 0 ? d : getNumber(d)));

  tableRows.exit().remove();

  // update the excluded table tows
  const tableRowsDis = d3
    .select("#excludedTabledContainer")
    .select("tbody")
    .selectAll("tr")
    .data(getExcludedData(pointDataAll, qaqcData));

  tableRowsDis
    .enter()
    .append("tr")
    .merge(tableRowsDis)
    .selectAll("td")
    .data((d) => d)
    .join("td")
    .style("border", "1px solid black")
    .style("padding", "6px 10px")
    .text((d, i) => d);

  tableRowsDis.exit().remove();

  // mark all circles as non-hovered in case mouseout event doesn't get triggered after click event
  pointData.forEach((d) => (d["Hovered"] = false));

  // Create line of best fit
  if (plotBestFitLine) {
    xMin = d3.min(filteredPointData, (d) => d["logConc"]);
    xMax = d3.max(filteredPointData, (d) => d["logConc"]);

    const lineData = [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ];

    const line = d3
      .line()
      .x((d) => x(d.x))
      .y((d) => y(d.y));

    plotArea
      .append("path")
      .datum(lineData)
      .attr("class", "regression-line")
      .attr("d", line)
      .style("stroke", "rgb(0, 0, 0)")
      .style("stroke-width", bestFitLW + 2.2)
      .style("fill", "none")
      .style("stroke-linecap", "round")
      .attr("pointer-events", "none");
    plotArea
      .append("path")
      .datum(lineData)
      .attr("class", "regression-line")
      .attr("d", line)
      .style("stroke", "rgb(1, 199, 234)")
      .style("stroke-width", bestFitLW + 1)
      .style("fill", "none")
      .style("stroke-linecap", "round")
      .attr("pointer-events", "none");
  }

  // Plot prediction intervals
  if (plotPredictionIntervals) {
    const area = d3
      .area()
      .x((d) => x(d.x))
      .y0((d) => y(d.yLower))
      .y1((d) => y(d.yUpper));

    const predArea = plotArea
      .append("path")
      .datum(predictionIntervals)
      .attr("class", "prediction-interval")
      .attr("d", area)
      .style("fill", "rgba(233, 255, 31, 0.19)")
      .style("opacity", 0.35);

    // Plot upper bound
    const upperBound = d3
      .line()
      .x((d) => x(d.x))
      .y((d) => y(d.yUpper));

    plotArea
      .append("path")
      .datum(predictionIntervals)
      .attr("class", "upper-bound")
      .attr("d", upperBound)
      .style("stroke", "rgba(252, 126, 47, 0.95)")
      .style("stroke-width", bestFitLW)
      .style("stroke-dasharray", "6,3")
      .style("fill", "none");

    // Plot lower bound
    const lowerBound = d3
      .line()
      .x((d) => x(d.x))
      .y((d) => y(d.yLower));

    plotArea
      .append("path")
      .datum(predictionIntervals)
      .attr("class", "lower-bound")
      .attr("d", lowerBound)
      .style("stroke", "rgba(252, 126, 47, 0.95)")
      .style("stroke-width", bestFitLW)
      .style("stroke-dasharray", "6,3")
      .style("fill", "none");

    predArea.lower();
  }

  // Add gridlines
  const gridGroup = svg.append("g").attr("class", "grid");

  gridGroup
    .selectAll(".y-grid")
    .data(yTicks)
    .enter()
    .append("line")
    .attr("class", "y-grid")
    .attr("x1", widthOffset)
    .attr("x2", svgWidth - 10)
    .attr("y1", (d) => y(d))
    .attr("y2", (d) => y(d))
    .attr("stroke", "#ddd")
    .attr("stroke-width", 1);

  gridGroup
    .selectAll(".x-grid")
    .data(x.ticks(5))
    .enter()
    .append("line")
    .attr("class", "x-grid")
    .attr("x1", (d) => x(d))
    .attr("x2", (d) => x(d))
    .attr("y1", 75)
    .attr("y2", svgHeight - heightOffset)
    .attr("stroke", "#ddd")
    .attr("stroke-width", 1);

  gridGroup.lower();

  const getResolution = (res) => {
    if (res === "1x1") return 400;
    if (res === "2x2") return 340;
    return 320;
  };

  const getResolutionWidthAndHeight = (res) => {
    let width = "320px"; // default: 3x3
    let height = "50px"; // default: 2x2 and 1x1 have the same height

    if (res === "1x1") {
      width = "400px";
    } else if (res === "2x2") {
      width = "340px";
    } else {
      height = "40px";
    }
    return { height, width };
  };

  // title
  svg
    .append("text")
    .attr("x", svgWidth / 2 + widthOffset / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", fontSize)
    .attr("font-weight", "bold")
    .text(chemName);
  if (plotBestFitLine) {
    const foreignObjectWidth = getResolution(resolution);
    let objectX = svgWidth / 2 + widthOffset / 2 - foreignObjectWidth / 2;
    objectX -= 10;
    svg
      .append("foreignObject")
      .attr("x", objectX)
      .attr("y", 28)
      .attr("text-anchor", "middle")
      .attr("width", getResolutionWidthAndHeight(resolution).width)
      .attr("height", getResolutionWidthAndHeight(resolution).height)
      .append("xhtml:div")
      .style("text-align", "center")
      .style("background-color", "rgba(0, 238, 255, 0.05)")
      .style("border", "1px solid black")
      .style("border-radius", "3px")
      .style("padding", "5px")
      .style("padding-left", "4px")
      .style("line-height", resolution === "1x1" ? "11px" : "8px")
      .style("font-size", resolution === "1x1" ? "18px" : "16px")
      .html(
        `log<sub>10</sub>(Mean Area) = ${intercept.toFixed(
          3
        )} + ${slope.toFixed(
          3
        )}log<sub>10</sub>(Conc)<br>R<sup>2</sup> = ${r_sq.toFixed(3)}`
      );
  }
}

async function calCurvesMain(inputXlsxPath) {
  // input data and process
  const { main: data, qaqc: qaqcData } = await readInterpretOutputXLSX(
    inputXlsxPath
  );

  const [cleanedData, uniqueSampleNames] = cleanData(data);
  const cleanedQaqcData = cleanQaqcData(qaqcData);

  let pointData = getPointData(cleanedData, uniqueSampleNames, cleanedQaqcData);

  // get unique chemical names
  const chemNames = [];
  pointData.forEach((row) => {
    if (!chemNames.includes(row["Chemical Name"])) {
      chemNames.push(row["Chemical Name"]);
    }
  });
  let chemNamesToggled = chemNames;

  // get plotting data for every chemical
  let plottingData = chemNames.map((chemName) =>
    getPlottingDataForChem(pointData, chemName)
  );

  // setup parent grids and resolution data
  // setup containers for grid elements
  const parentGridContainer = d3
    .select("#cal-curves-container")
    .append("div")
    .attr("id", "parent-grid-container")
    .style("display", "grid")
    .style("height", "fit-content")
    .style("width", "fit-content")
    .style("grid-template-columns", "40px 1fr 170px")
    .style("grid-template-rows", "125px 27px 1fr 30px")
    .style(
      "grid-template-areas",
      `
      "buttons buttons buttons"
      "yAxisTitle svg-grid groupTitle"
      "yAxisTitle svg-grid legendTooltip"
      "null1 xAxisTitle legendTooltip"
    `
    );

  const buttonGridContainer = parentGridContainer
    .append("div")
    .attr("id", "button-grid-container")
    .style("display", "grid")
    .style("grid-template-columns", "auto auto auto auto auto auto")
    .style("grid-area", "buttons")
    .style("justify-content", "center")
    .style(
      "grid-template-areas",
      `
      "resolution pagination dropdowns reset confidence"
    `
    );

  const resolutionButtonContainer = buttonGridContainer
    .append("div")
    .attr("id", "resolution-button-grid-container")
    .style("grid-area", "resolution")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr 1fr")
    .style("grid-template-rows", "1fr")
    .style("border", "1px solid #777")
    .style("height", "75px")
    .style("border-radius", "3px")
    .style("margin-right", "12px")
    .style("margin-top", "25px");

  const gridContainer = parentGridContainer
    .append("div")
    .attr("id", "svg-grid-container")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr")
    .style("grid-template-rows", "auto 1fr")
    .style("gap", "10px")
    .style("row-gap", "0px")
    .style("height", "fit-content")
    .style("width", "fit-content")
    .style("overflow", "visible")
    .style("grid-area", "svg-grid");

  const legendTooltipGridContainer = parentGridContainer
    .append("div")
    .attr("id", "legendTooltip-grid-container")
    .style("display", "grid")
    .style("grid-template-columns", "1fr")
    .style("grid-area", "legendTooltip");

  // add yAxisTitle
  const yAxisTitleContainer = parentGridContainer
    .append("div")
    .style("display", "grid")
    .style("grid-area", "yAxisTitle")
    .style("place-items", "center")
    .style("text-align", "center");

  yAxisTitleContainer
    .append("div")
    .style("transform", "translate(-35%, 80%) rotate(-90deg)")
    .style("font-size", "30px")
    .style("width", "218px")
    .style("text-align", "center")
    .html("log<sub>10</sub>(Mean Area)");

  // add xAxisTitle
  const xAxisTitleContainer = parentGridContainer
    .append("div")
    .style("display", "grid")
    .style("grid-area", "xAxisTitle")
    .style("place-items", "center");

  xAxisTitleContainer
    .append("div")
    .style("font-size", "30px")
    .style("transform", "translate(10%, 50%)")
    .html("log<sub>10</sub>(Concentration)");

  // setup a data structure for generating 1x1, 2x2, 3x3 and 4x4 plots
  let resolutionData = {
    gridID: "svg-grid-container",
    "1x1": {
      n: 1,
      svgIDs: ["svg00"],
      ddIDs: ["dd00"], // dropdown IDs
      circleR: 15,
      bestFitLW: 2.5,
      "grid-template-columns": "1fr",
      "grid-template-rows": "1fr",
      svgWidth: 1110,
      svgHeight: 520,
      nYTicks: 7,
      fontSize: "24px",
    },
    "2x2": {
      n: 4,
      svgIDs: ["svg00", "svg01", "svg10", "svg11"],
      ddIDs: ["dd00", "dd01", "dd10", "dd11"],
      circleR: 11,
      bestFitLW: 2,
      "grid-template-columns": "1fr 1fr",
      "grid-template-rows": "auto 1fr",
      svgWidth: 550,
      svgHeight: 260,
      nYTicks: 5,
      fontSize: "22px",
    },
    "3x3": {
      n: 9,
      svgIDs: [
        "svg00",
        "svg01",
        "svg02",
        "svg10",
        "svg11",
        "svg12",
        "svg20",
        "svg21",
        "svg22",
      ],
      ddIDs: [
        "dd00",
        "dd01",
        "dd02",
        "dd10",
        "dd11",
        "dd12",
        "dd20",
        "dd21",
        "dd22",
      ],
      circleR: 7.5,
      bestFitLW: 1.8,
      "grid-template-columns": "1fr 1fr 1fr",
      "grid-template-rows": "auto 1fr 1fr",
      svgWidth: 363.5,
      svgHeight: 173.3,
      nYTicks: 4,
      fontSize: "20px",
    },
    "4x4": {
      n: 16,
      svgIDs: [
        "svg00",
        "svg01",
        "svg02",
        "svg03",
        "svg10",
        "svg11",
        "svg12",
        "svg13",
        "svg20",
        "svg21",
        "svg22",
        "svg23",
        "svg30",
        "svg31",
        "svg32",
        "svg33",
      ],
      ddIDs: [
        "dd00",
        "dd01",
        "dd02",
        "dd03",
        "dd10",
        "dd11",
        "dd12",
        "dd13",
        "dd20",
        "dd21",
        "dd22",
        "dd23",
        "dd30",
        "dd31",
        "dd32",
        "dd33",
      ],
      circleR: 5,
      bestFitLW: 1.5,
      "grid-template-columns": "1fr 1fr 1fr 1fr",
      "grid-template-rows": "auto 1fr 1fr 1fr",
      svgWidth: 270,
      svgHeight: 130,
      nYTicks: 4,
      fontSize: "16px",
    },
  };

  let resolution = "2x2";

  // setup tooltip for on-hovers
  const [tooltipContainer, tooltip] = makeTooltip(legendTooltipGridContainer);

  // tvalue table
  let confidence = "95%";

  // construct cal curves
  makeCalCurvesXxY(
    resolutionData,
    resolution,
    pointData,
    chemNamesToggled,
    tooltip,
    tooltipContainer,
    cleanedQaqcData,
    confidence,
    chemNames
  );

  // pagination buttons
  const buttonData = [{ text: "&#x00AB;" }, { text: "&#x00BB;" }];

  buttonGridContainer
    .append("div")
    .style("grid-area", "pagination")
    .selectAll("button")
    .data(buttonData)
    .enter()
    .append("button")
    .style("height", "100%")
    .html((d) => d.text)
    .style("font-size", "30px")
    .style("width", "38px")
    .on("click", function (event, d) {
      const dIndex = Number(resolution[0]) ** 2;
      // if back button
      if (d.text === "&#x00AB;") {
        // do nothing if dd00 has the first chemical already
        if (chemNameIndex === 0) {
          return;
        }
        chemNameIndex -= dIndex;
      } else if (d.text === "&#x00BB;") {
        // if forward button
        // if the final active box is already populated with the last chemical, do nothing
        if (
          chemNameIndex >=
          chemNamesToggled.length - Number(resolution[0]) ** 2
        ) {
          return;
        }
        chemNameIndex += dIndex;
      }

      // update the dropdowns
      let index = 0;
      d3.selectAll(".dropdown").each(function (d, i) {
        if (d3.select(this).property("disabled") === false) {
          const chemName = chemNamesToggled[chemNameIndex + index];
          this.value = chemName;
          this.text = chemName;
          index++;
        }
      });

      // replot chemicals
      const chemNamesTemp = chemNamesToggled.slice(
        chemNameIndex,
        chemNameIndex + Number(resolution[0]) ** 2
      );
      makeCalCurvesXxY(
        resolutionData,
        resolution,
        pointData,
        chemNamesTemp,
        tooltip,
        tooltipContainer,
        cleanedQaqcData,
        confidence,
        chemNames
      );
    });

  // add a "button" with 4 dropdown menues for selecting which chemicals to plot in each SVG
  const dropdownContainer = buttonGridContainer
    .append("div")
    .attr("id", "dropdown-container")
    .style("grid-area", "dropdowns")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr 1fr")
    .style("grid-template-rows", "1fr 1fr 1fr")
    .style("gap", "5px")
    .style("padding", "3px")
    .style("border", "1px solid black")
    .style("background-color", "#E9E9E9");

  let chemNameIndex = 0;
  const dropdownData = [
    { id: "dd00", svg: "svg00", disabled: null },
    { id: "dd01", svg: "svg01", disabled: null },
    { id: "dd02", svg: "svg02", disabled: true },
    // { "id": "dd03", "svg": "svg03", "disabled": true },
    { id: "dd10", svg: "svg10", disabled: null },
    { id: "dd11", svg: "svg11", disabled: null },
    { id: "dd12", svg: "svg12", disabled: true },
    // { "id": "dd13", "svg": "svg13", "disabled": true },
    { id: "dd20", svg: "svg20", disabled: true },
    { id: "dd21", svg: "svg21", disabled: true },
    { id: "dd22", svg: "svg22", disabled: true },
    // { "id": "dd23", "svg": "svg23", "disabled": true },
    // { "id": "dd30", "svg": "svg30", "disabled": true },
    // { "id": "dd31", "svg": "svg31", "disabled": true },
    // { "id": "dd32", "svg": "svg32", "disabled": true },
    // { "id": "dd33", "svg": "svg33", "disabled": true },
  ];

  function setDropdownsFromResolution(
    resolutionData,
    resolution,
    dropdownData,
    chemNamesToggled
  ) {
    // get the IDs for active dd menus at this resolution
    const dropdownIDs = resolutionData[resolution]["ddIDs"];

    // disable non-active dd menus
    const selections = d3
      .selectAll("#dropdown-container")
      .selectAll("select")
      .attr("disabled", (_, i) =>
        dropdownIDs.includes(dropdownData[i].id) ? null : true
      );

    // empty dd menu values to repopulate
    selections.selectAll("option").remove();

    // add a blank value for all dd menus
    selections.append("option").attr("value", "Empty").text("");

    // add the chemNames from the dd menu
    let chemIndex = 0;
    dropdownData.forEach((ddObject) => {
      if (!dropdownIDs.includes(ddObject.id)) {
        return;
      }
      const dropdown = d3.select(`#${ddObject.id}`);
      chemNamesToggled.forEach((chemName) => {
        dropdown.append("option").attr("value", chemName).text(chemName);
      });
      dropdown.property("value", chemNamesToggled[chemIndex]);
      chemIndex++;
    });
  }

  // set initial dropdown values
  let chemIndex = 0;
  let activeDDIDs = resolutionData[resolution]["ddIDs"];
  dropdownData.forEach((d) => {
    let dropdown = dropdownContainer
      .append("select")
      .attr("id", d.id)
      .attr("class", "dropdown")
      .style("width", "200px")
      .style("font-size", "14px")
      .attr("disabled", d.disabled);

    dropdown.append("option").attr("value", "Empty").text("");

    chemNamesToggled.forEach((chemName) => {
      dropdown.append("option").attr("value", chemName).text(chemName);
    });

    if (chemIndex < 4 && activeDDIDs.includes(d.id)) {
      dropdown.property("value", chemNamesToggled[chemIndex]);
      chemIndex++;
    } else {
      dropdown.property("value", "");
    }

    dropdown.on("change", () => {
      const selectedChemName = dropdown.property("value");
      const svg = d3.select(`#${d["svg"]}`);

      makeCalCurve(
        svg,
        resolutionData[resolution]["svgWidth"],
        resolutionData[resolution]["svgHeight"],
        getPlottingDataForChem(pointData, selectedChemName),
        selectedChemName,
        resolution,
        tooltip,
        tooltipContainer,
        confidence,
        cleanedQaqcData,
        resolutionData[resolution]["circleR"],
        resolutionData[resolution]["bestFitLW"],
        resolutionData[resolution]["nYTicks"],
        resolutionData[resolution]["fontSize"],
        chemNames,
        plottingData.flat(1)
      );

      // update dropdown menu to reflect the current chemical name
      dropdown.selectAll("option").remove();
      dropdown.append("option").attr("value", "Empty").text("");
      chemNamesToggled.forEach((chemName) => {
        dropdown.append("option").attr("value", chemName).text(chemName);
      });
      dropdown.property("value", selectedChemName);
    });
  });

  // add reset button
  buttonGridContainer
    .append("button")
    .style("grid-area", "reset")
    .html("&#x21BA;")
    .style("font-size", "28px")
    .style("width", "38px")
    .style("padding-top", "6px")
    .on("click", function () {
      d3.select("#groupTitle").remove();
      chemNameIndex = 0;

      chemNamesToggled = chemNames;
      setDropdownsFromResolution(
        resolutionData,
        resolution,
        dropdownData,
        chemNamesToggled
      );

      // update plots
      makeCalCurvesXxY(
        resolutionData,
        resolution,
        pointData,
        chemNamesToggled,
        tooltip,
        tooltipContainer,
        cleanedQaqcData,
        confidence,
        chemNames
      );
    });

  // add confidence dropdown and slope table toggle
  const confidenceDropdownDiv = buttonGridContainer
    .append("div")
    .style("background-color", "#f0f0f0")
    .style("border-radius", "3px")
    .style("border", "1px solid #a9a9a9")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  confidenceDropdownDiv
    .append("button")
    .text("Slope Table")
    .style("padding", "5px 8px")
    .style("width", "100%")
    .style("font-size", "16px")
    .style("margin-top", "5px")
    .on("click", function () {
      // toggle off excluded table
      d3.select("#excludedTabledContainer").style("visibility", "hidden");
      const t = d3.select("#slopeTableContainer");
      if (t.style("visibility") === "hidden") {
        t.style("visibility", "visible").style("pointer-events", "all");
      } else {
        t.style("visibility", "hidden").style("pointer-events", "none");
      }
    });

  confidenceDropdownDiv
    .append("button")
    .text("Excluded")
    .style("padding", "5px 8px")
    .style("width", "100%")
    .style("font-size", "16px")
    .style("margin-top", "5px")
    .on("click", function () {
      d3.select("#slopeTableContainer").style("visibility", "hidden");
      const t = d3.select("#excludedTabledContainer");
      if (t.style("visibility") === "hidden") {
        t.style("visibility", "visible").style("pointer-events", "all");
      } else {
        t.style("visibility", "hidden").style("pointer-events", "none");
      }
    });

  const confDiv = confidenceDropdownDiv
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  confDiv
    .append("text")
    .text("Prediction:")
    .style("font-size", "18px")
    .style("margin-top", "5px")
    .style("font-weight", "bold");

  const confidenceDropdown = confDiv
    .append("select")
    .attr("id", "confidence-dropdown")
    .style("grid-area", "confidence")
    .style("font-size", "15px")
    .style("padding-left", "28px")
    .style("margin", "3px")
    .style("margin-top", "0px")
    .style("height", "22px")
    .style("width", "100px")
    .on("change", function () {
      confidence = this.value;
      const chemNamesTemp = [];
      dropdownData.forEach((ddObject) => {
        const dd = d3.select(`#${ddObject.id}`);
        if (dd.property("disabled") === true) {
          return;
        }
        chemNamesTemp.push(dd.property("value"));
      });
      makeCalCurvesXxY(
        resolutionData,
        resolution,
        pointData,
        chemNamesTemp,
        tooltip,
        tooltipContainer,
        cleanedQaqcData,
        confidence,
        chemNames
      );
    });

  Object.keys(tStatisticValues).forEach((conf) => {
    if (["90%", "95%", "99%"].includes(conf)) {
      confidenceDropdown.append("option").attr("value", conf).text(conf);
    }
  });

  // Set the default value to "95%"
  confidenceDropdown.property("value", "95%");

  // add resolution buttons
  const resolutionButtonData = [
    { text: "1x1", rects: 1 },
    { text: "2x2", rects: 4 },
    { text: "3x3", rects: 9 },
    // { "text": "4x4", "rects": 16 }
  ];

  resolutionButtonData.forEach((buttonObject) => {
    const button = resolutionButtonContainer
      .append("button")
      .style("margin", "2px")
      .on("click", () => {
        // reset chemNameIndex for pagination
        chemNameIndex = 0;

        // update resolution
        resolution = buttonObject.text;

        // update plots
        makeCalCurvesXxY(
          resolutionData,
          buttonObject.text,
          pointData,
          chemNamesToggled,
          tooltip,
          tooltipContainer,
          cleanedQaqcData,
          confidence,
          chemNames
        );

        // update dropdown menus
        setDropdownsFromResolution(
          resolutionData,
          resolution,
          dropdownData,
          chemNamesToggled
        );
      });

    const rectSize = 32 / Math.sqrt(buttonObject.rects) + "px";
    const rectsPerRow = Math.sqrt(buttonObject.rects);

    const contentsDiv = button
      .append("div")
      .style("display", "grid")
      .style("grid-template-rows", "1fr ".repeat(rectsPerRow).trim())
      .style("grid-template-columns", "1fr ".repeat(rectsPerRow).trim())
      .style("gap", "2px")
      .style("margin", "auto")
      .style("place-items", "center");

    for (let i = 0; i < buttonObject.rects; i++) {
      contentsDiv
        .append("div")
        .style("width", rectSize)
        .style("height", rectSize)
        .style("background-color", "#999")
        .style("border", "1px solid black");
    }
  });

  // add grouping functionality
  let groupCount = 0;

  // button for creating groups
  d3.select("#cal-curves-container")
    .append("button")
    .text("Create Group")
    .style("margin-top", "20px")
    .style("margin-bottom", "10px")
    .style("margin-left", "20px")
    .on("click", createGroup);

  // add a group container for the groups
  const groupContainer = d3
    .select("#cal-curves-container")
    .append("div")
    .attr("class", "group-container")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "10px")
    .style("justify-content", "flex-start");

  function createGroup() {
    groupCount++;

    // create a container for each group
    const groupDiv = groupContainer
      .append("div")
      .attr("class", "group-interface")
      .attr("id", `group-${groupCount}`)
      .style("margin-bottom", "10px")
      .style("border", "1px solid black")
      .style("padding", "10px")
      .style("position", "relative")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("width", "600px");

    // input for group name
    groupDiv.append("label").text("Group Name: ").style("margin-bottom", "4px");
    const groupNameInput = groupDiv
      .append("input")
      .attr("type", "text")
      .attr("class", "group-name")
      .style("margin-bottom", "10px");

    // input for description
    groupDiv
      .append("label")
      .text("Description: ")
      .style("margin-bottom", "4px");
    groupDiv
      .append("textarea")
      .attr("class", "group-desc")
      .style("margin-bottom", "10px")
      .attr("rows", "3")
      .style("width", "595px")
      .style("resize", "none")
      .style("font-family", "inherit")
      .style("font-size", "inherit")
      .style("font-height", "inherit");

    groupDiv
      .append("label")
      .text("Select Chemical: ")
      .style("margin-bottom", "4px");

    // dropdown for selecting chem names
    const chemSelectContainer = groupDiv
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "10px");

    const select = chemSelectContainer
      .append("select")
      .attr("class", "chem-dropdown")
      .style("width", "300px");

    select
      .selectAll("option")
      .data(chemNamesToggled)
      .enter()
      .append("option")
      .text((d) => d);

    // add button for adding chemical
    chemSelectContainer
      .append("button")
      .text("Add Chemical")
      .style("width", "100px")
      .on("click", () => {
        const selectedChem = select.property("value");
        addChemToList(groupDiv, selectedChem);
      });

    // list to display selected chems
    groupDiv.append("ul").attr("class", "chem-list");

    // buttons in bottom right
    const groupButtonContainer = groupDiv
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "15px")
      .style("position", "absolute")
      .style("bottom", "10px")
      .style("right", "10px");

    // visualize group button
    groupButtonContainer
      .append("button")
      .html("&#x1F453;")
      .style("font-size", "26px")
      .on("click", () => {
        const chemList = [];
        groupDiv
          .selectAll("li")
          .nodes()
          .forEach((d) => {
            chemList.push(d3.select(d).select("span").text());
          });

        if (chemList.length === 0) {
          return;
        }
        chemNamesToggled = chemList;

        // update dropdown menus
        setDropdownsFromResolution(
          resolutionData,
          resolution,
          dropdownData,
          chemNamesToggled
        );

        // update plots
        makeCalCurvesXxY(
          resolutionData,
          resolution,
          pointData,
          chemNamesToggled,
          tooltip,
          tooltipContainer,
          cleanedQaqcData,
          confidence,
          chemNames
        );

        // add group name to plot
        d3.select("#groupTitle").remove();
        const groupNameValue = groupNameInput.property("value");
        const groupTitleContainer = parentGridContainer
          .append("div")
          .attr("id", "groupTitleContainer")
          .style("grid-area", "groupTitle")
          .style("display", "grid")
          .style("transform", "translate(16px, 0)");

        groupTitleContainer
          .append("div")
          .attr("id", "groupTitle")
          .style("font-size", "26px")
          .style("width", "fit-content")
          .style("height", "fit-content")
          .style("border-bottom", "1px solid #444")
          .style("margin-top", "6px")
          .style("color", "#444")
          .style("padding", "6px 8px")
          .style("padding-bottom", "3px")
          .style("white-space", "nowrap") // Prevent line breaks
          .style("overflow", "visible")
          .text(groupNameValue);
      });

    // remove group button at bottom right
    groupButtonContainer
      .append("button")
      .html("&#x1F5D1;")
      .style("font-size", "26px")
      .style("color", "red")
      .on("click", () => {
        const groupNameValue = groupNameInput.property("value");
        const chemList = groupDiv.selectAll("li").nodes();
        if (groupNameValue || chemList.length > 0) {
          const confirmed = window.confirm(
            ` Are you sure you want to delete ${
              groupNameValue ? '"' + groupNameValue + '"' : "this group"
            }?`
          );
          if (confirmed) {
            groupDiv.remove();
            groupCount--;

            chemNamesToggled = chemNames;

            // update dropdown menus
            setDropdownsFromResolution(
              resolutionData,
              resolution,
              dropdownData,
              chemNamesToggled
            );

            // update plots
            makeCalCurvesXxY(
              resolutionData,
              resolution,
              pointData,
              chemNamesToggled,
              tooltip,
              tooltipContainer,
              cleanedQaqcData,
              confidence,
              chemNames
            );

            // remove group title on plot if exists
            d3.select("#groupTitle").remove();
          }
        } else {
          groupDiv.remove();
          groupCount--;
        }
      });

    // Add checkbox for disabling group from output
    const groupCheckDiv = groupDiv
      .append("div")
      .style("display", "flex")
      .style("align-items", "center");
    groupCheckDiv
      .append("label")
      .text("Exclude group chemicals from output: ")
      .style("margin-bottom", "4px");
    groupCheckDiv
      .append("input")
      .attr("type", "checkbox")
      .attr("class", "disable-checkbox")
      .style("width", "20px")
      .style("height", "20px")
      .on("change", function () {
        if (groupCheckDiv.select(".disable-checkbox").property("checked")) {
          const chemList = [];
          groupDiv
            .selectAll("li")
            .nodes()
            .forEach((d) => {
              chemList.push(d3.select(d).select("span").text());
            });

          if (chemList.length === 0) {
            return;
          }

          pointData = pointData.map((p) => {
            return {
              ...p,
              Enabled: chemList.includes(p["Chemical Name"])
                ? false
                : p["Enabled"],
              Color: chemList.includes(p["Chemical Name"])
                ? "rgb(0, 0, 0)"
                : p["Color"],
            };
          });
          plottingData = chemNames.map((chemName) =>
            getPlottingDataForChem(pointData, chemName)
          );
          // update plots
          makeCalCurvesXxY(
            resolutionData,
            resolution,
            pointData,
            chemNamesToggled,
            tooltip,
            tooltipContainer,
            cleanedQaqcData,
            confidence,
            chemNames
          );
        } else {
          const chemList = [];
          groupDiv
            .selectAll("li")
            .nodes()
            .forEach((d) => {
              chemList.push(d3.select(d).select("span").text());
            });

          if (chemList.length === 0) {
            return;
          }

          pointData = pointData.map((p) => {
            return {
              ...p,
              Enabled: chemList.includes(p["Chemical Name"])
                ? true
                : p["Enabled"],
              Color: chemList.includes(p["Chemical Name"])
                ? "rgb(1, 199, 234)"
                : p["Color"],
            };
          });
          plottingData = chemNames.map((chemName) =>
            getPlottingDataForChem(pointData, chemName)
          );
          // update plots
          makeCalCurvesXxY(
            resolutionData,
            resolution,
            pointData,
            chemNamesToggled,
            tooltip,
            tooltipContainer,
            cleanedQaqcData,
            confidence,
            chemNames
          );
        }
      });
  }

  /**
   * Populates a user created group with a selected chemical.
   * @param {D3Selection} groupDiv The group div selection to add the chemicals to.
   * @param {string} chemName The chemical that is being added to the group list.
   */
  function addChemToList(groupDiv, chemName) {
    const list = groupDiv.select(".chem-list");

    // check if this chem is already in the list
    const exists = list
      .selectAll("li")
      .nodes()
      .some((li) => d3.select(li).select("span").text() === chemName);

    if (exists) {
      return;
    }

    // remove button
    const listItem = list
      .append("li")
      .style("display", "flex")
      .style("align-items", "center");

    listItem
      .append("button")
      .html("&#x1F5D1;")
      .style("font-size", "22px")
      .style("color", "red")
      .style("padding", "-5px 1px")
      .style("margin-bottom", "5px")
      .on("click", () => {
        listItem.remove();
      });

    // create list item
    listItem.append("span").text(chemName).style("margin-left", "10px");
  }

  /**
   * @typedef {[string, string, string[], string[]]} CustomGroup
   */

  /**
   * Returns an array of data corresponding to any custom groups created by the user. If a group has been created
   * but not populated with any chemicals, it is ignored.
   * @returns {CustomGroup[]} An array of custom groups in the form:
   *  [
   *    ["group0Name", "group0Desc", ["group0Chem0", "group0Chem1", ...], ["group0Mode0", "group0Mode1", ...]],
   *    ["group1Name", "group1Desc", ["group1Chem0", "group1Chem1", ...], ["group1Mode0", "group1Mode1", ...]],
   *    ...
   *  ]
   */
  function getGroupData() {
    const groupData = [];
    const groups = d3.selectAll(".group-interface").nodes();

    groups.forEach((group) => {
      const chemicals = d3
        .select(group)
        .select(".chem-list")
        .selectAll("li")
        .nodes()
        .map((li) => d3.select(li).select("span").text());

      if (chemicals.length === 0) {
        return;
      }

      const chemicalNames = [];
      const chemicalModes = [];
      const esiRegex = /\s\((ESI[+-])\)/;
      chemicals.forEach((chemical) => {
        const [chemName, chemMode, _] = chemical.split(esiRegex);
        chemicalNames.push(chemName);
        chemicalModes.push(chemMode);
      });

      const groupTitle = d3.select(group).select("input").property("value");
      const groupDesc = d3.select(group).select("textarea").property("value");

      const groupExcluded = d3
        .select(group)
        .select(".disable-checkbox")
        .property("checked");

      let disabledString = groupExcluded ? "Disabled" : "Enabled";

      const groupDatum = [
        groupTitle,
        groupDesc,
        chemicalNames,
        chemicalModes,
        disabledString,
      ];

      groupData.push(groupDatum);
    });

    return groupData;
  }

  /** Uncomment below to test the getGroupData() function */

  // d3.select("body").append("button").text("get group data").on("click", () => {
  //   const dat = getGroupData();
  //   console.log(dat)
  // });

  // /** Uncomment below to test the getDisabledData() function */

  // d3.select("body").append("button").text("get disabled data").on("click", () => {
  //   const dat = getDisabledData(pointData);
  //   console.log(dat);
  // });

  // build table of slopes for best fit lines
  const tableData = chemNames.map((chemName) => {
    const pData = getPlottingDataForChem(pointData, chemName);

    const filteredPointData = pData.filter((d) => d["Enabled"]);
    const [slope, intercept, r_sq] = ols(
      filteredPointData,
      "logConc",
      "logBlankSub Mean"
    );

    return [chemName, slope, intercept, r_sq];
  });

  const tableContainer = gridContainer
    .append("div")
    .attr("id", "slopeTableContainer")
    .style("visibility", "hidden")
    .style("pointer-events", "none")
    .style("height", "500px")
    .style("overflow-y", "scroll")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 100px")
    .style(
      "margin-left",
      (d) => gridContainer.node().getBoundingClientRect().width / 2 - 100 + "px"
    )
    .style("border", "3px solid black")
    .style("border-radius", "5px")
    .style("margin-top", "5px");

  const tableContainerDis = gridContainer
    .append("div")
    .attr("id", "excludedTabledContainer")
    .style("visibility", "hidden")
    .style("pointer-events", "none")
    .style("height", "500px")
    .style("overflow-y", "scroll")
    .style("position", "absolute")
    .style("z-index", 500)
    .style("background-color", "white")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 100px")
    .style(
      "margin-left",
      (d) => gridContainer.node().getBoundingClientRect().width / 2 - 100 + "px"
    )
    .style("border", "3px solid black")
    .style("border-radius", "5px")
    .style("margin-top", "5px");

  const tableDiv = tableContainer.append("div").style("padding", "8px");

  const tableDivDis = tableContainerDis.append("div").style("padding", "8px");

  const table = tableDiv
    .append("table")
    .attr("id", "slopeTable")
    .style("margin-top", "10px")
    .style("margin-left", "20px")
    .style("border-collapse", "collapse")
    .style("border", "1px solid black");

  const tableDis = tableDivDis
    .append("table")
    .attr("id", "excludedTable")
    .style("margin-top", "10px")
    .style("margin-left", "20px")
    .style("border-collapse", "collapse")
    .style("border", "1px solid black");

  const tableHeader = table.append("thead").append("tr");

  const tableHeaderDis = tableDis.append("thead").append("tr");

  tableHeader
    .selectAll("th")
    .data(["Chemical Name", "Slope", "Y-Intercept", "R<sup>2</sup>"])
    .enter()
    .append("th")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("cursor", (d) => (d === "R<sup>2</sup>" ? "default" : "pointer"))
    .html((d) => d)
    .on("click", function (event, d) {
      if (d !== "R<sup>2</sup>") {
        sortTable(d);
      }
    });

  tableHeaderDis
    .selectAll("th")
    .data(["Chemical Name", "Feature ID", "Sample Name", "Flag(s)"])
    .enter()
    .append("th")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("cursor", "none")
    .html((d) => d);

  const tableBody = table.append("tbody");

  const tableBodyDis = tableDis.append("tbody");

  tableBody
    .selectAll("tr")
    .data(tableData)
    .enter()
    .append("tr")
    .selectAll("td")
    .data((d) => d)
    .enter()
    .append("td")
    .style("border", "1px solid black")
    .style("padding", "6px 10px")
    .text((d, i) => (i === 0 ? d : getNumber(d)));

  tableBodyDis
    .selectAll("tr")
    .data(getExcludedData(pointData, qaqcData))
    .enter()
    .append("tr")
    .selectAll("td")
    .data((d) => d)
    .enter()
    .append("td")
    .style("border", "1px solid black")
    .style("padding", "6px 10px")
    .text((d, i) => d);

  // Create the button and add it to the DOM
  const buttonDiv = tableContainer
    .append("div")
    .style("position", "sticky")
    .style("top", "0")
    .style("margin-top", "12px")
    .style("height", "300px");

  const buttonDivDis = tableContainerDis
    .append("div")
    .style("position", "sticky")
    .style("top", "0")
    .style("margin-top", "12px")
    .style("height", "300px");

  // create button for exporting to XLSX file
  const exportButton = buttonDiv
    .append("button")
    .text("Export to XLSX")
    .style("height", "50px")
    .style("top", "10px")
    .style("right", "10px")
    .style("margin-top", "5px")
    .style("margin-left", "12px")
    .style("margin-right", "5px")
    .on("click", () => exportTableToXLSX("slopeTable"));

  const exportButtonDis = buttonDivDis
    .append("button")
    .text("Export to XLSX")
    .style("height", "50px")
    .style("top", "10px")
    .style("right", "10px")
    .style("margin-top", "5px")
    .style("margin-left", "12px")
    .style("margin-right", "5px")
    .on("click", () => exportTableToXLSX("excludedTable"));

  const copyButton = buttonDiv
    .append("button")
    .text("Copy to Clipboard")
    .style("height", "50px")
    .style("top", "10px")
    .style("right", "10px")
    .style("margin-top", "10px")
    .style("margin-left", "12px")
    .style("margin-right", "5px")
    .on("click", () => copyTableToClipboard("slopeTable"));

  const copyButtonDis = buttonDivDis
    .append("button")
    .text("Copy to Clipboard")
    .style("height", "50px")
    .style("top", "10px")
    .style("right", "10px")
    .style("margin-top", "10px")
    .style("margin-left", "12px")
    .style("margin-right", "5px")
    .on("click", () => copyTableToClipboard("excludedTable"));

  const refreshButtonDis = buttonDivDis
    .append("button")
    .text("Reset Excluded Values")
    .style("height", "60px")
    .style("top", "10px")
    .style("right", "10px")
    .style("margin-top", "10px")
    .style("margin-left", "12px")
    .style("margin-right", "5px")
    .on("click", function () {
      pointData = pointData.map((p) => {
        return { ...p, Enabled: true, Color: "rgb(1, 199, 234)" };
      });
      plottingData = chemNames.map((chemName) =>
        getPlottingDataForChem(pointData, chemName)
      );
      const chemNamesTemp = [];
      dropdownData.forEach((ddObject) => {
        const dd = d3.select(`#${ddObject.id}`);
        if (dd.property("disabled") === true) {
          return;
        }
        chemNamesTemp.push(dd.property("value"));
      });
      makeCalCurvesXxY(
        resolutionData,
        resolution,
        pointData,
        chemNamesTemp,
        tooltip,
        tooltipContainer,
        cleanedQaqcData,
        confidence,
        chemNames
      );
      d3.selectAll(".disable-checkbox").each(function () {
        d3.select(this).property("checked", false);
      });
    });

  const excludeFlagsButton = buttonDivDis
    .append("button")
    .text("Exclude Flags")
    .style("height", "60px")
    .style("top", "10px")
    .style("right", "10px")
    .style("margin-top", "10px")
    .style("margin-left", "12px")
    .style("margin-right", "5px")
    .on("click", function () {
      pointData = pointData.map((p) => {
        const hasFlag =
          qaqcData.filter(
            (q) =>
              q["Feature ID"] === p["Feature ID"] &&
              Number.isNaN(Number.parseFloat(q[`Mean ${p["Sample Name"]}`]))
          ).length > 0;
        return {
          ...p,
          Enabled: !hasFlag,
          Color: hasFlag ? "rgb(0, 0, 0)" : "rgb(1, 199, 234)",
        };
      });
      plottingData = chemNames.map((chemName) =>
        getPlottingDataForChem(pointData, chemName)
      );
      const chemNamesTemp = [];
      dropdownData.forEach((ddObject) => {
        const dd = d3.select(`#${ddObject.id}`);
        if (dd.property("disabled") === true) {
          return;
        }
        chemNamesTemp.push(dd.property("value"));
      });
      makeCalCurvesXxY(
        resolutionData,
        resolution,
        pointData,
        chemNamesTemp,
        tooltip,
        tooltipContainer,
        cleanedQaqcData,
        confidence,
        chemNames
      );
    });

  // Function to copy the table content to the clipboard
  function copyTableToClipboard(id) {
    const table = d3.select(`table#${id}`).node();
    const range = document.createRange();
    range.selectNode(table);
    window.getSelection().removeAllRanges(); // Clear any existing selections
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges(); // Clear the selection after copying
  }

  // Function to export the table to an XLSX file
  function exportTableToXLSX(id) {
    let download = "";
    switch (id) {
      case "slopeTable":
        download = "Slopes";
        break;
      case "excludedTable":
        download = "Excluded";
        break;
      default:
        download = "Values";
        break;
    }
    const table = d3.select(`#${id}`).node();
    const rows = table.querySelectorAll("tr");
    const data = [];

    // Extract table data
    rows.forEach((row) => {
      const cells = row.querySelectorAll("th, td");
      const rowData = Array.from(cells).map((cell) => cell.innerText);
      data.push(rowData);
    });

    // Create a worksheet from the data
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${download}`);

    // Write the workbook to a file
    XLSX.writeFile(workbook, `${download}.xlsx`);
  }

  // Function to sort the table
  let sortAscending = true;
  function sortTable(column) {
    sortAscending = !sortAscending;
    const columnIndex = column === "Chemical Name" ? 0 : 1;
    let sortedData = tableData.toSort((a, b) => {
      const aValue = Number.isNaN(a[columnIndex]) ? -Infinity : a[columnIndex];
      const bValue = Number.isNaN(b[columnIndex]) ? -Infinity : b[columnIndex];
      if (sortAscending) {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    if (column === "Chemical Name") {
      sortedData = chemNames.map((chemName) => {
        const pData = getPlottingDataForChem(pointData, chemName);

        const filteredPointData = pData.filter((d) => d["Enabled"]);
        const [slope, intercept, r_sq] = ols(
          filteredPointData,
          "logConc",
          "logBlankSub Mean"
        );

        return [chemName, slope];
      });
    }

    tableBody
      .selectAll("tr")
      .data(sortedData)
      .selectAll("td")
      .data((d) => d)
      .text((d, i) => (i === 0 ? d : getNumber(d)));
  }
}

const inputXlsxPath = "./data/";
calCurvesMain(inputXlsxPath);
