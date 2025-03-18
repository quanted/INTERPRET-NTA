
/**
 * A 3x3 matrix data structure.
 * @typedef {Array<[number, number, number]>} Matrix3x3
 * 
 * A 3 dimensional vector.
 * @typedef {[number, number, number]} Vector3
 */



/**
 * Returns an array of n points between x1 and x2 (inclusive) that are evenly spaced in log-space.
 * @param {number} x1 The starting point.
 * @param {number} x2 The ending point (inclusive).
 * @param {number} n The number of evenly spaced points you want.
 * @param {number} base The logarithm base, default 10.
 * @param {number} precision The number of sig-figs each value should have, default 3.
 * @returns {number[]} And array of n numbers between x1 and x2 that are evenly spaced in log-space.
 */
function logspace(x1, x2, n, base = 10, precision = 3) {
  let logX1 = Math.log(x1) / Math.log(base);
  let logX2 = Math.log(x2) / Math.log(base);

  let result = Array.from({ length: n }, (_, i) => {
    return Math.pow(base, logX1 + (i / (n-1)) * (logX2 - logX1)).toPrecision(precision);
  });

  return result;
}

/**
 * Returns the determinant of a 3x3 matrix.
 * @param {Matrix3x3} A A 3x3 matrix.
 * @returns {number} The determinant of your 3x3 matrix.
 */
function getDeterminant3by3(A) {
  let det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]);
  det -= A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]);
  det += A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);

  return det;
}

/**
 * Returns the inverse of 3x3 matrix A.
 * @param {Matrix3x3} A A 3x3 matrix.
 * @param {number} det The determinant of A.
 * @returns {Matrix3x3} The inverse of A.
 */
function getInverse3by3(A, det) {
  const AInv = [
    [(A[1][1] * A[2][2] - A[1][2] * A[2][1]) / det, (A[0][2] * A[2][1] - A[0][1] * A[2][2]) / det, (A[0][1] * A[1][2] - A[0][2] * A[1][1]) / det],
    [(A[1][2] * A[2][0] - A[1][0] * A[2][2]) / det, (A[0][0] * A[2][2] - A[0][2] * A[2][0]) / det, (A[0][2] * A[1][0] - A[0][0] * A[1][2]) / det],
    [(A[1][0] * A[2][1] - A[1][1] * A[2][0]) / det, (A[0][1] * A[2][0] - A[0][0] * A[2][1]) / det, (A[0][0] * A[1][1] - A[0][1] * A[1][0]) / det]
  ];

  return AInv;
}

/**
 * Returns the coefficients for a quadratic fit to the points in data.
 * @param {object[]} data An array of objects corresponding to the points to fit. Each object must have "abundance" and
 * "seqIndex" keys mapped to numbers.
 * @returns {Vector3} An array of 3 numbers [a, b, c] representing the coefficients for the quadratic fit.
 */
function quadraticRegression(data) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0;

  data.forEach(d => {
    const x = d.seqIndex + 1;
    const y = d.abundance;
    sumX += x;
    sumY += y;
    sumX2 += x**2;
    sumX3 += x**3;
    sumX4 += x**4;
    sumXY += x * y;
    sumX2Y += x**2 * y;
  });

  // solve the system of equations for quadratic coefficients a, b and c
  const A = [
    [sumX2, sumX, n],
    [sumX3, sumX2, sumX],
    [sumX4, sumX3, sumX2]
  ];
  const B = [sumY, sumXY, sumX2Y];

  const det = getDeterminant3by3(A);
  
  // if determinant is 0, return 0, 0, 0 because we can't find the inverse
  if (det === 0) {
    return [0, 0, 0];
  }
  
  const AInv = getInverse3by3(A, det);

  const a = AInv[0][0] * B[0] + AInv[0][1] * B[1] + AInv[0][2] * B[2];
  const b = AInv[1][0] * B[0] + AInv[1][1] * B[1] + AInv[1][2] * B[2];
  const c = AInv[2][0] * B[0] + AInv[2][1] * B[1] + AInv[2][2] * B[2]; 

  return [ a, b, c ];
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
  const sheetName = "Tracer Detection Statistics";
  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // separate the Pos and Neg data
  let jsonDataPos = [];
  let jsonDataNeg = [];
  jsonData.forEach(row => {
    if (row["Ionization Mode"] === "ESI+") {
      jsonDataPos.push(row);
    } else if (row["Ionization Mode"] === "ESI-") {
      jsonDataNeg.push(row);
    }
  });

  return [jsonDataPos, jsonDataNeg];
}

/**
 * Returns the sequence data from the input sequence CSV for Interpret NTA.
 * @param {string} filePath Path to the INTERPRET NTA run sequence input CSV.
 * @returns {Object[]} An array of objects, each object corresponding to one row of the sequence.csv file.
 */
async function readInterpretSequenceCSV(filePath) {
  // fetch the file
  const response = await fetch(filePath);
  const text = await response.text();

  // manually deconstruct the csv text contents and store in json object
  const rows = text.split("\n").map(row => row.split(","));
  const headers = rows.shift();
  const jsonData = rows.map(row => Object.fromEntries(row.map((val, i) => [headers[i], val])));

  return jsonData;
}

/**
 * Returns the unique sample names, and the indices of the rows within the sample sequence CSV corresponding to each.
 * @param {Object[]} dataMain The main data array of objects (for Pos or Neg mode).
 * @param {Object[]} dataSeq The sequence data array of objects.
 * @returns {[string[], number[][]]} An array of the unique sample names and an array of arrays of indices that
 * point to the rows in dataSeq for a given sample. For example, if the first element of the unique sample names
 * is "Cal", and the first array of numbers in the returned indices is [0, 1, 4, 5], then rows 0, 1, 4, 5 in dataSeq
 * correspond to the "Cal" samples.
 */
function cleanSeqData(dataMain, dataSeq) {
  // check if sample sequence file has more than one column, second column would be sample group column
  let uniqueSampleGroups = [];
  if (Object.keys(dataSeq[0]).length > 1) {
    dataSeq.forEach(row => {
      const sampleGroup = String(Object.values(row)[1]).trim();
      if (!['undefined', undefined].includes(sampleGroup) && !uniqueSampleGroups.includes(sampleGroup)) {
        uniqueSampleGroups.push(sampleGroup)
      }
    });
  } else { 
    // if no sample groups exist, call them all "Sample"
    uniqueSampleGroups = ["Sample"];

    // add a sample group column in our main data structure
    dataMain.forEach(row => {
      row["Sample_Group"] = "Sample";
    });
  }

  // now we need to loop through the sample groups to get indices of samples for each group
  let seqGroupMap = {};
  dataSeq.forEach((row, i) => {
    const rowSampleGroup = String(Object.values(row)[1]).trim();
    const rowSampleSeq = String(Object.values(row)[0]).trim();
    seqGroupMap[rowSampleSeq] = rowSampleGroup;
  });

  return [ uniqueSampleGroups, seqGroupMap ];
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

    return chemNames
  }

  // now pull the chemical names using the key found above
  dataMain.forEach(row => {
    chemNames.push(`${row[chemNameKey]} ${chemNameSuffix}`);
  });

  return chemNames
}

/**
 * Cleans the dataMain data structure for plotting.
 * @param {object[]} dataMain The array of objects representing rows from our spreadsheet.
 * @param {object} seqGroupMap Object containing mappings from sequence to sample group.
 * @param {string} chemNameSuffix A suffix to add to the end of a chemical name (to indicate pos or neg mode).
 * @returns {object[]} And array of objects with all key: value pairs needed for plotting.
 */
function getPlottingData(dataMain, seqGroupMap, chemNameSuffix = "(ESI+)") {
  // get key for chemical name
  let chemNameKey = false;
  if (Object.keys(dataMain[0]).includes("Chemical Name")) {
    chemNameKey = "Chemical Name";
  } else if (Object.keys(dataMain[0]).includes("Chemical_Name")) {
    chemNameKey = "Chemical_Name";
  }

  // get sequence sample names
  let seqNames = Object.keys(seqGroupMap);

  // list of blank sample prefixes
  const blankHeaders = [
    "MB",
    "Mb",
    "mb",
    "BLANK",
    "Blank",
    "blank",
    "BLK",
    "Blk"
  ];

  // setup our main data structure for plotting and iterate over rows of data
  let plottingData = [];
  dataMain.forEach(row => {
    // store relevant row data in variables
    let featureID = row["Feature ID"];
    let chemName = "";
    if (chemNameKey !== false) {
      chemName = row[chemNameKey];
    }

    // now we can generate the object of data for each sequence (point on scatter plot)
    let pointData = {};
    for (let [colName, value] of Object.entries(row)) {
      if (seqNames.includes(colName)) {
        if (value === "") {
          continue;
        }
        let sequenceBaseName = blankHeaders.includes(colName.slice(0, colName.length-1)) ? colName.slice(0, colName.length-1) : colName.split("_")[0] + "_";
        pointData["featureID"] = featureID;
        pointData["sequenceName"] = colName;
        pointData["sequenceBaseName"] = sequenceBaseName;
        pointData["groupName"] = seqGroupMap[colName];
        pointData["chemName"] = `${chemName} ${chemNameSuffix}`;
        pointData["abundance"] = value;
        pointData["formattedAbundance"] = Number(Number(value).toFixed(0)).toLocaleString();
        pointData["seqIndex"] = seqNames.indexOf(colName);
        pointData["CV"] = Number(row[`CV ${sequenceBaseName}`]).toFixed(4);
        if (pointData["CV"] === "0.0000") {
          pointData["CV"] = "0";
        }
        plottingData.push(pointData);
        pointData = {};
      }
    }
  });

  return plottingData;
}

/**
 * A d3 selection of an HTML element.
 * @typedef {d3.Selection<HTMLElement, unknown, null, undefined>} D3Selection
 */

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

/**
 * Returns the data needed for plotting a single chemical.
 * @param {object[]} plottingData The data needed for plotting a single chemical.
 * @param {string} chemName The chemical name.
 * @returns {[object[], number]} The plotting data for the given chemical and the 
 * largest sequence index (used for x-axis ticks).
 */
function getPlottingDataForChem(plottingData, chemName) {
  let chemPlottingData = [];
  let largestSeqIndex = 0;
  plottingData.forEach(row => {
    if (row["chemName"] === chemName) {
      chemPlottingData.push(row);
      if (row["seqIndex"] > largestSeqIndex) {
        largestSeqIndex = row["seqIndex"];
      }
    }
  });

  return [ chemPlottingData, largestSeqIndex ];
}

/**
 * Creates a tooltip container and the tooltip itself for displaying data when scatter points are hovered over.
 * @returns {[D3Selection, D3Selection]} The tooltip container and the tooltip itself.
 */
function makeTooltip() {
  const tooltipContainer = d3.select("body")
    .append("div")
    .attr("class", "tooltip-container")
    .attr("id", "runSeqTooltip")
    .style("position", "absolute")
    .style("border-left", "1px solid black")
    .style("visibility", "hidden");

  const tooltip = tooltipContainer.append("div")
    .style("background", "#fff")
    .style("color", "#000")
    .style("padding", "5px 10px")
    .style("border-left", "1px solid black")
    .style("font-size", "18px")
    .style("line-height", "1.5")
    .style("padding", "5px")
    .style("margin", "0px")
    .style("margin-left", "5px")
    .style("pointer-events", "none");

  return [ tooltipContainer, tooltip ];
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
function makeSequencePlotsXxY(
  resolutionData, 
  resolution, 
  plottingData, 
  chemNames,  
  tooltip, 
  tooltipContainer, 
  colorScale, 
  linesOfBestFit = true, 
  yScaleType = "log"
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
  const svgParentGrid = d3.select(`#${gridID}`)
    .style("grid-template-columns", gridTemplateCols)
    .style("grid-template-rows", gridTemplateRows);

  svgParentGrid.selectAll("*").remove();

  // now we can iterate through our SVGs and chemNames to generate our plots one by one
  for (let i = 0; i < nSVGs; i++) {
    const svgID = svgIDs[i];
    const chemName = i < chemNames.length ? chemNames[i] : "Empty";

    const svg = makeSvgElement(svgWidth, svgHeight, "runSequenceSVG", svgID, svgParentGrid);
    
    makeRunSequencePlot(
      svg, 
      plottingData, 
      chemName, 
      tooltip,
      tooltipContainer,
      colorScale,
      linesOfBestFit,
      yScaleType,
      circleR,
      bestFitLW,
      nYTicks,
      fontSize
    );
  }
}

/**
 * Generates the plot for a single chemical within a SVG selection.
 * @param {D3Selection} svg The SVG element to plot.
 * @param {object[]} plottingData The data used for plotting.
 * @param {string} chemName The chemical name to plot in the SVG.
 * @param {D3Selection} tooltip The tooltip selection.
 * @param {D3Selection} tooltipContainer The tooltip container selection.
 * @param {Function} colorScale The d3 color scale function being use.
 * @param {boolean} linesOfBestFit If true, the best fit curves are draw.
 * @param {string} yScaleType The y-axis scale ("logarithmic" or "linear").
 * @param {number} circleR The radius of the scatter plot points.
 * @param {number} bestFitLW The width of the best fit lines.
 * @param {number} nYticks The number of y-ticks.
 * @param {number} fontSize The font size of the plot title.
 */
function makeRunSequencePlot(
  svg, 
  plottingData, 
  chemName, 
  tooltip, 
  tooltipContainer, 
  colorScale, 
  linesOfBestFit, 
  yScaleType = "log",
  circleR = 10,
  bestFitLW = 5,
  nYticks = 6,
  fontSize = "20px"
) {
  // reset svg contents
  svg.innerHTML = "";
  svg.selectAll("*").remove();

  if (chemName === "Empty") {
    return;
  }

  // get subset of our plotting data only corresponding with this chemical name
  let [ chemPlottingData, largestSeqIndex ] = getPlottingDataForChem(plottingData, chemName);

  // setup xScale and yScale
  let svgBoundingClient = svg.node().getBoundingClientRect()
  let svgWidth = svgBoundingClient.width;
  let svgHeight = svgBoundingClient.height;
  let yMin = d3.min(chemPlottingData, d => d.abundance);
  let yMax = d3.max(chemPlottingData, d => d.abundance);
  const dy = (yMax - yMin) / 12;
  yMin -= dy;
  yMax += dy;
  let widthOffset = 50;
  let heightOffset = 20;
  if (svg.attr("class") === "topLeft" || svg.attr("class") === "topRight") {
    heightOffset = 20;
  }
  const xScale = d3.scaleLinear().domain([0, largestSeqIndex + 1]).range([widthOffset, svgWidth - 10]);
  const yScale = yScaleType === "linear" ? d3.scaleLinear().domain([0, yMax]).range([svgHeight - heightOffset, 50]) : d3.scaleLog().domain([yMin, yMax]).range([svgHeight - heightOffset, 50]);

  // add points to scatter plot
  svg.selectAll("circle")
    .data(chemPlottingData)
    .enter()
    .append("circle")
    .attr("class", d => "c" + d.sequenceBaseName)
    .attr("cx", d => xScale(d.seqIndex + 1))
    .attr("cy", d => yScale(d.abundance))
    .attr("r", circleR)
    .attr("fill", d => colorScale(d.groupName))
    .attr("opacity", 0.6)
    .attr("stroke", "#000")
    .attr("stroke-width", 1)
    .attr("groupName", d => d.groupName)
    .on("mouseover", (event, d) => {
      // brighten point color
      const bigR = circleR*1.8;
      d3.selectAll(`.c${d.sequenceBaseName}`)
        .transition().duration(300)
        .attr("opacity", 0.9)
        .attr("r", bigR)
        .attr("stroke-width", 2);

      let tooltipHTML = `<tspan class="tooltipTspan">Tracer:</tspan> ${d.chemName}<br>`;
      tooltipHTML += `<tspan class="tooltipTspan">Sample Name</tspan>: ${d.sequenceName}<br>`;
      tooltipHTML += `<tspan class="tooltipTspan">Abundance</tspan>: ${d.formattedAbundance}<br>`;
      tooltipHTML += `<tspan class="tooltipTspan">CV</tspan>: ${d.CV}`;
      tooltip.html(tooltipHTML);

      tooltipContainer.style("height", "fit-content");
      tooltip.style("height", "fit-content");

      d3.selectAll("tspan.tooltipTspan")
        .style("font-weight", "bold");


      tooltipContainer.transition().duration(300)
        .style("background", () => `${colorScale(d.groupName)}`);

    })
    .on("mouseout", function(event, d) {
      d3.selectAll(`.c${d.sequenceBaseName}`)
        .transition().duration(300)
        .attr("opacity", 0.6)
        .attr("r", circleR)
        .attr("stroke-width", 1);
    });

  // add axes
  let yTicks = [];
  let stepSize = yMax / nYticks;
  if (yScaleType === "linear") {
    stepSize = yMax / (nYticks - 1);
    for (let i = 0; i < nYticks; i++) {
      yTicks.push(i*stepSize);
    }
  } else {
    yTicks = logspace(yMin, yMax, nYticks, 10, 3);
  }
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickValues(yTicks).tickFormat(d => yScaleType === "linear" ? d3.format(".2s")(d) : d3.format("~s")(d));

  /// xAxis
  const xAxisG = svg.append("g")
    .attr("transform", `translate(0, ${svgHeight - heightOffset})`)
    .call(xAxis)
    .append("text")
    .attr("x", svgWidth / 2 + widthOffset / 2)
    .attr("y", 45)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("font-size", "20px");

  /// yAxis
  const yAxisG = svg.append("g")
    .attr("transform", `translate(${widthOffset}, 0)`)
    .call(yAxis)
    .append("text")
    .attr("x", -svgHeight / 2)
    .attr("y", -55)
    .attr("fill", "black")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("font-size", "20px");

  // increase size of tick labels
  d3.selectAll(".tick > text")
    .style("font-size", "13px");

  // title
  svg.append("text")
    .attr("x", svgWidth / 2 + widthOffset / 2)
    .attr("y", 70 / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", fontSize)
    .attr("font-weight", "bold")
    .text(chemName);

  // add lines of best fit
  const line = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))
    .curve(d3.curveBasis);

  function generateCurve(a, b, c, xMin, xMax, stepSize = 0.2) {
    const curvePoints = d3.range(xMin, xMax, stepSize).map(x => ({
      x,
      y: a*x**2 + b*x + c
    }));
    return curvePoints;
  }

  const groupedData = d3.group(chemPlottingData, d => d.groupName);

  groupedData.forEach((points, group) => {
    if (points.length < 3) {
      return;
    }
    const [ a, b, c ] = quadraticRegression(points);
    const xExtent = d3.extent(points, d => d.seqIndex + 1);
    const xMin = xExtent[0] - 1;
    const xMax = xExtent[1] + 1;
    const curvePoints = generateCurve(a, b, c, xMin, xMax);

    svg.append("path")
      .datum(curvePoints)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("stroke-width", bestFitLW)
      .attr("stroke-linecap", "round")
      .attr("d", line)
      .attr("pointer-events", "none")
      .attr("class", "fit-line");

    svg.append("path")
      .datum(curvePoints)
      .attr("fill", "none")
      .attr("stroke", colorScale(group))
      .attr("stroke-width", bestFitLW-1)
      .attr("stroke-linecap", "round")
      .attr("d", line)
      .attr("pointer-events", "none")
      .attr("class", "fit-line");
  });
  
  if (linesOfBestFit === false) {
    d3.selectAll("path.fit-line")
      .style("visibility", "hidden");
  }

  // add gridlines
  const gridGroup = svg.append("g")
    .attr("class", "grid");

  gridGroup.selectAll(".y-grid")
    .data(yTicks)
    .enter()
    .append("line")
    .attr("class", "y-grid")
    .attr("x1", widthOffset)
    .attr("x2", svgWidth - 10)
    .attr("y1", d => yScale(d))
    .attr("y2", d => yScale(d))
    .attr("stroke", "#ddd")
    .attr("stroke-width", 1);

  gridGroup.selectAll(".x-grid")
    .data(xScale.ticks())
    .enter()
    .append("line")
    .attr("class", "x-grid")
    .attr("x1", d => xScale(d))
    .attr("x2", d => xScale(d))
    .attr("y1", 50)
    .attr("y2", svgHeight - heightOffset)
    .attr("stroke", "#ddd")
    .attr("stroke-width", 1);

  gridGroup.lower();
}

/**
 * The main function for generating the interactive run sequence plots.
 * @param {string} xlsxPath Path to the INTERPRET-NTA results .xlsx file.
 * @param {string} seqPath Path to the INTERPRET-NTA run sequence input CSV.
 */
async function mainRunSequence(xlsxPath, seqPath) {
  var linesOfBestFit = true;
  var yScaleType = "log";

  // get data
  let [ dataPos, dataNeg ] = await readInterpretOutputXLSX(xlsxPath);
  
  let dataSeq = await readInterpretSequenceCSV(seqPath);

  // clean sample sequence data, getting unique sample names and sample indices
  let [ uniqueSampleGroupsPos, seqGroupMapPos ] = cleanSeqData(dataPos, dataSeq);
  let [ uniqueSampleGroupsNeg, seqGroupMapNeg ] = cleanSeqData(dataNeg, dataSeq);

  // get chemNames for positive mode (to generate plot of first chemical to start)
  let chemNamesPos = getChemNames(dataPos, "(ESI+)");
  let chemNamesNeg = getChemNames(dataNeg, "(ESI-)");

  // get the final data structure for plotting
  let plottingDataPos = getPlottingData(dataPos, seqGroupMapPos, "(ESI+)");
  let plottingDataNeg = getPlottingData(dataNeg, seqGroupMapNeg, "(ESI-)");

  // we start in positive mode
  let plottingData = plottingDataPos.concat(plottingDataNeg);
  let chemNames = chemNamesPos.concat(chemNamesNeg);

  let chemNamesToggled = chemNames;

  // setup containers for grid elements
  const parentGridContainer = d3.select("#runSeqPlotsContainer")
    .append("div")
    .attr("id", "parent-grid-container")
    .style("display", "grid")
    .style("height", "fit-content")
    .style("width", "fit-content")
    // .style("margin", "auto")
    .style("grid-template-columns", "40px 1fr 170px")
    .style("grid-template-rows", "125px 27px 1fr 30px")
    .style("grid-template-areas", `
      "buttons buttons buttons"
      "yAxisTitle svg-grid groupTitle"
      "yAxisTitle svg-grid legendTooltip"
      "null1 xAxisTitle legendTooltip"
    `);

  const buttonGridContainer = parentGridContainer.append("div")
    .attr("id", "button-grid-container")
    .style("display", "grid")
    .style("grid-template-columns", "auto auto auto auto auto auto")
    .style("grid-area", "buttons")
    .style("justify-content", "center")
    .style("grid-template-areas", `
      "resolution pagination dropdowns reset bestFit yScale"
    `);

  const resolutionButtonContainer = buttonGridContainer.append("div")
      .attr("id", "resolution-button-grid-container")
      .style("grid-area", "resolution")
      .style("display", 'grid')
      .style("grid-template-columns", "1fr 1fr")
      .style("grid-template-rows", "1fr 1fr")
      .style("border", "1px solid #777")
      .style("border-radius", "3px")
      .style("margin-right", "12px");

  const gridContainer = parentGridContainer.append("div")
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

  const legendTooltipGridContainer = parentGridContainer.append("div")
    .attr("id", "legendTooltip-grid-container")
    .style("display", "grid")
    .style("grid-template-columns", "1fr")
    .style("grid-area", "legendTooltip");

  // add yAxisTitle
  const yAxisTitleContainer = parentGridContainer.append("div")
    .style("display", "grid")
    .style("grid-area", "yAxisTitle")
    .style("place-items", "center")
    .style("text-align", "center");

  yAxisTitleContainer
    .append("div")
    .style("transform", "translate(-25%, 140%) rotate(-90deg)")
    .style("font-size", "30px")
    .style("width", "36px")
    .style("text-align", "center")
    .text("Abundance");

  // add xAxisTitle
  const xAxisTitleContainer = parentGridContainer.append("div")
    .style("display", "grid")
    .style("grid-area", "xAxisTitle")
    .style("place-items", "center");

  xAxisTitleContainer
    .append("div")
    .style("font-size", "30px")
    .style("transform", "translate(10%, 50%)")
    .text("Sequence");

  // setup a data structure for generating 1x1, 2x2, 3x3 and 4x4 plots
  let resolutionData = {
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

  let resolution = "2x2";

  // setup tooltip for on-hovers
  const [ tooltipContainer, tooltip ] = makeTooltip();

  // color scale
  const colorScale = d3.scaleOrdinal()
    .domain(uniqueSampleGroupsPos)
    .range(["#66FFFF", "gold", "magenta", "#33AA33", "orange", "blue", "red", "purple", "green", "brown", "pink", "gray", "black"]);

  // generate plots
  makeSequencePlotsXxY(
    resolutionData, 
    resolution, 
    plottingData, 
    chemNamesToggled,
    tooltip,
    tooltipContainer,
    colorScale,
    true,
    "log"
  );

  // add resolution buttons
  const resolutionButtonData = [
    { "text": "1x1", "rects": 1 },
    { "text": "2x2", "rects": 4 },
    { "text": "3x3", "rects": 9 },
    { "text": "4x4", "rects": 16 }
  ];

  resolutionButtonData.forEach(buttonObject => {
    const button = resolutionButtonContainer
      .append("button")
      .style("margin", "2px")
      .on("click", () => {
        // reset chemNameIndex for pagination
        chemNameIndex = 0; 

        // update resolution
        resolution = buttonObject.text;

        // update plots
        makeSequencePlotsXxY(
          resolutionData, 
          buttonObject.text, 
          plottingData, 
          chemNamesToggled,
          tooltip,
          tooltipContainer,
          colorScale,
          linesOfBestFit,
          yScaleType
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

    const contentsDiv = button.append("div")
      .style("display", "grid")
      .style("grid-template-rows", "1fr ".repeat(rectsPerRow).trim())
      .style("grid-template-columns", "1fr ".repeat(rectsPerRow).trim())
      .style("gap", "2px")
      .style("margin", "auto")
      .style("place-items", "center");

    for (let i = 0; i < buttonObject.rects; i++) {
      contentsDiv.append("div")
        .style("width", rectSize)
        .style("height", rectSize)
        .style("background-color", "#999")
        .style("border", "1px solid black");
    }
  });

  // add legend
  const svgL = makeSvgElement(170, 200, "legendTooltip", "legendTooltip", legendTooltipGridContainer);
  
  let svgBoundingClient = svgL.node().getBoundingClientRect();
  const legendRadius = 8;
  const legendSpacing = 25;
  const legend = svgL.append("g")
    .attr("transform", `translate(0, ${svgBoundingClient.top + 60})`);

  legend.append("rect")
    .attr("x", 15)
    .attr("y", -180)
    .attr("width", 125)
    .attr("height", legendSpacing * uniqueSampleGroupsPos.length + 14)
    .attr("fill", "#E9E9E9")
    .attr("stroke", "#000")
    .attr("stroke-width", "2px")
    .attr("rx", "5px")
    .attr("ry", "5px");

  legend.selectAll("circle")
    .data(uniqueSampleGroupsPos)
    .enter()
    .append("circle")
    .attr("cx", 30)
    .attr("cy", (d, i) => i * legendSpacing - 160)
    .attr("r", legendRadius)
    .attr("fill", d => colorScale(d))
    .attr("stroke", "#000")
    .attr("stroke-width", 1);

  legend.selectAll("text")
    .data(uniqueSampleGroupsPos)
    .enter()
    .append("text")
    .attr("x", legendRadius + 35)
    .attr("y", (d, i) => i * legendSpacing + legendRadius / 2 - 159.5)
    .attr("dy", "2px")
    .style("font-size", "18px")
    .text(d => d);

  let legendBounds = legend.node().getBoundingClientRect();

  // add tooltip
  tooltipContainer.style("visibility", "visible")
    .style("left", `${legendBounds.left}px`)
    .style("top", `${legendBounds.bottom + 20}px`)
    .style("width", "400px")
    .style("height", "125px");

  tooltip.style("height", "115px");

  window.addEventListener("resize", () => {
    legendBounds = legend.node().getBoundingClientRect();
    tooltipContainer
      .style("left", `${legendBounds.left}px`)
      .style("top", `${legendBounds.bottom + 20}px`);
  });

  // add toggle button for lines of best fit
  buttonGridContainer.append("button")
    .style("grid-area", "bestFit")
    .html("&#x1F4C8")
    .style("font-size", "29px")
    .on("click", function() {
      linesOfBestFit = !linesOfBestFit;
      d3.selectAll("path.fit-line")
        .style("visibility", function() {
          return this.style.visibility === "hidden" ? "visible" : "hidden";
        });
    });

  // add toggle button for y-axis scale
  buttonGridContainer.append("button")
    .style("grid-area", "yScale")
    .text("f(x)")
    .style("font-size", "18px")
    .on("click", function() {
      yScaleType = yScaleType === "linear" ? "log" : "linear";
      const chemNamesTemp = []; //chemNamesToggled.slice(chemNameIndex, chemNameIndex + Number(resolution[0])**2);
      dropdownData.forEach(ddObject => {
        const dd = d3.select(`#${ddObject.id}`);
        if (dd.property("disabled") === true) {
          return;
        }
        chemNamesTemp.push(dd.property("value"));
      });
      makeSequencePlotsXxY(
        resolutionData,
        resolution,
        plottingData, 
        chemNamesTemp,
        tooltip,
        tooltipContainer,
        colorScale,
        linesOfBestFit,
        yScaleType
      );
    });

  // pagination buttons
  const buttonData = [
    { "text": "&#x00AB;" },
    { "text": "&#x00BB;" },
  ];

  buttonGridContainer.append("div")
    .style("grid-area", "pagination")
    .selectAll("button")
    .data(buttonData)
    .enter()
    .append("button")
    .style("height", "100%")
    .html(d => d.text)
    .style("font-size", "30px")
    .style("width", "38px")
    .on("click", function(event, d) {
      const dIndex = Number(resolution[0])**2;
      // if back button
      if (d.text === "&#x00AB;") {
        // do nothing if dd00 has the first chemical already
        if (chemNameIndex === 0) {
          return;
        }
        chemNameIndex -= dIndex;
      } else if (d.text === "&#x00BB;"){ // if forward button
        // if the final active box is already populated with the last chemical, do nothing
        if (chemNameIndex >= chemNamesToggled.length - Number(resolution[0])**2) {
          return;
        }
        chemNameIndex += dIndex;
      }

      // update the dropdowns
      let index = 0;
      d3.selectAll(".dropdown")
        .each(function(d, i) {
          if (d3.select(this).property("disabled") === true) {
            return;
          }
          const chemName = chemNamesToggled[chemNameIndex + index];
          this.value = chemNamesToggled[chemNameIndex + index];
          this.text = chemNamesToggled[chemNameIndex + index];
          index++;
        });

      // replot chemicals
      const chemNamesTemp = chemNamesToggled.slice(chemNameIndex, chemNameIndex + Number(resolution[0])**2)
      makeSequencePlotsXxY(
        resolutionData, 
        resolution, 
        plottingData, 
        chemNamesTemp,
        tooltip,
        tooltipContainer,
        colorScale,
        linesOfBestFit,
        yScaleType
      );
    });

  // add a "button" with 4 dropdown menues for selecting which chemicals to plot in each SVG
  const dropdownContainer = buttonGridContainer.append("div")
    .attr("id", "dropdown-container")
    .style("grid-area", "dropdowns")
    .style("display", "grid")
    .style("grid-template-columns", "1fr 1fr 1fr 1fr")
    .style("grid-template-rows", "1fr 1fr 1fr 1fr")
    .style("gap", "5px")
    .style("padding", "3px")
    .style("border", "1px solid black")
    .style("background-color", "#E9E9E9");
  
  let chemNameIndex = 0;
  const dropdownData = [
    { "id": "dd00", "svg": "svg00", "disabled": null },
    { "id": "dd01", "svg": "svg01", "disabled": null },
    { "id": "dd02", "svg": "svg02", "disabled": true },
    { "id": "dd03", "svg": "svg03", "disabled": true },
    { "id": "dd10", "svg": "svg10", "disabled": null },
    { "id": "dd11", "svg": "svg11", "disabled": null },
    { "id": "dd12", "svg": "svg12", "disabled": true },
    { "id": "dd13", "svg": "svg13", "disabled": true },
    { "id": "dd20", "svg": "svg20", "disabled": true },
    { "id": "dd21", "svg": "svg21", "disabled": true },
    { "id": "dd22", "svg": "svg22", "disabled": true },
    { "id": "dd23", "svg": "svg23", "disabled": true },
    { "id": "dd30", "svg": "svg30", "disabled": true },
    { "id": "dd31", "svg": "svg31", "disabled": true },
    { "id": "dd32", "svg": "svg32", "disabled": true },
    { "id": "dd33", "svg": "svg33", "disabled": true },
  ];

  function setDropdownsFromResolution(
    resolutionData, 
    resolution, 
    dropdownData,
    chemNames
  ) {
    // get the IDs for active dd menus at this resolution
    const dropdownIDs = resolutionData[resolution]["ddIDs"];
  
    // disable non-active dd menus
    const selections = d3.selectAll("#dropdown-container").selectAll("select")
      .attr("disabled", (_, i) => dropdownIDs.includes(dropdownData[i].id) ? null : true );
      
    // empty dd menu values to repopulate
    selections.selectAll("option").remove();

    // add a blank value for all dd menus
    selections.append("option")
      .attr("value", "Empty")
      .text("")

    // add the chemNames from the dd menu
    let chemIndex = 0;
    dropdownData.forEach(ddObject => {
      if (!dropdownIDs.includes(ddObject.id)) {
        return;
      }
      const dropdown = d3.select(`#${ddObject.id}`);
      chemNames.forEach(chemName => {
        dropdown.append("option")
          .attr("value", chemName)
          .text(chemName);
      });
      dropdown.property("value", chemNames[chemIndex]);
      chemIndex++;
    }); 
  }

  // set initial dropdown values
  let chemIndex = 0;
  let activeDDIDs = resolutionData[resolution]["ddIDs"];
  dropdownData.forEach(d => {
    let dropdown = dropdownContainer.append("select")
      .attr("id", d.id)
      .attr("class", "dropdown")
      .style("width", "200px")
      .style("font-size", "14px")
      .attr("disabled", d.disabled);

    dropdown.append("option")
      .attr("value", "Empty")
      .text("")

    chemNames.forEach(chemName => {
      dropdown.append("option")
        .attr("value", chemName)
        .text(chemName);      
    });

    if (chemIndex < 4 && activeDDIDs.includes(d.id)) {
      dropdown.property("value", chemNames[chemIndex]);
      chemIndex++;
    } else {
      dropdown.property("value", "");
    }

    dropdown.on("change", () => {
      const selectedChemName = dropdown.property("value");
      const svg = d3.select(`#${d["svg"]}`)

      makeRunSequencePlot(
        svg, 
        plottingData, 
        selectedChemName, 
        tooltip, 
        tooltipContainer, 
        colorScale, 
        linesOfBestFit, 
        yScaleType,
        resolutionData[resolution]["circleR"],
        resolutionData[resolution]["bestFitLW"],
        resolutionData[resolution]["nYTicks"],
        resolutionData[resolution]["fontSize"]
      );

      // update dropdown menu to reflect the current chemical name
      dropdown.selectAll("option").remove();
      dropdown.append("option")
        .attr("value", "Empty")
        .text("")
      chemNamesToggled.forEach(chemName => {
        dropdown.append("option")
          .attr("value", chemName)
          .text(chemName);
      });
      dropdown.property("value", selectedChemName);
    });
  });

  // add reset button
  buttonGridContainer.append("button")
    .style("grid-area", "reset")
    .html("&#x21BA;")
    .style("font-size", "28px")
    .style("width", "38px")
    .style("padding-top", "6px")
    .on("click", function() {
      d3.select("#groupTitle").remove();
      chemNameIndex = 0;

      chemNamesToggled = chemNames;
      setDropdownsFromResolution(
        resolutionData, 
        resolution, 
        dropdownData,
        chemNames
      )

      // update plots
      makeSequencePlotsXxY(
        resolutionData, 
        resolution, 
        plottingData, 
        chemNamesToggled,
        tooltip,
        tooltipContainer,
        colorScale,
        linesOfBestFit,
        yScaleType
      );
    });

  // add grouping functionality
  let groupCount = 0;

  // button for creating groups
  d3.select("#runSeqPlotsContainer")
    .append("button")
    .text("Create Group")
    .style("margin-top", "20px")
    .style("margin-bottom", "10px")
    .style("margin-left", "20px")
    .on("click", createGroup);

  // add a group container for the groups
  const groupContainer = d3.select("#runSeqPlotsContainer")
    .append("div")
    .attr("class", "group-container")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "10px")
    .style("justify-content", "flex-start");

  function createGroup() {
    groupCount++;

    // create a container for each group
    const groupDiv = groupContainer.append("div")
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
    groupDiv.append("label")
      .text("Group Name: ")
      .style("margin-bottom", "4px");
    const groupNameInput = groupDiv.append("input")
      .attr("type", "text")
      .attr("class", "group-name")
      .style("margin-bottom", "10px");

    // input for description
    groupDiv.append("label")
      .text("Description: ")
      .style("margin-bottom", "4px");
    groupDiv.append("textarea")
      .attr("class", "group-desc")
      .style("margin-bottom", "10px")
      .attr("rows", "3")
      .style("width", "595px")
      .style("resize", "none")
      .style("font-family", "inherit")
      .style("font-size", "inherit")
      .style("font-height", "inherit");

    groupDiv.append("label")
      .text("Select Chemical: ")
      .style("margin-bottom", "4px");

    // dropdown for selecting chem names
    const chemSelectContainer = groupDiv.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "10px");

    const select = chemSelectContainer.append("select")
      .attr("class", "chem-dropdown")
      .style("width", "300px");

    select.selectAll("option")
      .data(chemNames)
      .enter()
      .append("option")
      .text(d => d);

    // add button for adding chemical
    chemSelectContainer.append("button")
      .text("Add Chemical")
      .style("width", "100px")
      .on("click", () => {
        const selectedChem = select.property("value");
        addChemToList(groupDiv, selectedChem);
      });

    // list to display selected chems
    groupDiv.append("ul").attr("class", "chem-list");

    // buttons in bottom right
    const groupButtonContainer = groupDiv.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "15px")
      .style("position", "absolute")
      .style("bottom", "10px")
      .style("right", "10px");

    // visualize group button
    groupButtonContainer.append("button")
      .html("&#x1F453;")
      .style("font-size", "26px")
      .on("click", () => {
        const chemList = [];
        groupDiv.selectAll("li").nodes().forEach((d) => {
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
        )

        // update plot
        makeSequencePlotsXxY(
          resolutionData, 
          resolution, 
          plottingData, 
          chemNamesToggled,
          tooltip,
          tooltipContainer,
          colorScale,
          linesOfBestFit,
          yScaleType
        );

        // add group name to plot
        d3.select("#groupTitle").remove();
        const groupNameValue = groupNameInput.property("value");
        const groupTitleContainer = parentGridContainer.append("div")
          .attr("id", "groupTitleContainer")
          .style("grid-area", "groupTitle")
          .style("display", "grid")
          .style("transform", "translate(16px, 0)");

        groupTitleContainer.append("div")
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
    groupButtonContainer.append("button")
      .html("&#x1F5D1;")
      .style("font-size", "26px")
      .style("color", "red")
      .on("click", () => {
        const groupNameValue = groupNameInput.property("value");
        const chemList = groupDiv.selectAll("li").nodes();
        if (groupNameValue || chemList.length > 0) {
          const confirmed = window.confirm(` Are you sure you want to delete ${groupNameValue ? '"' + groupNameValue + '"' : "this group"}?`);
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
            )

            // update plot
            makeSequencePlotsXxY(
              resolutionData, 
              resolution, 
              plottingData, 
              chemNamesToggled,
              tooltip,
              tooltipContainer,
              colorScale,
              linesOfBestFit,
              yScaleType
            );

            // remove group title on plot if exists
            d3.select("#groupTitle").remove();
          }
        } else {
          groupDiv.remove();
          groupCount--;
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
    const exists = list.selectAll("li")
      .nodes()
      .some(li => d3.select(li).select("span").text() === chemName);

    if (exists){
      return;
    }
    
    // remove button
    const listItem = list.append("li")
      .style("display", "flex")
      .style("align-items", "center");
    
    listItem.append("button")
      .html("&#x1F5D1;")
      .style("font-size", "22px")
      .style("color", "red")
      .style("padding", "-5px 1px")
      .style("margin-bottom", "5px")
      .on("click", () => {
        listItem.remove();
      });

    // create list item
    listItem.append("span")
      .text(chemName)
      .style("margin-left", "10px");
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

    groups.forEach(group => {
      const chemicals = d3.select(group)
        .select(".chem-list")
        .selectAll("li")
        .nodes()
        .map(li => d3.select(li).select("span").text());
      
      if (chemicals.length === 0) {
        return;
      }

      const chemicalNames = [];
      const chemicalModes = [];
      const esiRegex = /\s\((ESI[+-])\)/
      chemicals.forEach(chemical => {
        const [ chemName, chemMode, _ ] = chemical.split(esiRegex);
        chemicalNames.push(chemName);
        chemicalModes.push(chemMode);
      });

      const groupTitle = d3.select(group)
        .select("input")
        .property("value");
      const groupDesc = d3.select(group)
        .select("textarea")
        .property("value");

      const groupDatum = [
        groupTitle, groupDesc, chemicalNames, chemicalModes
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
}

const xlsxPath = "../data/TM_7ppm_10MRL_NTA_WebApp_results.xlsx";
const seqCsvPath = "../data/WW2DW_sequence-jon.csv";
mainRunSequence(xlsxPath, seqCsvPath);
