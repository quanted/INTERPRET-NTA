// tvalue table
var tStatisticValues = {
  "50%": { 
    1: 1.000, 2: 0.816, 3: 0.765, 4: 0.741, 5: 0.727, 6: 0.718, 7: 0.711, 8: 0.706, 9: 0.703, 10: 0.700, 
    11: 0.697, 12: 0.695, 13: 0.694, 14: 0.692, 15: 0.691, 16: 0.690, 17: 0.689, 18: 0.688, 19: 0.688, 20: 0.687 
  },
  "60%": { 
    1: 1.376, 2: 1.061, 3: 0.978, 4: 0.941, 5: 0.920, 6: 0.906, 7: 0.896, 8: 0.889, 9: 0.883, 10: 0.897, 
    11: 0.876, 12: 0.873, 13: 0.870, 14: 0.868, 15: 0.866, 16: 0.865, 17: 0.863, 18: 0.862, 19: 0.861, 20: 0.860 
  },
  "70%": { 
    1: 1.963, 2: 1.386, 3: 1.250, 4: 1.190, 5: 1.156, 6: 1.134, 7: 1.119, 8: 1.108, 9: 1.100, 10: 1.093, 
    11: 1.088, 12: 1.083, 13: 1.079, 14: 1.076, 15: 1.074, 16: 1.071, 17: 1.069, 18: 1.067, 19: 1.066, 20: 1.064 
  },
  "80%": { 
    1: 3.078, 2: 1.886, 3: 1.638, 4: 1.533, 5: 1.476, 6: 1.440, 7: 1.415, 8: 1.397, 9: 1.383, 10: 1.372, 
    11: 1.363, 12: 1.356, 13: 1.350, 14: 1.345, 15: 1.341, 16: 1.337, 17: 1.333, 18: 1.330, 19: 1.328, 20: 1.325 
  },
  "90%": { 
    1: 6.314, 2: 2.920, 3: 2.353, 4: 2.132, 5: 2.015, 6: 1.943, 7: 1.895, 8: 1.860, 9: 1.833, 10: 1.812, 
    11: 1.796, 12: 1.782, 13: 1.771, 14: 1.761, 15: 1.753, 16: 1.746, 17: 1.740, 18: 1.734, 19: 1.729, 20: 1.725 
  },
  "95%": {
    1: 12.71, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086
  },
  "98%": { 
    1: 31.821, 2: 6.965, 3: 4.541, 4: 3.747, 5: 3.365, 6: 3.143, 7: 2.998, 8: 2.896, 9: 2.821, 10: 2.764, 
    11: 2.718, 12: 2.681, 13: 2.650, 14: 2.624, 15: 2.602, 16: 2.583, 17: 2.567, 18: 2.552, 19: 2.539, 20: 2.528 
  },
  "99%": { 
    1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032, 6: 3.707, 7: 3.499, 8: 3.355, 9: 3.250, 10: 3.169, 
    11: 3.106, 12: 3.055, 13: 3.012, 14: 2.977, 15: 2.947, 16: 2.921, 17: 2.898, 18: 2.878, 19: 2.861, 20: 2.845 
  }
};

// setup a data structure for generating 1x1, 2x2, 3x3 and 4x4 plots
var resolutionData = {
  "gridID": "svg-grid-container",
  "1x1": {
    "n": 1,
    "svgIDs": ["svg00"],
    "ddIDs": ["dd00"], // dropdown IDs
    "circleR": 15,
    "bestFitLW": 6.5,
    "grid-template-columns": "1fr",
    "grid-template-rows": "1fr",
    "svgWidth": 1110,
    "svgHeight": 520,
    "nYTicks": 7,
    "fontSize": "24px"
  },
  "2x2": {
    "n": 4,
    "svgIDs": [
      "svg00", "svg01", 
      "svg10", "svg11"
    ],
    "ddIDs": [
      "dd00", "dd01",
      "dd10", "dd11"
    ],
    "circleR": 11,
    "bestFitLW": 5.5,
    "grid-template-columns": "1fr 1fr",
    "grid-template-rows": "auto 1fr",
    "svgWidth": 550,
    "svgHeight": 260,
    "nYTicks": 5,
    "fontSize": "22px"
  },
  "3x3": {
    "n": 9,
    "svgIDs": [
      "svg00", "svg01", "svg02",
      "svg10", "svg11", "svg12",
      "svg20", "svg21", "svg22"
    ],
    "ddIDs": [
      "dd00", "dd01", "dd02",
      "dd10", "dd11", "dd12",
      "dd20", "dd21", "dd22"
    ],
    "circleR": 7.5,
    "bestFitLW": 4.5,
    "grid-template-columns": "1fr 1fr 1fr",
    "grid-template-rows": "auto 1fr 1fr",
    "svgWidth": 363.5,
    "svgHeight": 173.3,
    "nYTicks": 5,
    "fontSize": "20px"
  },
  "4x4": {
    "n": 16,
    "svgIDs": [
      "svg00", "svg01", "svg02", "svg03",
      "svg10", "svg11", "svg12", "svg13",
      "svg20", "svg21", "svg22", "svg23",
      "svg30", "svg31", "svg32", "svg33"
    ],
    "ddIDs": [
      "dd00", "dd01", "dd02", "dd03",
      "dd10", "dd11", "dd12", "dd13",
      "dd20", "dd21", "dd22", "dd23",
      "dd30", "dd31", "dd32", "dd33"
    ],
    "circleR": 5,
    "bestFitLW": 3.5,
    "grid-template-columns": "1fr 1fr 1fr 1fr",
    "grid-template-rows": "auto 1fr 1fr 1fr",
    "svgWidth": 270,
    "svgHeight": 130,
    "nYTicks": 4,
    "fontSize": "16px"
  },
}

/**
 * Returns the Positive AND Negative mode data from the INTERPRET NTA results .xlsx file.
 * @param {string} filePath Path to the INTERPRET NTA results .xlsx file.
 * @returns {[Object[], Object[]]} An array whose first element is an array of objects, one object for each row of data
 * for positive mode; and whose second element is an array of object for negative mode.
 */
async function readInterpretOutputXLSX(filePath) {
  // fetch file
  const response = await fetch(filePath);
  const arrayBuffer = await response.arrayBuffer();

  // access data from desired tracer detection sheet and write to json object
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const sheetName = "Sheet1";
  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  return jsonData;
}

/**
 * Cleans the XLSX input data by removing unwanted columns and generating the log10 of concentrations and
 * blank subtracted means. Also returns unique sample names (e.g., 10ppb, 100ppb, etc...)
 * @param {object[]} data The raw data pulled from the XLSX file.
 * @returns {object[], string[]} The cleaned data and an array of unique sample names.
 */
function cleanData(data) {
  const blankSubHeaderSuffix = "BlankSub Mean ";
  const concentrationHeaderSuffix = "Conc ";
  const columnsToKeep = [
    "Feature ID",
    "Chemical Name",
    "Ionization Mode",
    "Retention Time"
  ];

  // remove any unwanted columns from our data
  const uniqueSampleNames = [];
  data.forEach(row => {
    Object.entries(row).forEach(([colName, value]) => {
      if (!columnsToKeep.includes(colName) && !colName.startsWith(blankSubHeaderSuffix) && !colName.startsWith(concentrationHeaderSuffix)) {
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
        row[`log${colName}`] = Math.log10(value) !== -Infinity ? Math.log10(value) : undefined;
        const sampleName = colName.split(" ")[1];
        if (!uniqueSampleNames.includes(sampleName)) {
          uniqueSampleNames.push(sampleName);
        }
        return;
      }

      if (colName.startsWith(blankSubHeaderSuffix)) {
        row[`log${colName}`] = Math.log10(value) !== -Infinity ? Math.log10(value) : undefined;
      }
    });
  });

  return [ data, uniqueSampleNames ];
}

/**
 * Returns an array of objects, each holding data for a single point on the scatter plots.
 * @param {object[]} data The cleaned data.
 * @param {string[]} uniqueSampleNames The array of unique sample ground names (e.g., 10ppb, 100ppb, etc...)
 * @returns {object[]} An array of object, each mapped to a single point.
 */
function getPointData(data, uniqueSampleNames) {
  const columnsToKeep = [
    "Feature ID",
    "Chemical Name",
    "Ionization Mode",
    "Retention Time"
  ];

  const pointData = [];
  data.forEach(row => {
    for (let sampleName of uniqueSampleNames) {
      const pointDatum = {};

      // remove undefined values
      if (row[`logBlankSub Mean ${sampleName}`] === undefined || row[`logConc ${sampleName}`] === undefined) {
        continue;
      }
      pointDatum[`Conc`] = row[`Conc ${sampleName}`];
      pointDatum[`logConc`] = row[`logConc ${sampleName}`];
      pointDatum[`BlankSub Mean`] = row[`BlankSub Mean ${sampleName}`];
      pointDatum[`logBlankSub Mean`] = row[`logBlankSub Mean ${sampleName}`];
      pointDatum["Sample Name"] = sampleName;

      columnsToKeep.forEach(colName => {
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
  data.forEach(row => {
    xBar += row[xName];
    yBar += row[yName];
  });
  xBar /= n;
  yBar /= n;

  // find variance and covariance
  let sXX = 0;
  let sXY = 0;
  data.forEach(row => {
    sXX += (row[xName] - xBar)**2;
    sXY += (row[yName] - yBar) * (row[xName] - xBar);
  });

  // find slope and y-intercept
  const slope = sXY / sXX;
  const yIntercept = yBar - slope*xBar;

  // r squared
  let sst = 0; // total sum of squares
  let sse = 0; // estimated sum of squares
  data.forEach(row => {
    const estimate = yIntercept + slope*row[xName]
    sse += (row[yName] - estimate)**2;
    sst += (row[yName] - yBar)**2;
  });
  
  const r_sq = 1 - (sse / sst);

  return [ slope, yIntercept, r_sq ];
}

function calculatePredictionIntervals(data, xName, yName, slope, yIntercept, confidence) {
  const n = data.length;
  const df = n - 2;
  let xBar = d3.mean(data, d => d[xName]);

  let mse = 0;
  data.forEach(row => mse += (row[yName] - (yIntercept + slope*row[xName]))**2);
  mse /= df;

  return data.map(row => {
    const x = row[xName];
    const y = yIntercept + slope * x;
    const numerator = (x - xBar) ** 2;
    const denominator = d3.sum(data, d => (d[xName] - xBar) ** 2);
    
    const t = tStatisticValues[confidence][df];

    const radicand = mse * (1 + 1/n + numerator/denominator);
    const marginOfError = t * Math.sqrt(radicand)
    return {
      x: x,
      y: y,
      yLower: y - marginOfError,
      yUpper: y + marginOfError
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
   return data.filter(d => d["Chemical Name"] === chemName);
}

/**
 * A d3 selection of an HTML element.
 * @typedef {d3.Selection<HTMLElement, unknown, null, undefined>} D3Selection
 */

function setupTopButtonPanel() {

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
  const svg = parentElement.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("overflow", "visible")
    .attr("class", className)
    .attr("id", id);

  return svg;
}

async function calCurvesMain(inputXlsxPath) {
  // input data and process
  const data = await readInterpretOutputXLSX(inputXlsxPath);
  const [ cleanedData, uniqueSampleNames ] = cleanData(data);
  const pointData = getPointData(cleanedData, uniqueSampleNames);

  const dataSubset = getPlottingDataForChem(pointData, "hydrocortisone (ESI+)")

  // tvalue table
  var confidence = "95%";

  // setup top button panel (resolution, pagination, dropdowns, reset, confidence interval buttons)

  // make SVG
  const parentContainer = d3.select("#cal-curves-container");

  const margin = {top: 20, right: 30, bottom: 60, left: 60},
    width = 600 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

  const svg = parentContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom) // Fixed height calculation
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Add X axis
  let [ xMin, xMax ] = d3.extent(dataSubset, d => d["logConc"]);
  xMin -= 0.1;
  xMax += 0.1;
  const x = d3.scaleLinear()
    .domain([xMin, xMax])
    .range([0, width]);
  svg.append("g")
    .attr("transform", `translate(0, ${height})`) // Adjusted transformation
    .call(d3.axisBottom(x));

  // Add Y axis
  let [ yMin, yMax ] = d3.extent(dataSubset, d => d["logBlankSub Mean"]);
  yMin = 0;
  yMax = 6;
  const y = d3.scaleLinear()
    .domain([yMin, yMax])
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Add dots
  svg.append('g')
    .selectAll("circle")
    .data(dataSubset)
    .enter()
    .append("circle")
      .attr("cx", function (d) { return x(d["logConc"]); } )
      .attr("cy", function (d) { return y(d["logBlankSub Mean"]); } )
      .attr("r", 8)
      .style("fill", "#69b3a2");

  // Calculate linear regression coefficients
  const [ slope, intercept, r_sq ] = ols(dataSubset, "logConc", "logBlankSub Mean")
  
  console.log(`y-intercept: ${intercept}\nslope: ${slope}\nr_sq: ${r_sq}`)

  // Calculate prediction intervals
  const predictionIntervals = calculatePredictionIntervals(dataSubset, "logConc", "logBlankSub Mean", slope, intercept, confidence);

  // Create line of best fit
  const lineData = [
    { x: xMin, y: slope * xMin + intercept },
    { x: xMax, y: slope * xMax + intercept }
  ];

  const line = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

  svg.append("path")
    .datum(lineData)
    .attr("class", "regression-line")
    .attr("d", line)
    .style("stroke", "blue")
    .style("stroke-width", 2)
    .style("fill", "none");

  // Plot prediction intervals
  const area = d3.area()
    .x(d => x(d.x))
    .y0(d => y(d.yLower))
    .y1(d => y(d.yUpper));

  const predArea = svg.append("path")
    .datum(predictionIntervals)
    .attr("class", "prediction-interval")
    .attr("d", area)
    .style("fill", "lightblue")
    .style("opacity", 0.35);

  predArea.lower();

  // Plot upper bound
  const upperBound = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.yUpper));

  svg.append("path")
    .datum(predictionIntervals)
    .attr("class", "upper-bound")
    .attr("d", upperBound)
    .style("stroke", "rgb(252, 137, 7)")
    .style("stroke-width", 2)
    .style("stroke-dasharray", "6,3")
    .style("fill", "none");

  // Plot lower bound
  const lowerBound = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.yLower));

  svg.append("path")
    .datum(predictionIntervals)
    .attr("class", "lower-bound")
    .attr("d", lowerBound)
    .style("stroke", "rgb(252, 137, 7)")
    .style("stroke-width", 2)
    .style("stroke-dasharray", "6,3")
    .style("fill", "none");

}

const inputXlsxPath = "./data/qNTA_Surrogate_Detection_Statistics_File_WW2DW.xlsx";
calCurvesMain(inputXlsxPath);
