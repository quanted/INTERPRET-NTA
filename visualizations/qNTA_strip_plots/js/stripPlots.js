/**
 * A d3 selection of an HTML element.
 * @typedef {d3.Selection<HTMLElement>} D3Selection
 */

/**
 * Returns a random number between min and max.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @returns {number} A random value between min and max.
 */
function randomNumRange(min, max) {
  return Math.random() * (max - min) + min;
}

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
  const sheetName = "Surrogate Detection Statistics";
  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  return jsonData;
}

/**
 * Cleans our input data by removing unnecessary columns and the raw RF columns while adding log RF columns.
 * Also calculates the median log RF value for each chemical and adds it to each object.
 * @param {object[]} data The data representing the input spreadsheet.
 * @returns {object[]} The cleaned data.
 */
function cleanData(data) {
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
        if (Number(value) <= 0) {
          return;
        }
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

  // calculate median log RF values and add to each row
  data.forEach((row) => {
    const chemicalName = row["Chemical Name"];
    const logRFs = logRFValues[chemicalName];
    const medianLogRF = d3.median(logRFs);
    row["Median Log RF"] = medianLogRF;
  });

  return data;
}

/**
 * Generates an array whose elements are object that hold the data relevant to each point on the scatter plot
 * @param {object[]} data Our cleaned data object.
 * @returns {object[]} An array of objects for plotting points on a scatter plot.
 */
function getPointsData(data, nChemsPerPlot, showMode = "both") {
  const pointsData = [];
  let colors = generateColors("#CC00CC", "#009090", 4);
  colors = colors.concat(generateColors("#009090", "#FF6600", 4).slice(1));
  colors = colors.concat(generateColors("#FF9933", "#CC00CC", 2).slice(1, -1));
  let chemName = data[0]["Chemical Name"];
  let i = 0;
  // iterate over rows of data
  data.forEach((d) => {
    // filter on showMode (+ or - or both)
    if (showMode === "+") {
      if (d["Chemical Name"].includes("(ESI-)")) {
        return;
      }
    } else if (showMode === "-") {
      if (d["Chemical Name"].includes("(ESI+)")) {
        return;
      }
    }

    // now iterate over column headers and cell values
    Object.entries(d).forEach(([key, value]) => {
      // if we have logRF value, create an object to push into pointsData
      if (key.startsWith("log RF ")) {
        // get the sample name, remove underscore suffix if exists
        let sampleName = key.split("log RF ")[1];
        sampleName = sampleName.endsWith("_")
          ? sampleName.slice(0, sampleName.length - 1)
          : sampleName;

        if (d["Chemical Name"] !== chemName) {
          chemName = d["Chemical Name"];
          i++;
        }

        // construct the data that will be bound to our scatter plot point
        const datum = {
          chemical: d["Chemical Name"],
          logRF: value,
          featureId: d["Feature ID"],
          sampleName: sampleName,
          mode: d["Ionization Mode"],
          retentionTime: d["Retention Time"].toFixed(2),
          color: colors[i % 7],
        };

        pointsData.push(datum);
      }
    });
  });

  return pointsData;
}

/**
 * Generates a parent grid container for holding the plots. There is one thinner column on the far left that
 * will be used for a tooltip. There will be nPlots more columns of equal width for each plot, which will be dependent
 * on the number of chemicals available for plotting.
 * @param {string} parentDivId The Id for the main div element that will hold the plots.
 * @param {string} parentGridId The Id for the returned object.
 * @return {D3Selection} The d3 selection object for the new parent grid container.
 */
function makeParentGridContainer(parentDivId, parentGridId) {
  const parentGridContainer = d3
    .select(`#${parentDivId}`)
    .append("div")
    .style("width", "fit-content")
    .attr("id", parentGridId)
    .style("display", "grid")
    .style("grid-template-columns", "800px 300px")
    .style("grid-template-rows", "1fr");

  return parentGridContainer;
}

async function stripPlotsMain(inputXlsxPath) {
  // read in data
  let data = await readInterpretOutputXLSX(inputXlsxPath);

  // remove unwanted columns and raw RF values and add log RF values
  data = cleanData(data);

  // set the number of chemicals per plot and calculate the number of plots needed to view all chemicals
  const nChemsPerPlot = data.length;
  const nPlots = 1; //Math.floor(data.length / nChemsPerPlot) + 1;

  // set the svgIDs that will be used as grid-areas for placing in the correct column of the parentGrid
  const svgIDs = [];
  for (let i = 0; i < nPlots; i++) {
    svgIDs.push(`svg${i}`);
  }

  // make the parent grid container for housing the application
  const parentDivId = "strip-plots-container"; // the main div from the html file for hosting the visual
  const parentGridId = "strip-plots-parent-grid-container"; // the grid div to house the visual

  const parentGridContainer = d3
    .select(`#${parentDivId}`)
    .append("div")
    .style("display", "grid")
    .style("grid-template-columns", "40px 782px 300px")
    .style("grid-template-rows", "1fr")
    .attr("id", parentGridId)
    .style("gap", "5px")
    .style("margin", "5px auto");

  // add button to toggle between sorted by retention time and median log RF
  const buttonContainer = parentGridContainer.append("div");

  buttonContainer
    .append("button")
    .attr("id", "sortButton")
    .style("height", "40px")
    .style("width", "60px")
    .style("font-size", "28px")
    .style("padding-left", "0px")
    .style("padding-right", "10px")
    .style("padding-bottom", "40px")
    .style("margin-bottom", "10px")
    .style("margin-left", "5px")
    .style("text-align", "left")
    .style("margin-top", "10px")
    .style("border", "2px solid #999")
    .style("border-radius", "8px")
    .html("&#x1f503")
    .on("mouseover", () => {
      d3.select("#sortButton")
        .transition()
        .duration(200)
        .style("border-color", "black");
    })
    .on("mouseout", () => {
      d3.select("#sortButton")
        .transition()
        .duration(200)
        .style("border-color", "#999");
    })
    .on("click", () => {
      sortedBy = sortedBy === "rt" ? "ml" : "rt";
      makeStripPlot(data, sortedBy, showMode, false);
    });

  // add buttons to toggle between which ionization mode is shown
  const modeButtonData = [
    { text: "+", id: "pos" },
    { text: "-", id: "neg" },
    // { "text": "+/-", "id": "both" }
  ];

  modeButtonData.forEach((d) => {
    buttonContainer
      .append("button")
      .attr("id", d.id)
      .style("height", "40px")
      .style("width", "60px")
      .style("font-size", () => (d.text === "-" ? "36px" : "26px"))
      .style("padding-left", () =>
        d.text === "+/-" ? "3px" : d.text === "+" ? "11px" : "14px"
      )
      .style("padding-right", "10px")
      .style("padding-bottom", () => (d.text === "-" ? "18px" : "1px"))
      .style("padding-top", () => (d.text === "-" ? "0px" : "1px"))
      .style("margin-left", "5px")
      .style("background-color", d.id === "pos" ? "#ddffdd" : "#efefef")
      .style("text-align", "left")
      .style("margin-top", "2px")
      .style("line-height", "34px")
      .style("border", `2px solid #999`)
      .style("border-radius", "8px")
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

        if (d.text === "+/-") {
          showMode = "both";
        } else {
          showMode = d.text;
        }
        makeStripPlot(data, sortedBy, showMode, false);
      });
  });

  const helpTooltipButton = buttonContainer
    .append("div")
    .attr("id", "helpButton")
    .style("height", "35px")
    .style("width", "60px")
    .style("font-size", "28px")
    .style("padding-left", "6px")
    .style("padding-right", "10px")
    .style("padding-bottom", "4px")
    .style("margin-top", "470px")
    .style("margin-left", "5px")
    .style("text-align", "left")
    .style("border", "2px solid #999")
    .style("border-radius", "8px")
    .style("color", "#777")
    .html("�")
    .on("mouseover", () => {
      d3.select("#helpButton")
        .transition()
        .duration(300)
        .style("border-color", "black");
      if (!helpTooltipClicked) {
        d3.select("#helpTooltip")
          .transition()
          .duration(500)
          .style("opacity", 1);
      }
    })
    .on("mouseout", () => {
      d3.select("#helpButton")
        .transition()
        .duration(300)
        .style("border-color", "#999");
      if (!helpTooltipClicked) {
        d3.select("#helpTooltip")
          .transition()
          .duration(500)
          .style("opacity", 0);
      }
    })
    .on("click", () => {
      helpTooltipClicked = !helpTooltipClicked;
      if (helpTooltipClicked) {
        d3.select("#helpTooltip")
          .transition()
          .duration(500)
          .style("opacity", 1);
        d3.select("#helpButton")
          .transition()
          .duration(300)
          .style("background-color", "#ddffdd");
      } else {
        d3.select("#helpTooltip")
          .transition()
          .duration(500)
          .style("opacity", 0);
        d3.select("#helpButton")
          .transition()
          .duration(300)
          .style("background-color", "#fff");
      }
    });

  // make SVG container
  const svgGridContainer = parentGridContainer
    .append("div")
    .style("gap", "5px")
    .style("padding", "8px")
    .style("border", "3px solid black")
    .style("border-radius", "5px")
    .style("max-height", "650px")
    .style("overflow-y", "scroll")
    .style("overflow-x", "hidden")
    .style("background-color", "white");

  // create tooltip container
  const tooltipContainer = parentGridContainer
    .append("div")
    .attr("class", "tooltip")
    .style("border", "1px solid black")
    .style("border-radius", "5px")
    .style("background-color", "black")
    .style("box-shadow", "0 0 5px rgba(0,0,0,0.3)")
    .style("display", "block")
    .style("line-height", "25px")
    .style("width", "350px")
    .style("height", "200px")
    .style("align-self", "start");

  const tooltip = tooltipContainer
    .attr("id", "tooltip")
    .append("div")
    .style("padding", "4px")
    .style("margin", "0px 0px 0px 4px")
    .style("border", "1px solid black")
    .style("border-radius", "2px 0px 0px 2px")
    .style("background-color", "white")
    .style("height", "190px")
    .style("font-size", "17px");

  // add instructions
  parentGridContainer.append("div");
  const instructions = tooltipContainer
    .append("div")
    .attr("id", "helpTooltip")
    .style("padding-left", "10px")
    .style("padding-top", "5px")
    .style("border", "1px solid black")
    .style("border-radius", "3px")
    .style("font-size", "18px")
    .style("line-height", "24px")
    .style("margin-top", "38px")
    .style("width", "500px")
    .style("opacity", 0)
    .html(
      'By default, the strip plot shows ESI+ data sorted by the mean log Response Factor (RF)<br><br>RF = abundance/concentration<br><br><b>Features</b><br><ul><li>Hovering over a point will enlarge it and populate a tooltip in the top right with data about that point</li><li>Clicking the 🔃 button will toggle between sorting by retention time and by median log RF</li><li>Clicking the "+" button will populate the plot with ESI+ data</li><li>Clicking the "-" button will populate the plot with ESI- data</li><li>Ctrl+Scroll to zoom</li><li>Click+Drag to pan</li><li>Ctrl+Space will reset the figure after zooming and or panning</li> </ul>'
    );

  // make plots
  let showMode = "+";
  var sortedBy = "meanRF";
  var helpTooltipClicked = false;
  makeStripPlot(data, sortedBy, showMode, true);

  function makeStripPlot(
    data,
    sortedBy,
    showMode = "both",
    firstPass = false,
    zoom
  ) {
    // destroy existing svg
    svgGridContainer.selectAll("svg").remove();

    // sort the data by retention time (lowest to highest)
    if (sortedBy === "rt") {
      data.sort((a, b) => a["Retention Time"] - b["Retention Time"]);
    } else {
      data.sort((a, b) => a["Median Log RF"] - b["Median Log RF"]);
    }

    // now we need to get a data structure such that each point on the plot has an object that represents it
    const pointsData = getPointsData(data, 10, showMode);

    let nChems = nChemsPerPlot;
    if (showMode !== "both") {
      nChems = data.filter((d) =>
        d["Chemical Name"].includes(`(ESI${showMode})`)
      ).length;
    }
    // now construct the SVG
    svgIDs.forEach((svgID, iPlot) => {
      const margin = { top: 50, right: 20, bottom: 0, left: 250 };
      const svgWidth = 750;
      const svgHeight = nChems * 35;
      let svg;
      svg = svgGridContainer
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("id", svgID)
        .style("overflow", "hidden")
        .style("box-shadow", "0 0 6px rgba(0,0,0,0.2)");
      // svg = d3.select(`#${svgID}`)
      //   .attr("height", svgHeight);

      // handle zoom functionality
      var zoom = d3
        .zoom()
        .scaleExtent([0.5, 3])
        .filter(function (event) {
          // Disable zoom on scroll unless ctrl is pressed
          return event.ctrlKey || (!event.button && event.type !== "wheel");
        })
        .wheelDelta(function (event) {
          // Adjust zoom speed
          return -event.deltaY * (event.ctrlKey ? 0.003 : 0.05);
        });

      // Reset zoom on Ctrl+Space
      d3.select("body").on("keydown", (event) => {
        if (event.ctrlKey && event.code === "Space") {
          event.preventDefault();
          d3.select(`#svg0`)
            .transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
        }
      });

      svg.call(zoom);

      const g = svg.append("g");

      function zoomed(event) {
        g.attr("transform", event.transform);
      }

      zoom.on("zoom", zoomed);

      svg.on("dblclick.zoom", null);

      // get unique chemical names and define x and y scales
      const chemicalNames = [
        ...new Set(pointsData.map((d) => d.chemical)),
      ].slice(iPlot * nChemsPerPlot, (iPlot + 1) * nChemsPerPlot);

      // y-scale, each chemical gets its own row
      const esiRegex = /\(ESI/;
      const yScale = d3
        .scaleBand()
        .domain(chemicalNames) //.map(d => d.replace(/\(ESI/, "(")))
        .range([margin.top, svgHeight - margin.top - margin.bottom])
        .padding(0.5);

      // x-scale, for log RF values
      const [xMin, xMax] = d3.extent(pointsData, (d) => d.logRF);
      const xTickMax = Math.floor(xMax) + 1;
      const xTicks = [];
      for (let i = 0; i <= xTickMax + 1; i++) {
        xTicks.push(i);
      }
      const xScale = d3
        .scaleLinear()
        .domain([-0.5, xTickMax])
        .range([margin.left, svgWidth - margin.right]);

      // draw axes
      const xAxisTop = g
        .append("g")
        .attr("transform", `translate(0, ${margin.top})`)
        .call(
          d3
            .axisTop(xScale)
            .tickValues(xTicks.slice(0, -1))
            .tickSizeOuter(0)
            .tickFormat(d3.format("d"))
        )
        .selectAll("text")
        .style("font-size", "14px");

      const yAxis = g
        .append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickSizeOuter(0))
        .selectAll("text")
        .style("font-size", "14px");

      // add bottom and right axes
      const xAxisBottom = g
        .append("g")
        .attr(
          "transform",
          `translate(0, ${svgHeight - margin.bottom - margin.top})`
        )
        .call(d3.axisBottom(xScale).tickSize(0).tickFormat(""));

      const yAxisRight = g
        .append("g")
        .attr("transform", `translate(${svgWidth - margin.right}, 0)`)
        .call(d3.axisRight(yScale).tickSize(0).tickFormat(""));

      // add grid lines
      const gridGroup = g.append("g").attr("class", "grid-lines");

      gridGroup
        .selectAll(".y-grid")
        .data(yScale.domain())
        .enter()
        .append("line")
        .attr("class", "y-grid")
        .attr("x1", margin.left)
        .attr("x2", svgWidth - margin.right)
        .attr("y1", (d) => yScale(d) + yScale.bandwidth() / 2)
        .attr("y2", (d) => yScale(d) + yScale.bandwidth() / 2)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1);

      gridGroup
        .selectAll(".x-grid")
        .data(xTicks.slice(0, xTicks.length - 2))
        .enter()
        .append("line")
        .attr("class", "x-grid")
        .attr("x1", (d) => xScale(d))
        .attr("x2", (d) => xScale(d))
        .attr("y1", margin.top)
        .attr("y2", svgHeight - margin.top - margin.bottom)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 1);

      // add x-axis title
      g.append("text")
        .attr("x", (svgWidth + margin.left) / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Log RF");

      // add points
      const subsetData = pointsData.filter((d) =>
        chemicalNames.includes(d.chemical)
      );
      const yBW = yScale.bandwidth();
      g.selectAll("circle")
        .data(subsetData)
        .enter()
        .append("circle")
        .attr("class", "stripCircle")
        .attr("cx", (d) => xScale(d.logRF))
        .attr("cy", (d) => yScale(d.chemical) + yBW / 2) // + randomNumRange(-yBW/2, yBW/2)) // .replace(/\(ESI/, "(") //center in band then add random
        .attr("r", 6)
        .style("fill", (d) => d.color)
        .style("stroke-width", 1)
        .style("stroke", "black")
        .style("opacity", 0.6)
        .on("mouseover", function (event, d) {
          d3.selectAll("circle.stripCircle")
            .transition()
            .duration(300)
            .attr("r", 6);
          d3.select(this).transition().duration(300).attr("r", 12);
          const c = d.color;
          tooltip.html(
            `<b>Chemical:</b> ${
              d.chemical.split(" (")[0]
            }<br><b>Ionization Mode:</b> ${d.mode}<br><b>Feature ID:</b> ${
              d.featureId
            }<br><b>Sample Name:</b> ${
              d.sampleName
            }<br><b>Retention Time:</b> ${
              d.retentionTime
            }min<br><b>Log RF:</b> ${d.logRF.toFixed(2)}`
          );
          tooltipContainer
            .transition()
            .duration(300)
            .style("opacity", 1)
            .style("background-color", c);
        });
    });
    return zoom;
  }
}

const inputXlsxPath = "./data/Example_NTA_NTA_WebApp_qNTA.xlsx";
stripPlotsMain(inputXlsxPath);
