/**
 * A d3 selection of an HTML element.
 * @typedef {d3.Selection<HTMLElement, unknown, null, undefined>} D3Selection
 */

/**
 * Returns the sequence data from the CSV for Interpret NTA.
 * @param {string} filePath Path to the INTERPRET NTA run sequence input CSV.
 * @returns {Object[]} An array of objects, each object corresponding to one row of the csv file.
 */

async function readCSV(filePath) {
  // Fetch the file
  const response = await fetch(filePath);
  const text = await response.text();

  // Use PapaParse to parse the CSV
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true, // Automatically extract headers
      dynamicTyping: true, // Convert numeric fields to numbers automatically
      complete: (results) => resolve(results.data),
      error: (error) => reject(error),
    });
  });
}

/**
 * Cleans the raw CSV data for keeping only the desired fields.
 * @param {Object[]} csvDataRaw The raw data pulled directly from the CSV.
 * @returns {Object[]} The cleaned CSV data containing only the desired fields.
 */
function cleanRawCsvData(csvDataRaw, hasMS2Score) {
  const csvDataClean = [];
  for (let row of csvDataRaw) {
    const cleanRow = {};
    cleanRow["Feature ID"] = Number(row["Feature ID"]);
    cleanRow["Ionization Mode"] = row["Ionization Mode"];
    cleanRow["DTXCID"] = row["DTXCID"];
    cleanRow["MS2 Score"] = hasMS2Score ? Number(row["MS2 quotient score"]) : null; // Handle absence
    cleanRow["Hazard Score"] = Number(row["Hazard Score"]);
    cleanRow["Median Abundance"] = Number(row["Median blanksub mean feature abundance"]);
    cleanRow["Metadata Score"] = Number(row["Structure_total_norm"]);
    cleanRow["Occurrence Count"] = Number(row["Final Occurrence Count"]);

    // Preserve columns starting with "INTA-Mean"
    for (const key in row) {
      if (key.startsWith("INTA-Mean")) {
        cleanRow[key] = Number(row[key]);
      }
    }

    csvDataClean.push(cleanRow);
  }

  return csvDataClean;
}

function sortByFeatureID(csvData) {
  csvData.sort((a, b) => a["Feature ID"] - b["Feature ID"]);
  return csvData;
}


function getNestedCSVDataBasedOnOcc(csvData, nPoints = 1200) {
  const csvDataNested = [];
  let currentArr = [];
  let pointsInCurrentArr = 0;
  let currentFeatureID = csvData[0]["Feature ID"];

  for (let row of csvData) {
    const thisFeatureID = row["Feature ID"];

    // If the feature ID changes, check if adding the current feature's points exceeds nPoints
    if (currentFeatureID !== thisFeatureID) {

      if (pointsInCurrentArr > nPoints) {
        const currentFeaturePoints = currentArr.filter(d => d["Feature ID"] === currentFeatureID);
        const previousPoints = currentArr.filter(d => d["Feature ID"] !== currentFeatureID)
        csvDataNested.push(previousPoints)
        // If the current feature itself exceeds nPoints, split it
        if (currentFeaturePoints.length > nPoints) {
          csvDataNested.push(currentFeaturePoints);

          currentArr = [];
          pointsInCurrentArr = 0;
        } else {
          // Push the current array to the nested array and reset
          currentArr = currentFeaturePoints;
          pointsInCurrentArr = currentArr.length;
        }
      }
      currentFeatureID = thisFeatureID;
    }

    currentArr.push(row);
    pointsInCurrentArr++;
  }

  // Push the last array if it has any points
  if (currentArr.length > 0) {
    csvDataNested.push(currentArr);
  }

  return csvDataNested;
}

// Function to read the feature IDs from a CSV file
async function readFeatureIDsFromCSV(file) {
  const text = await file.text();
  
  // Split the text into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Split the first line to get the headers
  const headers = lines[0].split(',').map(header => header.trim());

  // Find the index of the "Feature ID" column
  const featureIDIndex = headers.indexOf("Feature ID");

  if (featureIDIndex === -1) {
    throw new Error("Feature ID column not found");
  }

  // Extract the feature IDs from the subsequent lines
  const featureIDs = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim());
    return Number(values[featureIDIndex]);
  }).filter(id => !isNaN(id));

  return featureIDs;
}


async function metadataScatterMain(csvPath) {
  // read in all CSV data
  let csvDataRaw = await readCSV(csvPath);

  // Check if "MS2 quotient score" is present in the raw data
  const hasMS2Score = csvDataRaw.some(row => row.hasOwnProperty("MS2 quotient score"));

  // clean raw CSV data, only keeping desired fields
  let csvDataClean = cleanRawCsvData(csvDataRaw, hasMS2Score);
  csvDataRaw = null; // garbage collection

  // sort data on feature id
  const csvDataSorted = sortByFeatureID(csvDataClean);

  // Use the entire cleaned and sorted dataset for visualization
  let csvData = csvDataSorted;

  let xAxisField = "Metadata Score";
  let yAxisField = hasMS2Score ? "MS2 Score" : "Metadata Score"; // Fallback if MS2 Score isn't available
  let colorField = "Hazard Score";
  let sizeField = "Median Abundance";

  // Add axis selectors
  const fields = ["MS2 Score", "Metadata Score", "Hazard Score", "Median Abundance", "Occurrence Count"];

  const filterContainer = d3.select("#metadataScatterContainer")
      .append("div")
      .attr("id", "filterContainer");

  // Create a container for the buttons
  const buttonContainer = filterContainer.append("div")
    .attr("id", "buttonContainer")
    .style("display", "flex")
    .style("flex-direction", "column"); // Stack buttons vertically

  // Create a container for other elements
  const otherElementsContainer = filterContainer.append("div")
    .attr("id", "otherElementsContainer")
    .style("display", "flex")
    .style("flex-direction", "row"); // Arrange other elements side by side
  
    // Function to add a new filter
  function addFilter() {
    const filter = otherElementsContainer.append("div").attr("class", "filter");

    // First row: "Filter by:" and dropdown
    const filterFieldRow = filter.append("div").attr("class", "filter-row");

    filterFieldRow.append("label")
      .attr("for", "filterFieldDropdown")
      .text("Filter by:");

    const filterFieldDropdown = filterFieldRow.append("select")
      .attr("class", "filterFieldDropdown")
      .style("padding", "5px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px");

    filterFieldDropdown.selectAll("option")
      .data(fields)
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => d);

    // Second row: "Minimum value" and input field
    const minValueRow = filter.append("div").attr("class", "filter-row");

    minValueRow.append("label")
      .attr("for", "minValueInput")
      .text("Minimum value:");

    minValueRow.append("input")
      .attr("type", "number")
      .attr("class", "minValueInput")
      .style("padding", "5px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "5px");

    // Third row: Remove filter button
    const removeButtonRow = filter.append("div").attr("class", "filter-row");

    removeButtonRow.append("button")
      .text("Remove Filter")
      .attr("class", "filter-button")
      .on("click", () => {
        filter.remove();
      });
  }  

  // Button to add more filters
  buttonContainer.append("button")
    .text("Add Filter")
    .attr("class", "filter-button")
    .on("click", addFilter);

  // Add button to apply all filters
  buttonContainer.append("button")
    .text("Apply Filters")
    .attr("class", "filter-button")
    .on("click", () => {
      // let filteredData = csvData;

      // Apply each filter
      otherElementsContainer.selectAll(".filter").each(function() {
        const filterField = d3.select(this).select(".filterFieldDropdown").property("value");
        const minValue = parseFloat(d3.select(this).select(".minValueInput").property("value"));

        if (!isNaN(minValue)) {
          filteredData = filteredData.filter(d => d[filterField] >= minValue);
        }
      });

      updateScatterplot(filteredData);
    });

  // Add initial filter
  addFilter();

  // Create tooltip container
  const tooltip = d3.select("div#metadataScatterContainer")
    .append("div")
    .attr("id", "scatterTooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.1)")
    .style("font-size", "15px");

  // Extract "INTA-Mean" columns from headers
  const intaMeanColumns = csvDataClean.reduce((columns, row) => {
    for (const key in row) {
      if (key.startsWith("INTA-Mean") && !columns.includes(key)) {
        columns.push(key);
      }
    }
    return columns;
  }, []).map(column => column.replace("INTA-Mean ", "").trim());

  // Add "Use Sample Filtering" checkbox
  const sampleFilterContainer = d3.select("#metadataScatterContainer")
    .append("div")
    .attr("id", "sampleFilterContainer")
    .style("margin-top", "10px");

  sampleFilterContainer.append("input")
    .attr("type", "checkbox")
    .attr("id", "useSampleFilterCheckbox")
    .style("margin-right", "5px")
    .on("change", function() {
      const checked = d3.select(this).property("checked");
      d3.select("#sampleFilterOptions").style("display", checked ? "flex" : "none");
    });

  sampleFilterContainer.append("label")
    .attr("for", "useSampleFilterCheckbox")
    .text("Use Sample Filtering");

  // Container for sample filter options
  const sampleFilterOptions = sampleFilterContainer.append("div")
    .attr("id", "sampleFilterOptions")
    .style("display", "none")
    .style("margin-top", "10px")
    .style("flex-wrap", "wrap");

  // Group checkboxes into columns
  const columns = Math.ceil(intaMeanColumns.length / 3);
  for (let i = 0; i < columns; i++) {
    const columnContainer = sampleFilterOptions.append("div")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("margin-right", "20px");

    intaMeanColumns.slice(i * 3, i * 3 + 3).forEach(column => {
      const checkboxContainer = columnContainer.append("div")
        .style("margin-bottom", "5px");

      checkboxContainer.append("input")
        .attr("type", "checkbox")
        .attr("class", "sampleFilterCheckbox")
        .attr("value", column)
        .style("margin-right", "5px")
        .on("change", function() {
          // Update scatterplot when any checkbox changes
          updateScatterplot(csvData);
        });

      checkboxContainer.append("label")
        .text(column);
    });
  }

  // Function to filter data based on sample filtering
  function applySampleFiltering(data) {
    const checkedColumns = sampleFilterOptions.selectAll(".sampleFilterCheckbox")
      .filter(function() { return d3.select(this).property("checked"); })
      .nodes()
      .map(node => "INTA-Mean " + node.value);

    if (checkedColumns.length > 0) {
      return data.filter(row => checkedColumns.every(column => {
        const value = Number(row[column]);
        return !isNaN(value) && value > 0;
      }));
    }
    return data;
  }

  let filteredData; // Declare filteredData globally

  function filterScatterplotByFeatureIDs(featureIDs) {

    // Log the state of the original data before filtering
    console.log(`Before filtering, original data has ${originalCsvData.length} data points.`);

    // const filteredData = originalCsvData.filter(d => featureIDs.includes(d["Feature ID"]));
    // Filter the data and update the global variable
    filteredData = originalCsvData.filter(d => featureIDs.includes(d["Feature ID"]));
    
    // Log the state of the data after filtering
    console.log(`After filtering by feature IDs, data has ${filteredData.length} data points.`);

    updateScatterplot(filteredData);
  }


  function updateScatterplot(csvData, resetStrokes = false) {

    // Debugging message to log the size of the filteredData
    console.log(`updateScatterplot called with ${csvData.length} data points.`);

    const filteredData = d3.select("#useSampleFilterCheckbox").property("checked")
      ? applySampleFiltering(csvData)
      : csvData;

    // // Update scales based on the current data
    // xScale.domain(d3.extent(csvData, d => d[xAxisField]));
    // yScale.domain(d3.extent(csvData, d => d[yAxisField]));
    // colorScale.domain([0, d3.max(csvData, d => d[colorField])]);
    // sizeScale.domain([0, d3.max(csvData, d => d[sizeField])]);
    // Update scales based on the current data for the main scatterplot
    mainXScale.domain(d3.extent(filteredData, d => d[xAxisField]));
    mainYScale.domain(d3.extent(filteredData, d => d[yAxisField]));
    mainColorScale.domain([0, d3.max(filteredData, d => d[colorField])]);
    mainSizeScale.domain([0, d3.max(filteredData, d => d[sizeField])]);
    
    // Update gradient legend values
    gradientMinLabel.text(Math.floor(d3.min(csvData, d => d[colorField])).toLocaleString());
    gradientMaxLabel.text(Math.ceil(d3.max(csvData, d => d[colorField])).toLocaleString());

    // Update size legend circles
    sizeMinLabel.text(Math.floor(d3.min(csvData, d => d[sizeField])).toLocaleString());
    sizeMaxLabel.text(Math.ceil(d3.max(csvData, d => d[sizeField])).toLocaleString());

    sizeLegendCircles.selectAll("circle")
      .data([d3.max(csvData, d => d[sizeField]), 
             (d3.min(csvData, d => d[sizeField]) + d3.max(csvData, d => d[sizeField])) / 2, 
             d3.min(csvData, d => d[sizeField])])
      .attr("r", d => mainSizeScale(d));

    // Update axes
    svg.select(".x-axis")
      .call(d3.axisBottom(mainXScale)
        .ticks(10)
        .tickSize(15) // Adjust this value to increase the tick mark length
      )
      .style("font-size", "14px") // Adjust the font size here
      .selectAll("text")
      .attr("dy", "1em"); // Adjust this value to move the labels further down

    svg.select(".y-axis")
      .call(d3.axisLeft(mainYScale)
        .ticks(10)
        .tickSize(15) // Adjust this value to increase the tick mark length
      )
      .style("font-size", "14px") // Adjust the font size here
      .selectAll("text")
      .attr("dx", "-0.1em"); // Adjust this value to move the labels further left

    // Update points
    svg.selectAll("circle")
      .data(filteredData)
      .join(
        enter => enter.append("circle")
          .attr("cx", d => mainXScale(d[xAxisField]))
          .attr("cy", d => mainYScale(d[yAxisField]))
          .attr("r", d => mainSizeScale(d[sizeField]))
          .attr("fill", d => mainColorScale(d[colorField]))
          .attr("stroke", "black")
          .attr("opacity", 0.7)
          .on("click", function (event, d) {
            // Update the additional scatterplot with the clicked feature ID
            updateAdditionalScatterplot(d["Feature ID"]);
          })
          .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
              .html(`
                <strong>Feature ID:</strong> ${d["Feature ID"]}<br>
                <strong>Ionization Mode:</strong> ${d["Ionization Mode"]}<br>
                <strong>DTXCID:</strong> ${d["DTXCID"]}<br>
                ${hasMS2Score ? `<strong>MS2 Score:</strong> ${d["MS2 Score"]}<br>` : ""}
                <strong>Hazard Score:</strong> ${d["Hazard Score"].toFixed(2)}<br>
                <strong>Median Abundance:</strong> ${Number(d["Median Abundance"].toFixed(0)).toLocaleString()}<br>
                <strong>Metadata Score:</strong> ${d["Metadata Score"].toFixed(2)}<br>
                <strong>Occurrence Count:</strong> ${d["Occurrence Count"]}
              `);
            // Highlight all circles with the same feature ID
            d3.selectAll("circle")
              .style("stroke", "black")
              .style("stroke-width", "1px");
            d3.selectAll("circle")
              .filter(circleData => circleData["Feature ID"] === d["Feature ID"])
              .raise()
              .style("stroke", "rgb(0, 0, 255)")
              .style("stroke-width", "2px");
          })
          .on("mousemove", function (event) {
            tooltip.style("top", `${event.pageY - 50}px`)
              .style("left", `${event.pageX + 20}px`);
          })
          .on("mouseout", function () {
            tooltip.style("visibility", "hidden");

            // Reset stroke styles
            d3.selectAll("circle")
              .style("stroke", "black")
              .style("stroke-width", "1px");
          }),
        update => update
          // .transition().duration(1000)
          .attr("cx", d => mainXScale(d[xAxisField]))
          .attr("cy", d => mainYScale(d[yAxisField]))
          .attr("r", d => mainSizeScale(d[sizeField]))
          .attr("fill", d => mainColorScale(d[colorField]))
          .style("stroke", resetStrokes ? "black" : null)
          .style("stroke-width", resetStrokes ? "1px" : null),
        exit => exit.remove()
      );
  }

  // Store the original data for reset purposes
  originalCsvData = [...csvData];

  // Set up SVG dimensions
  const width = 600;
  const height = 600;
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };

  // Create a container for the original elements
  const originalContainer = d3.select("#metadataScatterContainer")
    .append("div")
    .attr("id", "originalContainer")
    .style("display", "block"); // Ensure all elements are stacked vertically

  const svg = originalContainer
    .append("svg")
    .attr("id", "metadataScatterSVG")
    .attr("width", width)
    .attr("height", height);

  // Add initial message to indicate that data points are not yet visualized
  const initialMessage = svg.append("text")
    .attr("id", "initialMessage")
    .attr("x", width / 4) // Position the text to the right of the y-axis
    .attr("y", height / 2) // Center vertically
    .attr("text-anchor", "start") // Align text start
    .attr("font-size", "18px") // Font size
    .attr("fill", "black") // Text color
    .text("To visualize data, upload Feature IDs CSV");

  // Use getBBox to calculate the bounding box of the text
  const bbox = initialMessage.node().getBBox();

  // Add a rectangle behind the text to create a box outline
  const messageBox = svg.append("rect")
    .attr("x", bbox.x - 5) // Slightly offset to ensure padding
    .attr("y", bbox.y - 5) // Slightly offset to ensure padding
    .attr("width", bbox.width + 10) // Add padding to the width
    .attr("height", bbox.height + 10) // Add padding to the height
    .attr("fill", "rgb(128, 252, 128)") // Set box fill color
    .attr("stroke", "black") // Box outline color
    .attr("stroke-width", 2); // Box outline width

  // Ensure the box is behind the text by reordering
  initialMessage.raise();

  // Create a separate container for the additional scatterplot
  const additionalContainer = d3.select("#metadataScatterContainer")
    .append("div")
    .attr("id", "additionalContainer")
    .style("display", "block")
    .style("margin-left", "20px"); // Add margin to separate from the original content

  const svgAdditional = additionalContainer
    .append("svg")
    .attr("id", "additionalScatterSVG")
    .attr("width", width)
    .attr("height", height);



  // Function to update the additional scatterplot
  function updateAdditionalScatterplot(featureID) {
    // Filter data for the selected feature ID
    const filteredData = csvData.filter(d => d["Feature ID"] === featureID);

    // Update scales based on filtered data
    // xScale.domain(d3.extent(filteredData, d => d[xAxisField]));
    // yScale.domain(d3.extent(filteredData, d => d[yAxisField]));
    individualXScale.domain(d3.extent(filteredData, d => d[xAxisField]));
    individualYScale.domain(d3.extent(filteredData, d => d[yAxisField]));

    // // Update size scale for the individual scatterplot
    // sizeScale.domain([0, d3.max(filteredData, d => d[sizeField])]);

    // Update axes for the additional scatterplot
    // svgAdditional.select(".x-axis")
    //   .call(d3.axisBottom(xScale).ticks(10));

    // svgAdditional.select(".y-axis")
    //   .call(d3.axisLeft(yScale).ticks(10));
    svgAdditional.select(".x-axis")
      .call(d3.axisBottom(individualXScale).ticks(10));

    svgAdditional.select(".y-axis")
      .call(d3.axisLeft(individualYScale).ticks(10));

    // Update points in the additional scatterplot
    svgAdditional.selectAll("circle")
      .data(filteredData)
      .join(
        enter => enter.append("circle")
          .attr("cx", d => individualXScale(d[xAxisField]))
          .attr("cy", d => individualYScale(d[yAxisField]))
          .attr("r", d => mainSizeScale(d[sizeField]))
          .attr("fill", d => mainColorScale(d[colorField]))
          .attr("stroke", "black")
          .attr("opacity", 0.7)
          .on("click", function (event, d) {
            // Construct the URL using the DTXCID of the clicked marker
            const url = `https://comptox.epa.gov/dashboard/chemical/details/${d["DTXCID"]}`;
            // Open the URL in a new tab
            window.open(url, '_blank');
          })
          .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
              .html(`
                <strong>Feature ID:</strong> ${d["Feature ID"]}<br>
                <strong>Ionization Mode:</strong> ${d["Ionization Mode"]}<br>
                <strong>DTXCID:</strong> ${d["DTXCID"]}<br>
                ${hasMS2Score ? `<strong>MS2 Score:</strong> ${d["MS2 Score"]}<br>` : ""}
                <strong>Hazard Score:</strong> ${d["Hazard Score"].toFixed(2)}<br>
                <strong>Median Abundance:</strong> ${Number(d["Median Abundance"].toFixed(0)).toLocaleString()}<br>
                <strong>Metadata Score:</strong> ${d["Metadata Score"].toFixed(2)}<br>
                <strong>Occurrence Count:</strong> ${d["Occurrence Count"]}
              `);
            // // Highlight all circles with the same feature ID
            // d3.selectAll("circle")
            //   .style("stroke", "black")
            //   .style("stroke-width", "1px");
            // d3.selectAll("circle")
            //   .filter(circleData => circleData["Feature ID"] === d["Feature ID"])
            //   .raise()
            //   .style("stroke", "rgb(0, 0, 255)")
            //   .style("stroke-width", "2px");
          })
          .on("mousemove", function (event) {
            tooltip.style("top", `${event.pageY - 50}px`)
              .style("left", `${event.pageX + 20}px`);
          })
          .on("mouseout", function () {
            tooltip.style("visibility", "hidden");

            // Reset stroke styles
            d3.selectAll("circle")
              .style("stroke", "black")
              .style("stroke-width", "1px");
          }),
        update => update
          .attr("cx", d => individualXScale(d[xAxisField]))
          .attr("cy", d => individualYScale(d[yAxisField]))
          .attr("r", d => mainSizeScale(d[sizeField]))
          .attr("fill", d => mainColorScale(d[colorField])),
        exit => exit.remove()
      );
  }

  // Add axes to the additional scatterplot
  svgAdditional.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`);

  svgAdditional.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`);


  // Zoom behavior for the additional scatterplot
  const zoom = d3.zoom()
    .scaleExtent([1, 10]) // Define the zoom scale limits
    .translateExtent([[0, 0], [width, height]]) // Define the translation limits
    .extent([[0, 0], [width, height]]) // Define the extent of the zoom area
    .on("zoom", zoomed);

  // Apply the zoom behavior to the additional scatterplot SVG
  svgAdditional.call(zoom);

  // Function to handle zoom events
  function zoomed(event) {
    const transform = event.transform;
    
    // Update scales based on the zoom transform
    const newXScale = transform.rescaleX(individualXScale);
    const newYScale = transform.rescaleY(individualYScale);

    // Update axes with new scales
    svgAdditional.select(".x-axis")
      .call(d3.axisBottom(newXScale).ticks(10));

    svgAdditional.select(".y-axis")
      .call(d3.axisLeft(newYScale).ticks(10));

    // Update points with new scales
    svgAdditional.selectAll("circle")
      .attr("cx", d => newXScale(d[xAxisField]))
      .attr("cy", d => newYScale(d[yAxisField]));
  }


  // // Set up scales with fixed ranges
  // const xScale = d3.scaleLinear().range([margin.left, width - margin.right]);
  // const yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
  // const colorScale = d3.scaleLinear().range(["white", "red"]);
  // const sizeScale = d3.scaleSqrt().range([5, 22]);

  // Set up scales with fixed ranges for the main scatterplot
  const mainXScale = d3.scaleLinear().range([margin.left, width - margin.right]);
  const mainYScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
  const mainColorScale = d3.scaleLinear().range(["white", "red"]);
  const mainSizeScale = d3.scaleSqrt().range([5, 22]);

  // Set up scales with fixed ranges for the individual scatterplot
  const individualXScale = d3.scaleLinear().range([margin.left, width - margin.right]);
  const individualYScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
  // const sizeScale = d3.scaleSqrt().range([5, 22]);
  // const colorScale = d3.scaleLinear().range(["white", "red"]);

  // Add axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(individualXScale).ticks(10));

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(individualYScale).ticks(10));

  // first for X axis
  const ulX = d3.select("div#metadataScatterContainer")
    .append("ul")
    .attr("id", "xAxisSelector")
    .style("list-style", "none")
    .style("padding", "0")
    .style("margin", "0")
    .style("display", "flex")
    .style("text-align", "center")
    .style("gap", "10px");
  
    // Axis selectors for X and Y with conditional styling
  ulX.selectAll("li")
  .data(fields)
  .enter()
  .append("li")
  .text(d => d)
  .style("padding", "5px 10px")
  .style("cursor", "pointer")
  .style("background-color", d => (d === xAxisField ? "#d3d3d3" : "#f0f0f0"))
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px")
  .style("height", "fit-content")
  .style("pointer-events", d => (d === "MS2 Score" && !hasMS2Score ? "none" : "auto"))
  .style("opacity", d => (d === "MS2 Score" && !hasMS2Score ? "0.5" : "1"))
  .on("click", function (event, d) {
    xAxisField = d;
    ulX.selectAll("li")
      .style("background-color", d => (d === xAxisField ? "#d3d3d3" : "#f0f0f0"));
    d3.select(this).style("background-color", "#d3d3d3");
    updateScatterplot(filteredData);
  });
  
  // Now for Y axis
  const ulY = d3.select("div#metadataScatterContainer")
    .append("ul")
    .attr("id", "yAxisSelector")
    .style("list-style", "none")
    .style("padding", "0")
    .style("margin", "0")
    .style("display", "flex")
    .style("text-align", "center")
    .style("gap", "10px");

  ulY.selectAll("li")
  .data(fields)
  .enter()
  .append("li")
  .text(d => d)
  .style("padding", "5px 10px")
  .style("cursor", "pointer")
  .style("background-color", d => (d === yAxisField ? "#d3d3d3" : "#f0f0f0"))
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px")
  .style("height", "fit-content")
  .style("pointer-events", d => (d === "MS2 Score" && !hasMS2Score ? "none" : "auto"))
  .style("opacity", d => (d === "MS2 Score" && !hasMS2Score ? "0.5" : "1"))
  .on("click", function (event, d) {
    yAxisField = d;
    ulY.selectAll("li")
      .style("background-color", d => (d === yAxisField ? "#d3d3d3" : "#f0f0f0"));
    d3.select(this).style("background-color", "#d3d3d3");
    updateScatterplot(filteredData);
  });

  // setup container for size and color legends
  const legendContainer = d3.select("div#metadataScatterContainer")
    .append("div")
    .attr("id", "scatterLegendContainer");

  // setup container for color legend
  const colorLegendContainer = legendContainer
    .append("div")
    .attr("id", "scatterColorLegendContainer")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  // Add gradient div for color legend with min and max labels
  const gradientContainer = colorLegendContainer
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("width", "50px")
    .style("align-items", "center");

  const gradientMaxLabel = gradientContainer
    .append("span")
    .style("font-size", "15px")
    .text(d3.max(csvData, d => d[colorField]).toLocaleString());

  gradientContainer.append("div")
    .style("width", "20px")
    .style("height", "260px")
    .style("background", "linear-gradient(to top, white, red)");

  const gradientMinLabel = gradientContainer
    .append("span")
    .style("font-size", "15px")
    .text(d3.min(csvData, d => d[colorField]).toLocaleString());

  // Add color legend selector
  const ulColor = colorLegendContainer
    .append("ul")
    .attr("id", "scatterColorSelector")
    .style("list-style", "none")
    .style("padding", "0")
    .style("margin", "0")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("gap", "5px");

  ulColor.selectAll("li")
    .data(fields)
    .enter()
    .append("li")
    .text(d => d)
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .style("background-color", d => (d === colorField ? "#d3d3d3" : "#f0f0f0"))
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("pointer-events", d => (d === "MS2 Score" && !hasMS2Score ? "none" : "auto"))
    .style("opacity", d => (d === "MS2 Score" && !hasMS2Score ? "0.5" : "1"))
    .on("click", function (event, d) {
      colorField = d;
      ulColor.selectAll("li")
        .style("background-color", d => (d === colorField ? "#d3d3d3" : "#f0f0f0"));
      d3.select(this).style("background-color", "#d3d3d3");
      updateScatterplot(filteredData);
  });

  // Add size legend below color legend
  const sizeLegendContainer = legendContainer
    .append("div")
    .attr("id", "scatterSizeLegendContainer")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  const sizeLegendCircles = sizeLegendContainer
    .append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  const sizeMaxLabel = sizeLegendCircles
    .append("span")
    .style("font-size", "15px")
    .text(Math.ceil(d3.max(csvData, d => d[sizeField])).toLocaleString());

  sizeLegendCircles.selectAll("circle")
    .data([d3.max(csvData, d => d[sizeField]), 
           (d3.min(csvData, d => d[sizeField]) + d3.max(csvData, d => d[sizeField])) / 2, 
           d3.min(csvData, d => d[sizeField])])
    .enter()
    .append("svg")
    .attr("width", "50px")
    .attr("height", "50px")
    .append("circle")
    .attr("cx", 25)
    .attr("cy", 25)
    .attr("r", d => mainSizeScale(d))
    .attr("fill", "gray")
    .attr("stroke", "black")
    .attr("id", (d, i) => `sizeCircle${i}`);

  const sizeMinLabel = sizeLegendCircles
    .append("span")
    .style("font-size", "15px")
    .text(Math.floor(d3.min(csvData, d => d[sizeField])).toLocaleString());

  // Add size legend selector
  const ulSize = sizeLegendContainer
    .append("ul")
    .attr("id", "scatterSizeSelector")
    .style("list-style", "none")
    .style("padding", "0")
    .style("margin", "10px 0")
    .style("display", "flex")
    .style("gap", "10px");

  ulSize.selectAll("li")
    .data(fields)
    .enter()
    .append("li")
    .text(d => d)
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .style("background-color", d => (d === sizeField ? "#d3d3d3" : "#f0f0f0"))
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("pointer-events", d => (d === "MS2 Score" && !hasMS2Score ? "none" : "auto"))
    .style("opacity", d => (d === "MS2 Score" && !hasMS2Score ? "0.5" : "1"))
    .on("click", function (event, d) {
      sizeField = d;
      ulSize.selectAll("li")
        .style("background-color", d => (d === sizeField ? "#d3d3d3" : "#f0f0f0"));
      d3.select(this).style("background-color", "#d3d3d3");
      updateScatterplot(filteredData);
  });

  // // Add scatterplot points
  // svg.selectAll("circle")
  //   .data(csvData)
  //   .enter()
  //   .append("circle")
  //   .attr("cx", d => xScale(d[xAxisField]))
  //   .attr("cy", d => yScale(d[yAxisField]))
  //   .attr("r", d => sizeScale(d[sizeField]))
  //   .attr("fill", d => colorScale(d[colorField]))
  //   .attr("stroke", "black")
  //   .attr("opacity", 0.7)
  //   .on("click", function (event, d) {
  //     // Update the additional scatterplot with the clicked feature ID
  //     updateAdditionalScatterplot(d["Feature ID"]);
  //   })
  //   // Tooltip logic to conditionally display MS2 Score
  //   .on("mouseover", function (event, d) {
  //     tooltip.style("visibility", "visible")
  //       .html(`
  //         <strong>Feature ID:</strong> ${d["Feature ID"]}<br>
  //         <strong>Ionization Mode:</strong> ${d["Ionization Mode"]}<br>
  //         <strong>DTXCID:</strong> ${d["DTXCID"]}<br>
  //         ${hasMS2Score ? `<strong>MS2 Score:</strong> ${d["MS2 Score"]}<br>` : ""}
  //         <strong>Hazard Score:</strong> ${d["Hazard Score"].toFixed(2)}<br>
  //         <strong>Median Abundance:</strong> ${Number(d["Median Abundance"].toFixed(0)).toLocaleString()}<br>
  //         <strong>Metadata Score:</strong> ${d["Metadata Score"].toFixed(2)}<br>
  //         <strong>Occurrence Count:</strong> ${d["Occurrence Count"]}
  //       `);
  //     // Highlight all circles with the same feature ID
  //     d3.selectAll("circle")
  //       .style("stroke", "black")
  //       .style("stroke-width", "1px");
  //     d3.selectAll("circle")
  //       .filter(circleData => circleData["Feature ID"] === d["Feature ID"])
  //       .raise()
  //       .style("stroke", "rgb(0, 0, 255)")
  //       .style("stroke-width", "2px");        
  //   })
  //   .on("mousemove", function (event) {
  //     tooltip.style("top", `${event.pageY - 50}px`)
  //       .style("left", `${event.pageX + 20}px`);
  //   })
  //   .on("mouseout", function () {
  //     tooltip.style("visibility", "hidden");

  //     // Reset stroke styles
  //     d3.selectAll("circle")
  //       .style("stroke", "black")
  //       .style("stroke-width", "1px");      
  //   });

  // Add box selection functionality
  let isDrawing = false;
  let startX, startY;
  const selectionBox = svg.append("rect")
    .attr("id", "selectionBox")
    .attr("fill", "rgba(0, 0, 255, 0.1)")
    .attr("stroke", "blue")
    .attr("stroke-width", 1)
    .style("visibility", "hidden");

  svg.on("mousedown", function (event) {
    const [x, y] = d3.pointer(event);
    isDrawing = true;
    startX = x;
    startY = y;

    selectionBox
      .attr("x", startX)
      .attr("y", startY)
      .attr("width", 0)
      .attr("height", 0)
      .style("visibility", "visible");
  });

  svg.on("mousemove", function (event) {
    if (!isDrawing) return;

    const [x, y] = d3.pointer(event);
    const width = Math.abs(x - startX);
    const height = Math.abs(y - startY);

    selectionBox
      .attr("x", Math.min(x, startX))
      .attr("y", Math.min(y, startY))
      .attr("width", width)
      .attr("height", height);
  });

  svg.on("mouseup", function () {
    if (!isDrawing) return;
    isDrawing = false;

    const boxX = +selectionBox.attr("x");
    const boxY = +selectionBox.attr("y");
    const boxWidth = +selectionBox.attr("width");
    const boxHeight = +selectionBox.attr("height");

    // Filter only the currently displayed features
    const displayedData = d3.selectAll("circle").data();

    const selectedPoints = displayedData.filter(d => {
      const cx = mainXScale(d[xAxisField]);
      const cy = mainYScale(d[yAxisField]);
      return cx >= boxX && cx <= boxX + boxWidth && cy >= boxY && cy <= boxY + boxHeight;
    });
    
    const uniqueFeatureIDs = [...new Set(selectedPoints.map(d => d["Feature ID"]))];

    // Update the box selection tooltip with clickable Feature IDs
    boxSelectionTooltip.html(`<strong>Selected Feature IDs:</strong> ${uniqueFeatureIDs.map(id => `<span class="clickable-feature-id" data-id="${id}">${id}</span>`).join(", ")}`);

    // Add click behavior to feature IDs in the tooltip
    d3.selectAll(".clickable-feature-id")
      .style("cursor", "pointer")
      .style("color", "blue")
      .on("click", function () {
        const selectedFeatureID = +d3.select(this).attr("data-id");

        // Update the additional scatterplot with the clicked feature ID
        updateAdditionalScatterplot(selectedFeatureID);

        // Highlight the selected feature in the scatterplot
        d3.selectAll("circle")
          // .transition().duration(500)
          .style("stroke", "black")
          .style("stroke-width", "1px");
        d3.selectAll("circle")
          .filter(d => d["Feature ID"] === selectedFeatureID)
          .raise()
          // .transition().duration(500)
          .style("stroke", "rgb(0, 0, 255)")
          .style("stroke-width", "2px");
      });

    // Hide the selection box
    selectionBox.style("visibility", "hidden");
  });

  svg.on("mouseleave", function () {
    if (isDrawing) {
      isDrawing = false;
      selectionBox.style("visibility", "hidden");
    }
  });

  let currentPage = 0;

  function updatePagination() {
    // Update the scatterplot with the current page's data
    // csvData = newCSV[currentPage];
    // updateScatterplot(csvData, true); // Reset strokes when paginating

    // // Update dropdown selection
    // dropdown.property("value", currentPage);

    // // Update feature ID dropdown
    // const uniqueFeatureIDs = [...new Set(csvData.map(d => d["Feature ID"]))];
    // featureDropdown.selectAll("option")
    //   .data(uniqueFeatureIDs)
    //   .join(
    //     enter => enter.append("option")
    //       .attr("value", d => d)
    //       .text(d => `${d}`),
    //     update => update
    //       .attr("value", d => d)
    //       .text(d => `${d}`),
    //     exit => exit.remove()
    //   );

    // // Update tooltip for the current page
    // paginationTooltip.html(`<strong>Feature IDs:</strong> ${uniqueFeatureIDs.join(", ")}`);

    // Reset the box selection tooltip
    boxSelectionTooltip.html("<strong>Selected Feature IDs:</strong> None");
  }

  // Create pagination container
  const paginationContainer = d3.select("div#metadataScatterContainer")
    .append("div")
    .attr("id", "paginationContainer")
    .style("grid-area", "scatterTitle")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("margin-top", "10px");

  // Add the input field for selecting a feature
  const featureInputContainer = paginationContainer.append("div")
    .style("margin-left", "20px");

  featureInputContainer.append("label")
    .attr("for", "featureNumberInput")
    .text("Select Feature:")
    .style("margin-right", "5px")
    .style("font-weight", "bold");

  const featureNumberInput = featureInputContainer.append("input")
    .attr("type", "number")
    .attr("id", "featureNumberInput")
    .style("padding", "5px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .on("change", function () {
      const selectedFeatureID = +this.value;
      updateFeatureSelection(selectedFeatureID);
    });

  // Function to update feature selection
  function updateFeatureSelection(selectedFeatureID) {
    d3.selectAll("circle")
      .style("stroke", "black")
      .style("stroke-width", "1px");
    d3.selectAll("circle")
      .filter(d => d["Feature ID"] === selectedFeatureID)
      .raise()
      .style("stroke", "rgb(0, 0, 255)")
      .style("stroke-width", "2px");

    // Update the additional scatterplot with the selected feature ID
    updateAdditionalScatterplot(selectedFeatureID);
  }

  // Add file input and upload button for feature IDs
  const uploadContainer = paginationContainer.append("div")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px");

  uploadContainer.append("input")
    .attr("type", "file")
    .attr("id", "featureIDFileInput")
    .style("display", "none")
    .on("change", async function(event) {
      const file = event.target.files[0];
      if (file) {
        const featureIDs = await readFeatureIDsFromCSV(file);
        filterScatterplotByFeatureIDs(featureIDs);

        // Remove or hide the initial message
        initialMessage.remove(); // Use initialMessage.remove() to remove the text element completely
        messageBox.remove();
      }
    });

  uploadContainer.append("button")
  .text("Upload Feature IDs CSV")
  .attr("class", "upload-button") // Use the new class for styling
  .on("click", function() {
    document.getElementById("featureIDFileInput").click();
    // Add a class to stop the pulsing effect after the button is clicked
    d3.select(this).classed("clicked", true);
  });

  // // Add reset button to revert to the original dataset
  // paginationContainer.append("button")
  //   .text("Reset")
  //   .style("padding", "5px 10px")
  //   .style("cursor", "pointer")
  //   .style("border", "1px solid #ccc")
  //   .style("border-radius", "5px")
  //   .on("click", function() {
  //     // Revert to the original dataset and update the scatterplot
  //     csvData = originalCsvData;
  //     updateScatterplot(csvData, true); // Reset strokes when resetting
  //   });

  // Add tooltip for pagination
  const paginationTooltip = paginationContainer
    .append("div")
    .attr("id", "paginationTooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.1)")
    .style("font-size", "15px");

  // Add tooltip for box selection
  const boxSelectionTooltip = paginationContainer
    .append("div")
    .attr("id", "boxSelectionTooltip")
    .style("position", "relative")
    .style("visibility", "visible")
    .style("background-color", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("box-shadow", "0px 4px 6px rgba(0, 0, 0, 0.1)")
    .html("<strong>Selected Feature IDs:</strong> None");
  
  // Initialize the scatterplot with the first page
  updatePagination();

}

// const csvPath = "./data/WW2DW_data_analysis_file-2025_03_25.csv";
const csvPath = "./data/WW2DW_chemical_results_with_decision_documentation.csv";
// const csvPath = "./data/WW2DW_data_analysis_file-2025_03_25_reduced_no_MS2.csv";
metadataScatterMain(csvPath);
