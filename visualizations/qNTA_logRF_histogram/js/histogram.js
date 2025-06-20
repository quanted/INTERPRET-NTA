const PATH_TO_DATA = "./data/val_out_test_NTA_WebApp_qNTA.xlsx";
const RF_VALUES_SHEET = "Surrogate Detection Statistics";
const POS_RF_PERCENTILES_SHEET = "Pos Mode RF Percentile Ests";
const NEG_RF_PERCENTILES_SHEET = "Neg Mode RF Percentile Ests";

/**
 * Generates an array of n colors between color0 and color1.
 * @param {string} color0 The starting color in any CSS color format.
 * @param {string} color1 The ending color in any CSS color format.
 * @param {number} n The number of colors to generate.
 * @returns {string[]} An array of n colors between color0 and color1.
 */
function generateColors(color0, color1, n) {
  const interpolate = d3.interpolateRgb(color0, color1);
  const colors = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    colors.push(interpolate(t));
  }
  return colors;
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
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[RF_VALUES_SHEET]);

  return jsonData;
}

async function readRFPercentileVals() {
  const response = await fetch(PATH_TO_DATA);
  const arrayBuffer = await response.arrayBuffer();

  // access data from desired tracer detection sheet and write to json object
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  const posRFPercentiles = XLSX.utils.sheet_to_json(
    workbook.Sheets[POS_RF_PERCENTILES_SHEET]
  );
  const negRFPercentiles = XLSX.utils.sheet_to_json(
    workbook.Sheets[NEG_RF_PERCENTILES_SHEET]
  );

  return { posRFPercentiles, negRFPercentiles };
}

/**
 * Cleans our input data by removing unnecessary columns and the raw RF columns while adding log RF columns.
 * Also calculates the median log RF value for each chemical and adds it to each object.
 * @param {object[]} data The data representing the input spreadsheet.
 * @returns {object[]} The cleaned data.
 */
function cleanData(data, lambda = 0.5) {
  const columnsToKeep = [
    "Feature ID",
    "Chemical Name",
    "Ionization Mode",
    "Retention Time",
  ];
  const logRFValues = {};

  data.forEach((row) => {
    Object.entries(row).forEach(([colName, value]) => {
      // if the column isn't an RF value or in the list of columns to keep, remove it
      if (!colName.startsWith("RF ") && !columnsToKeep.includes(colName)) {
        delete row[colName];
        return;
      }

      // We need to append the ionization mode to the chemical name
      if (colName === "Chemical Name") {
        row[colName] = `${row[colName]} (${row["Ionization Mode"]})`;
      }

      // if we have an RF value, add a log key-value pair and remove the original RF value
      if (colName.startsWith("RF ")) {
        const logColName = `log ${colName}`;
        row[logColName] = Math.log(value);
        delete row[colName];

        // collect log RF values for median calculation
        if (!logRFValues[row["Chemical Name"]]) {
          logRFValues[row["Chemical Name"]] = [];
        }
        logRFValues[row["Chemical Name"]].push(row[logColName]);
      }
    });
  });

  return data;
}

function getRFValues(data) {
  const rfValues = [];
  data.forEach((d) => {
    Object.entries(d).forEach(([key, value]) => {
      if (key.startsWith("RF ")) {
        rfValues.push(value);
      }
    });
  });

  return rfValues;
}

function boxCoxTransform(value, lambda) {
  return lambda === 0
    ? Math.log(value)
    : (Math.pow(value, lambda) - 1) / lambda;
}

function logLikelihood(lambda, values) {
  const transformed = values.map((rf) => boxCoxTransform(rf, lambda));
  const n = transformed.length;
  const yBar = transformed.reduce((a, b) => a + b, 0) / n;
  let xTerm = 0;
  let yTerm = 0;
  for (let i = 0; i < n; i++) {
    xTerm += Math.log(values[i]);
    yTerm += (transformed[i] - yBar) ** 2 / n;
  }
  const ll = (lambda - 1) * xTerm - (n / 2) * Math.log(yTerm);

  return ll;
}

function findOptimalLambda(values, lambdaRange = [-5, 5], step = 0.01) {
  let bestLambda = lambdaRange[0];
  let bestLogLikelihood = -Infinity;

  const llValues = [];
  const lambdaValues = [];

  for (let lambda = lambdaRange[0]; lambda <= lambdaRange[1]; lambda += step) {
    const ll = logLikelihood(lambda, values);
    llValues.push(ll);
    lambdaValues.push(lambda);
    if (ll > bestLogLikelihood) {
      bestLogLikelihood = ll;

      bestLambda = lambda;
    }
  }

  return [bestLambda, lambdaValues, llValues];
}

async function histogramMain(inputXlsxPath) {
  // read in data
  let data = await readInterpretOutputXLSX(inputXlsxPath);

  const dataPos = data.filter((d) => {
    if (d["Ionization Mode"] === "ESI+") {
      return d;
    }
  });
  const dataNeg = data.filter((d) => {
    if (d["Ionization Mode"] === "ESI-") {
      return d;
    }
  });

  const { posRFPercentiles, negRFPercentiles } = await readRFPercentileVals();
  let rfValuesPos = getRFValues(dataPos);
  let rfValuesNeg = getRFValues(dataNeg);
  let logRfValuesPos = rfValuesPos.map((d) => Math.log10(d));
  let logRfValuesNeg = rfValuesNeg.map((d) => Math.log10(d));

  let [lambdaPos, lambdaValuesPos, llValuesPos] =
    findOptimalLambda(rfValuesPos);
  lambdaPos = lambdaPos.toFixed(2);
  let [lambdaNeg, lambdaValuesNeg, llValuesNeg] =
    findOptimalLambda(rfValuesNeg);
  lambdaNeg = lambdaNeg.toFixed(2);

  let boxCoxRfValuesPos = rfValuesPos.map((d) => boxCoxTransform(d, lambdaPos));
  let boxCoxRfValuesNeg = rfValuesNeg.map((d) => boxCoxTransform(d, lambdaNeg));

  // create grid containers
  const parentGrid = d3
    .select("#histogram-container")
    .append("div")
    .style("display", "grid")
    .style("grid-template-columns", "801.5px 60px 300px")
    .style("grid-template-rows", "100px 1fr")
    .style(
      "grid-template-areas",
      `
      "quantiles null0 binTooltip"
      "histo rightButtons tooltips"
      `
    );

  // Create input fields for quantiles in a table
  const quantileTable = parentGrid
    .append("table")
    .style("grid-area", "quantiles")
    .attr("class", "quantile-table")
    .style("border-collapse", "collapse")
    .style("width", "100%")
    .style("margin-bottom", "10px");

  const headerRow = quantileTable.append("thead").append("tr");
  headerRow.append("th").text("").style("width", "200px"); // .style("border", "1px solid black").style("padding", "5px");
  headerRow
    .append("th")
    .text("Q1")
    .style("border", "1px solid black")
    .style("padding", "5px");
  headerRow
    .append("th")
    .text("Q2")
    .style("border", "1px solid black")
    .style("padding", "5px");
  headerRow
    .append("th")
    .text("Q3")
    .style("border", "1px solid black")
    .style("padding", "5px");

  const tableBody = quantileTable.append("tbody");

  const inputRow = tableBody.append("tr").style("height", "28px");
  inputRow
    .append("td")
    .style("border", "1px solid black")
    .html("<b>Quantile</b>")
    .style("padding", "5px")
    .style("text-align", "center");

  // Both positive and negative RF percentile calculations will have the same quantile
  // values, so we choose positive to create the quantile table data.
  posRFPercentiles.forEach((d, i) => {
    inputRow
      .append("td")
      .style("border", "1px solid black")
      .style("width", "25%")
      .attr("id", `quantile-${i}`)
      .html(`<b>${d["Response Factor Percentile Estimate"] / 100}</b>`)
      .style("padding", "5.2px")
      .style("text-align", "center");
  });

  const rfRow = tableBody.append("tr");
  rfRow
    .append("td")
    .style("border", "1px solid black")
    .attr("id", "tina")
    .html("<b>RF Values</b>")
    .style("padding", "5.2px")
    .style("text-align", "center");
  [0, 1, 2].forEach((n) => {
    rfRow
      .append("td")
      .attr("id", `rf-${n}`)
      .style("border", "1px solid black")
      .style("text-align", "center")
      .style("padding", "5px");
  });

  // Create a box to display the lambda value
  let boxCoxToggled = false;
  const buttonPanel = parentGrid
    .append("div")
    .style("grid-area", "rightButtons");

  const lambdaBox = parentGrid
    .append("div")
    .attr("class", "lambda-box")
    .style("font-size", "32px")
    .html(`&#x03BB;`)
    .style("padding", "5px")
    .style("background-color", "#eeeeee")
    .style("height", "30px")
    .style("border-radius", "10px")
    .style("width", "35px")
    .style("display", "flex") // Use flexbox
    .style("align-items", "center") // Center vertically
    .style("justify-content", "center")
    .style("margin-top", "112px")
    .style("margin-left", "-10px")
    .style("padding-left", "13px")
    .style("border", "2px solid #999")
    .style("cursor", "pointer")
    .on("mouseover", () => {
      d3.select("div.lambda-box")
        .transition()
        .duration(300)
        .style("border-color", "black");
      showLambdaTooltip();
    })
    .on("mouseout", () => {
      d3.select("div.lambda-box")
        .transition()
        .duration(300)
        .style("border-color", "#999");
      hideLambdaTooltip();
    })
    .on("click", function () {
      if (boxCoxToggled) {
        d3.select(this)
          .transition()
          .duration(300)
          .style("background-color", "#eee");
      } else {
        d3.select(this)
          .transition()
          .duration(300)
          .style("background-color", "#dfffdf");
      }
      boxCoxToggled = !boxCoxToggled;

      toggleHistogram();
    });

  // Create a tooltip for the lambda box
  const lambdaTooltip = parentGrid
    .append("div")
    .style("z-index", 1000)
    .style("grid-area", "tooltips")
    .attr("class", "lambda-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("background-color", "#fff")
    .style("border", "1px solid black")
    .style("padding", "10px")
    .style("height", "220px");

  lambdaTooltip
    .append("span")
    .attr("id", "lambda-tooltip-text")
    .style("display", "flex")
    .style("justify-content", "center")
    .style("font-size", "18px");

  const svgLLT = lambdaTooltip
    .append("svg")
    .attr("id", "lambdaTooltipSVG")
    .attr("width", 300)
    .attr("height", 200);

  const margin = { top: 10, right: 30, bottom: 30, left: 40 },
    width = 300 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

  const g = svgLLT
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([-5, 5]).range([20, width]);

  const y = d3.scaleLinear().range([height, 0]);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y).ticks(4))
    .attr("transform", `translate(20, 0)`);

  // Add x-axis title
  g.append("text")
    .attr("text-anchor", "end")
    .attr("x", width / 2 + 14)
    .attr("y", height + margin.top + 21)
    .text("λ");

  // Add y-axis title
  g.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -margin.top - 15)
    .text("Log Likelihood");

  function updateLambdaTooltip(lambda, lambdaValues, llValues) {
    y.domain(d3.extent(llValues));

    g.selectAll("#lambda-path").remove();
    g.selectAll("#lambda-line").remove();

    g.append("path")
      .attr("id", "lambda-path")
      .datum(lambdaValues.map((d, i) => ({ x: d, y: llValues[i] })))
      .attr("fill", "none")
      .attr("stroke", "teal")
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.x))
          .y((d) => y(d.y))
      );

    // Add vertical line for optimal lambda
    g.append("line")
      .attr("id", "lambda-line")
      .attr("x1", x(lambda))
      .attr("x2", x(lambda))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "red")
      .attr("stroke-dasharray", "4")
      .attr("stroke-width", 1.5);
  }

  function showLambdaTooltip(event) {
    const lambda = mode === "pos" ? lambdaPos : lambdaNeg;
    const lambdaValues = mode === "pos" ? lambdaValuesPos : lambdaValuesNeg;
    const llValues = mode === "pos" ? llValuesPos : llValuesNeg;

    d3.select("#lambda-tooltip-text").html(
      `&#x03BB;${mode === "pos" ? "+" : "-"} = ${lambda}`
    );
    updateLambdaTooltip(lambda, lambdaValues, llValues);

    lambdaTooltip.transition().duration(200).style("opacity", 1);
  }

  function hideLambdaTooltip() {
    lambdaTooltip.transition().duration(200).style("opacity", 0);
  }

  // Add mode buttons
  const modeButtonData = [
    { text: "+", id: "pos" },
    { text: "-", id: "neg" },
  ];

  modeButtonData.forEach((d) => {
    buttonPanel
      .append("div")
      // .style("grid-area", "rightButtons")
      .append("button")
      .attr("id", d.id)
      .style("height", "40px")
      .style("width", "60px")
      .style("font-size", () => (d.text === "-" ? "36px" : "26px"))
      .style("padding-left", () => (d.text === "+" ? "26px" : "28px"))
      .style("padding-right", "10px")
      .style("padding-bottom", () => (d.text === "-" ? "18px" : "1px"))
      .style("padding-top", () => (d.text === "-" ? "0px" : "1px"))
      .style("margin-left", "-13px")
      .style("background-color", d.id === "pos" ? "#ddffdd" : "#efefef")
      .style("text-align", "left")
      .style("margin-top", d.id === "pos" ? "75px" : "3px")
      .style("line-height", "34px")
      .style("border", `2px solid #999`)
      .style("border-radius", "8px")
      .style("cursor", "pointer")
      .html(d.text)
      .on("mouseover", () => {
        d3.select(`#${d.id}`)
          .transition()
          .duration(200)
          .style("border-color", "black");
      })
      .on("mouseout", () => {
        d3.select(`#${d.id}`)
          .transition()
          .duration(200)
          .style("border-color", "#999");
      })
      .on("click", () => {
        // update border-radius
        modeButtonData.forEach((q) => {
          if (q.id !== d.id) {
            d3.select(`#${q.id}`)
              .transition()
              .duration(300)
              .style("background-color", "#efefef");
          }
        });
        d3.select(`#${d.id}`)
          .transition()
          .duration(300)
          .style("background-color", "#ddffdd");

        // Update the histogram based on the selected mode
        if (d.text === "+") {
          mode = "pos";
          if (showingBoxCox) {
            makeHisto(boxCoxRfValuesPos);
          } else {
            makeHisto(logRfValuesPos);
          }
        } else {
          mode = "neg";
          if (showingBoxCox) {
            makeHisto(boxCoxRfValuesNeg);
          } else {
            makeHisto(logRfValuesNeg);
          }
        }
      });
  });

  // Add help button
  let helpTooltipClicked = false;
  const helpButton = buttonPanel
    .append("div")
    .style("grid-area", "rightButtons")
    .attr("class", "help-button")
    .style("font-size", "32px")
    .html("�")
    .style("color", "#999")
    .style("padding", "5px")
    .style("background-color", "#eeeeee")
    .style("height", "30px")
    .style("border-radius", "10px")
    .style("width", "35px")
    .style("display", "flex") // Use flexbox
    .style("align-items", "center") // Center vertically
    .style("justify-content", "center")
    .style("margin-top", "283px")
    .style("margin-left", "-10px")
    .style("padding-left", "13px")
    .style("padding-bottom", "10px")
    .style("border", "2px solid #777")
    .style("cursor", "help")
    .on("mouseover", () => {
      d3.select("div.help-button")
        .transition()
        .duration(300)
        .style("border-color", "black");
      if (!helpTooltipClicked) {
        showHelpTooltip();
      }
    })
    .on("mouseout", () => {
      d3.select("div.help-button")
        .transition()
        .duration(300)
        .style("border-color", "#999");
      if (!helpTooltipClicked) {
        hideHelpTooltip();
      }
    })
    .on("click", () => {
      helpTooltipClicked = !helpTooltipClicked;
      if (helpTooltipClicked) {
        d3.select("div.help-button")
          .transition()
          .duration(300)
          .style("background-color", "#ddffdd");
        showHelpTooltip();
      } else {
        d3.select("div.help-button")
          .transition()
          .duration(300)
          .style("background-color", "#eeeeee");
        hideHelpTooltip();
      }
    });

  // Create a tooltip for the help button
  const helpTooltip = parentGrid
    .append("div")
    .style("grid-area", "tooltips")
    .attr("class", "help-tooltip")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("background-color", "#fff")
    .style("border", "1px solid black")
    .style("border-radius", "3px")
    .style("padding", "10px")
    .style("width", "400px");

  helpTooltip
    .html(
      'The histogram displays ESI+ chemicals with the log Response Factor (RF) on the x-axis by default.<br><br>RF = abundance/concentration<br><br><b>Features</b><ul><li>2.5%, 50% and 97.5% quantiles are displayed by default. These may be updated with the input boxes within the second row of the table above the histogram. The transformed RF values for each quantile are displayed in the third row</li><li>Hovering over a bin will update the tooltip in the top right with the bin count and the range of transformed RF values that bin encompasses</li><li>Hovering over the λ button will display a graph of the log likelihood as a function of lambda for a Box Cox transformation with the optimal value of lambda highlighted. Clicking this button will apply a Box Cox transformation to the raw RF values</li><li>Clicking the "+" and "-" buttons will toggle between ESI+ and ESI- mode, respectively</li></ul>'
    )
    .style("font-size", "18px")
    .style("padding", "10px");

  function showHelpTooltip(event) {
    helpTooltip.transition().duration(200).style("opacity", 0.9);
  }

  function hideHelpTooltip() {
    helpTooltip.transition().duration(200).style("opacity", 0);
  }

  let showingBoxCox = false;
  let mode = "pos";
  makeHisto(logRfValuesPos, [0.025, 0.5, 0.975]);

  function toggleHistogram() {
    d3.select("#primary-histo-svg").remove();
    showingBoxCox = !showingBoxCox;
    if (showingBoxCox) {
      if (mode === "pos") {
        makeHisto(boxCoxRfValuesPos);
      } else {
        makeHisto(boxCoxRfValuesNeg);
      }
    } else if (mode === "pos") {
      makeHisto(logRfValuesPos);
    } else makeHisto(logRfValuesNeg);
  }

  function makeHisto(dataArr, quantileValues = null) {
    // remove existing histogram
    d3.select("#primary-histo-svg").remove();

    // Create D3 histogram
    const margin = { top: 20, right: 30, bottom: 60, left: 70 },
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    const svg = parentGrid
      .append("svg")
      .style("grid-area", "histo")
      .style("background-color", "white")
      .style("border", "1px solid black")
      .attr("id", "primary-histo-svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("id", "primary-histo-g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#ededed");

    let [xMin, xMax] = d3.extent(dataArr);
    const x = d3.scaleLinear().domain([xMin, xMax]).nice().range([0, width]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(10).tickPadding(5))
      .selectAll("text")
      .style("font-size", "14px");

    const histogram = d3
      .histogram()
      .value((d) => d)
      .domain(x.domain())
      .thresholds(x.ticks(26));

    const bins = histogram(dataArr);

    const y = d3
      .scaleLinear()
      .range([height, 0])
      .domain([0, d3.max(bins, (d) => d.length)]);

    svg
      .append("g")
      .call(
        d3
          .axisLeft(y)
          .tickSize(10)
          .tickPadding(5)
          .tickFormat(d3.format("d"))
          .tickValues(y.ticks().filter((tick) => Number.isInteger(tick))) // Filter to show only integer values
      )
      .selectAll("text")
      .style("font-size", "14px");

    // Add y-axis title
    svg
      .append("text")
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 26)
      .attr("x", -margin.top - 160)
      .text("Count")
      .style("font-size", "18px");

    // Add x-axis title using foreignObject to render HTML
    svg
      .append("foreignObject")
      .attr("x", showingBoxCox ? width / 2 - 97 : width / 2 - 96)
      .attr("y", height + margin.top + 12)
      .attr("width", 200) // Adjust width as needed
      .attr("height", 30) // Adjust height as needed
      .append("xhtml:div")
      .style("font-size", "18px")
      .style("text-align", "center")
      .html(showingBoxCox ? "Box-Cox Transformed RF" : "Log<sub>10</sub>(RF)");

    const tooltipContainer = parentGrid
      .append("div")
      .attr("class", "tooltip")
      .style("grid-area", "binTooltip")
      // .style("border", "1px solid black")
      .style("border-radius", "5px")
      .style("background-color", "black")
      .style("box-shadow", "0 0 5px rgba(0,0,0,0.3)")
      .style("display", "block")
      .style("line-height", "25px")
      .style("width", "200px")
      .style("height", "60px")
      .style("align-self", "start");

    const tooltip = tooltipContainer
      .append("div")
      .style("padding", "4px")
      .style("margin", "0px 0px 0px 4px")
      .style("border", "1px solid black")
      .style("border-radius", "2px 0px 0px 2px")
      .style("background-color", "white")
      .style("height", "50px")
      .style("font-size", "17px");

    let colors = generateColors("#aa00aa", "#009090", 5);
    colors = colors.concat(generateColors("#009090", "#cc6600", 5).slice(1));

    const colorScale = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (d) => d.length)])
      .range(["#006060", "#00EEEE"]);

    svg
      .selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
      .attr("class", "histo-bin")
      // .attr("x", 0)
      .attr("transform", (d) => `translate(${x(d.x0)},${y(d.length)})`)
      .attr("width", (d) => x(d.x1) - x(d.x0))
      .attr("height", (d) => height - y(d.length))
      .style("fill", "#009090") //d => colorScale(d.length))
      .style("opacity", 0.7)
      .style("stroke", "black")
      .on("mouseover", function (event, d) {
        const thisBin = d3.select(this);
        const previousBin = d3.select("rect#activeBin");
        previousBin.attr("id", "");
        thisBin.attr("id", "activeBin");

        // Lower the previous active bin by one level
        if (!previousBin.empty()) {
          const parentNode = previousBin.node().parentNode;
          parentNode.insertBefore(previousBin.node(), thisBin.node());
        }

        thisBin.raise();
        d3.selectAll("line.quantile").raise();
        d3.selectAll("rect.histo-bin")
          .transition()
          .duration(200)
          .style("opacity", 0.7)
          .style("stroke-width", "1px");
        thisBin
          .transition()
          .duration(200)
          .style("opacity", 1)
          .style("stroke-width", "2.5px");
        tooltipContainer
          .transition()
          .duration(200)
          .style("opacity", 1)
          .style("background-color", thisBin.style("fill"));
        tooltip.html(
          `<b>Count:</b> ${d.length}<br><b>Range:</b> ${d.x0.toFixed(
            2
          )} - ${d.x1.toFixed(2)}`
        );
      });

    addQuantileLines([0.025, 0.5, 0.975], x, height);
  }

  function addQuantileLines(quantiles, x, height) {
    const quantileValues =
      mode === "pos"
        ? posRFPercentiles.map((p, i) => {
            if (quantiles[i] === p["Response Factor Percentile Estimate"] / 100)
              return p.Median;
          })
        : negRFPercentiles.map((p, i) => {
            if (quantiles[i] === p["Response Factor Percentile Estimate"] / 100)
              return p.Median;
          });

    const boxCoxTransformedQuantiles =
      mode === "pos"
        ? quantileValues.map((p) => boxCoxTransform(p, lambdaPos))
        : quantileValues.map((p) => boxCoxTransform(p, lambdaNeg));

    const loggedQuantileValues = quantileValues.map((p) => Math.log10(p));

    const quantilesToDraw = boxCoxToggled
      ? boxCoxTransformedQuantiles
      : loggedQuantileValues;
    const svg = d3.select("#primary-histo-g");

    svg
      .selectAll("line.quantile")
      .data(quantilesToDraw)
      .enter()
      .append("line")
      .attr("class", "quantile")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "black")
      .attr("stroke-dasharray", "8")
      .attr("stroke-width", 3.5);

    // Update RF values in the table
    quantileValues.forEach((q, i) => {
      d3.select(`#rf-${i}`).text(q.toFixed(2));
    });
  }
}

histogramMain(PATH_TO_DATA);
