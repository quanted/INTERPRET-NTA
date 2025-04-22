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
  // fetch the file
  const response = await fetch(filePath);
  const text = await response.text();

  // Parse the CSV manually
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Handle escaped quotes ("" -> ")
        currentField += '"';
        i++; // Skip the next quote
      } else {
        // Toggle the insideQuotes flag
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of a field
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      // End of a row
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      // Add character to the current field
      currentField += char;
    }
  }

  // Add the last field and row if necessary
  if (currentField) currentRow.push(currentField.trim());
  if (currentRow.length > 0) rows.push(currentRow);

  // Extract headers and map rows to objects
  const headers = rows.shift();
  const jsonData = rows.map(row =>
    Object.fromEntries(row.map((val, i) => [headers[i], val]))
  );

  return jsonData;
}

/**
 * Cleans the raw CSV data for keeping only the desired fields.
 * @param {Object[]} csvDataRaw The raw data pulled directly from the CSV.
 * @returns {Object[]} The cleaned CSV data containing only the desired fields.
 */
function cleanRawCsvData(csvDataRaw) {
  const csvDataClean = [];
  for (let row of csvDataRaw) {
    const cleanRow = {};
    cleanRow["Feature ID"] = Number(row["Feature ID"]);
    cleanRow["Ionization Mode"] = row["Ionization Mode"];
    cleanRow["DTXCID"] = row["DTXCID"];
    cleanRow["MS2 Score"] = Number(row["MS2 quotient score"]);
    cleanRow["Hazard Score"] = Number(row["Hazard Score"]);
    cleanRow["Median Abundance"] = Number(row["Median blanksub mean feature abundance"]);
    cleanRow["Metadata Score"] = Number(row["Structure_total_norm"]);
    cleanRow["Occurrence Count"] = Number(row["Final Occurrence Count"]);

    csvDataClean.push(cleanRow);
  }

  return csvDataClean;
}

function sortByOccCountThenFeatID(csvData) {
  csvData.sort((a, b) => {
    // Compare by occ count (primary sort)
    if (a["Occurrence Count"] !== b["Occurrence Count"]) {
      return b["Occurrence Count"] - a["Occurrence Count"];
    }

    // if occ count is the same, compare by feature id (secondary sort)
    if (a["Feature ID"] < b["Feature ID"]) {
      return -1; 
    }
    if (a["Feature ID"] > b["Feature ID"]) {
      return 1;
    }
  });

  return csvData;
}

function getNestedCSVData(csvData, n = 200) {
  const csvDataNested = [];
  let currentArr = [];
  let featureIDsInCurrentArr = 0;
  let currentFeatureID;
  for (let row of csvData) {
    const thisFeatureID = row["Feature ID"];
    
    // Keep track of new feature IDs
    if (currentFeatureID !== thisFeatureID) {
      currentFeatureID = thisFeatureID;
      featureIDsInCurrentArr += 1;
      if (featureIDsInCurrentArr > n) {
        csvDataNested.push(currentArr);
        featureIDsInCurrentArr = 1;
        currentArr = [];
      }
    }

    currentArr.push(row);
  }

  return csvDataNested;
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


async function metadataScatterMain(csvPath) {
  // read in all CSV data
  let csvDataRaw = await readCSV(csvPath);

  // clean raw CSV data, only keeping desired fields
  let csvDataClean = cleanRawCsvData(csvDataRaw);
  csvDataRaw = null; // garbage collection

  // sort data on final occurrence count, secondarily on feature id
  const csvDataSorted = sortByOccCountThenFeatID(csvDataClean);
  // csvDataClean = null;

  // get a nested array that groups together feature IDs in blocks of n=200
  // const csvDataNested = getNestedCSVData(csvDataClean, 80);
  const csvDataNested = getNestedCSVDataBasedOnOcc(csvDataClean, 22000);

  let newCSV = csvDataNested.sort((a, b) => a.length - b.length)
  let csvData = newCSV[0];

  let xAxisField = "Metadata Score";
  let yAxisField = "MS2 Score";
  let colorField = "Hazard Score";
  let sizeField = "Median Abundance";

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

  function updateScatterplot(csvData, resetStrokes = false) {
    // Update scales based on the current data
    xScale.domain(d3.extent(csvData, d => d[xAxisField]));
    yScale.domain(d3.extent(csvData, d => d[yAxisField]));
    colorScale.domain([0, d3.max(csvData, d => d[colorField])]);
    sizeScale.domain([0, d3.max(csvData, d => d[sizeField])]);

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
      .attr("r", d => sizeScale(d));

    // Update axes
    svg.select(".x-axis")
      .call(d3.axisBottom(xScale).ticks(10));

    svg.select(".y-axis")
      .call(d3.axisLeft(yScale).ticks(10));

    // Update points
    svg.selectAll("circle")
      .data(csvData)
      .join(
        enter => enter.append("circle")
          .attr("cx", d => xScale(d[xAxisField]))
          .attr("cy", d => yScale(d[yAxisField]))
          .attr("r", d => sizeScale(d[sizeField]))
          .attr("fill", d => colorScale(d[colorField]))
          .attr("stroke", "black")
          .attr("opacity", 0.7)
          .on("mouseover", function (event, d) {
            tooltip.style("visibility", "visible")
              .html(`
                <strong>Feature ID:</strong> ${d["Feature ID"]}<br>
                <strong>Ionization Mode:</strong> ${d["Ionization Mode"]}<br>
                <strong>DTXCID:</strong> ${d["DTXCID"]}<br>
                <strong>MS2 Score:</strong> ${d["MS2 Score"]}<br>
                <strong>Hazard Score:</strong> ${d["Hazard Score"].toFixed(2)}<br>
                <strong>Median Abundance:</strong> ${Number(d["Median Abundance"].toFixed(0)).toLocaleString()}<br>
                <strong>Metadata Score:</strong> ${d["Metadata Score"].toFixed(2)}<br>
                <strong>Occurrence Count:</strong> ${d["Occurrence Count"]}
              `);
          })
          .on("mousemove", function (event) {
            tooltip.style("top", `${event.pageY - 50}px`)
              .style("left", `${event.pageX + 20}px`);
          })
          .on("mouseout", function () {
            tooltip.style("visibility", "hidden");
          }),
        update => update
          // .transition().duration(1000)
          .attr("cx", d => xScale(d[xAxisField]))
          .attr("cy", d => yScale(d[yAxisField]))
          .attr("r", d => sizeScale(d[sizeField]))
          .attr("fill", d => colorScale(d[colorField]))
          .style("stroke", resetStrokes ? "black" : null)
          .style("stroke-width", resetStrokes ? "1px" : null),
        exit => exit.remove()
      );
  }

  // Set up SVG dimensions
  const width = 600;
  const height = 600;
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };

  const svg = d3.select("div#metadataScatterContainer")
    .append("svg")
    .attr("id", "metadataScatterSVG")
    .attr("width", width)
    .attr("height", height);

  // Set up scales with fixed ranges
  const xScale = d3.scaleLinear().range([margin.left, width - margin.right]);
  const yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
  const colorScale = d3.scaleLinear().range(["white", "red"]);
  const sizeScale = d3.scaleSqrt().range([5, 22]);

  // Add axes
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(10));

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(10));

  // Add axis selectors
  const fields = ["MS2 Score", "Metadata Score", "Hazard Score", "Median Abundance", "Occurrence Count"];

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
    .on("click", function (event, d) {
      xAxisField = d;
      ulX.selectAll("li")
        .style("background-color", d => (d === xAxisField ? "#d3d3d3" : "#f0f0f0"));
      d3.select(this).style("background-color", "#d3d3d3");
      updateScatterplot(csvData);
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
    .on("click", function (event, d) {
      yAxisField = d;
      ulY.selectAll("li")
        .style("background-color", d => (d === yAxisField ? "#d3d3d3" : "#f0f0f0"));
      d3.select(this).style("background-color", "#d3d3d3");
      updateScatterplot(csvData);
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
    .on("click", function (event, d) {
      colorField = d;
      ulColor.selectAll("li")
        .style("background-color", d => (d === colorField ? "#d3d3d3" : "#f0f0f0"));
      d3.select(this).style("background-color", "#d3d3d3");
      updateScatterplot(csvData);
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
    .attr("r", d => sizeScale(d))
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
    .on("click", function (event, d) {
      sizeField = d;
      ulSize.selectAll("li")
        .style("background-color", d => (d === sizeField ? "#d3d3d3" : "#f0f0f0"));
      d3.select(this).style("background-color", "#d3d3d3");
      updateScatterplot(csvData);
    });

  // Add scatterplot points
  svg.selectAll("circle")
    .data(csvData)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[xAxisField]))
    .attr("cy", d => yScale(d[yAxisField]))
    .attr("r", d => sizeScale(d[sizeField]))
    .attr("fill", d => colorScale(d[colorField]))
    .attr("stroke", "black")
    .attr("opacity", 0.7)
    .on("mouseover", function (event, d) {
      tooltip.style("visibility", "visible")
        .html(`
          <strong>Feature ID:</strong> ${d["Feature ID"]}<br>
          <strong>Ionization Mode:</strong> ${d["Ionization Mode"]}<br>
          <strong>DTXCID:</strong> ${d["DTXCID"]}<br>
          <strong>MS2 Score:</strong> ${d["MS2 Score"]}<br>
          <strong>Hazard Score:</strong> ${d["Hazard Score"].toFixed(2)}<br>
          <strong>Median Abundance:</strong> ${Number(d["Median Abundance"].toFixed(0)).toLocaleString()}<br>
          <strong>Metadata Score:</strong> ${d["Metadata Score"].toFixed(2)}<br>
          <strong>Occurrence Count:</strong> ${d["Occurrence Count"]}
        `);
    })
    .on("mousemove", function (event) {
      tooltip.style("top", `${event.pageY - 50}px`)
        .style("left", `${event.pageX + 20}px`);
    })
    .on("mouseout", function () {
      tooltip.style("visibility", "hidden");
    });

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

    const selectedPoints = csvData.filter(d => {
      const cx = xScale(d[xAxisField]);
      const cy = yScale(d[yAxisField]);
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

        // Update the dropdown menu to show the selected feature ID
        featureDropdown.property("value", selectedFeatureID);

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
    csvData = newCSV[currentPage];
    updateScatterplot(csvData, true); // Reset strokes when paginating

    // Update dropdown selection
    dropdown.property("value", currentPage);

    // Update feature ID dropdown
    const uniqueFeatureIDs = [...new Set(csvData.map(d => d["Feature ID"]))];
    featureDropdown.selectAll("option")
      .data(uniqueFeatureIDs)
      .join(
        enter => enter.append("option")
          .attr("value", d => d)
          .text(d => `${d}`),
        update => update
          .attr("value", d => d)
          .text(d => `${d}`),
        exit => exit.remove()
      );

    // Update tooltip for the current page
    paginationTooltip.html(`<strong>Feature IDs:</strong> ${uniqueFeatureIDs.join(", ")}`);

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

  // Add previous button
  paginationContainer.append("button")
    .attr("id", "prevPageButton")
    .text("Previous")
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .on("click", () => {
      if (currentPage > 0) {
        currentPage--;
        updatePagination();
      }
    });

  // Add dropdown for page selection
  const dropdown = paginationContainer.append("select")
    .attr("id", "pageDropdown")
    .style("padding", "5px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .on("change", function () {
      currentPage = +this.value;
      updatePagination();
    });

  dropdown.selectAll("option")
    .data(newCSV)
    .enter()
    .append("option")
    .attr("value", (d, i) => i)
    .text((d, i) => `Page ${i + 1}`);

  // Add next button
  paginationContainer.append("button")
    .attr("id", "nextPageButton")
    .text("Next")
    .style("padding", "5px 10px")
    .style("cursor", "pointer")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .on("click", () => {
      if (currentPage < newCSV.length - 1) {
        currentPage++;
        updatePagination();
      }
    });

  // Add feature ID dropdown
  paginationContainer.append("div")
    .style("margin-left", "20px")
    .html("<b>Highlight Feature:</b> ")
  const featureDropdown = paginationContainer.append("select")
    .attr("id", "featureDropdown")
    .style("padding", "5px")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .on("change", function () {
      const selectedFeatureID = +this.value;
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

  // Add hover functionality to dropdown
  dropdown.on("mouseover", function () {
    const uniqueFeatureIDs = [...new Set(newCSV[currentPage].map(d => d["Feature ID"]))];
    paginationTooltip.style("visibility", "visible")
      .html(`<strong>Feature IDs:</strong> ${uniqueFeatureIDs.join(", ")}`);
  })
  .on("mousemove", function (event) {
    paginationTooltip.style("top", `${event.pageY + 10}px`)
      .style("left", `${event.pageX + 10}px`);
  })
  .on("mouseout", function () {
    paginationTooltip.style("visibility", "hidden");
  });

  // Initialize the scatterplot with the first page
  updatePagination();
}

const csvPath = "./data/WW2DW_data_analysis_file-2025_03_25.csv";
metadataScatterMain(csvPath);
