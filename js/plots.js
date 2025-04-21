// ======= UTILITY FUNCTIONS ====================================================================================================

// Returns the contents of the input CSV. Values in the last column have a "\r" added to the end, so make sure the last column is not needed for the vis
async function parseCSV(filePath) {
  // fetch the file
  const response = await fetch(filePath);
  const csvText = await response.text();
  
  // parse the file
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  var result = [];

  // remove the '\r' from the last column of the csv
  // headers[headers.length - 1] = headers[headers.length - 1].replace(/\r/g, "");

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {obj[headers[j]] = values[j];}
    result.push(obj);
  }

  // Remove rows with no feature ID
  const cleaned_result = result.filter(feature => feature['Feature ID'] != "")
  return cleaned_result;
}

// Returns a boolean indicating whether or not the element is visible within the scrollable ancestor container
function isElementVisibleInScrollContainer(element, scrollContainer) {
  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  return (elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom)
  
}

// Removes rows with no metadata from dataset, and sorts dataset by category
function sortData(data, category = null) {
  let headers = null
  if (data.length > 0){
    headers = Object.keys(data[0])}
    else{return []}

  const headers_norm = [] //contains normalized headers (not including total norm)
  headers.forEach((key) => {if ((key.includes("NORM") || key.includes("norm")) && !key.includes("TOTAL")) {headers_norm.push(key);}});

  let itemToRemove = []
  for (let i = 0; i < data.length; i++) { 
    if (data[i]['STRUCTURE_TOTAL_NORM'] == 0){itemToRemove.push(data[i]);}
    
    for (let j = 0; j < headers_norm.length; j++){
      const currentHeader = headers_norm[j];
      data[i][currentHeader + "_original"] = data[i][currentHeader]
      if (0 < data[i][currentHeader] && data[i][currentHeader] < 0.05) {data[i][currentHeader] = 0.05;}
    }
  }
  let removeSet = new Set(itemToRemove);
  let newArray = data.filter(item => !removeSet.has(item));

  if (category != null) {newArray.sort((a, b) => b[category] - a[category])}
  
  return newArray;
}

// Only keeps the required column names from the input data, and converts numerical columns to Number data type
function cleanData(data, keysToKeep) {
  const keysToNum = [
    "Feature ID",
    "SOURCE_COUNT_COLLAPSED",
    "PATENT_COUNT_COLLAPSED",
    "LITERATURE_COUNT_COLLAPSED",
    "PUBMED_COUNT_COLLAPSED",
    "Structure_AMOS methods count",
    "Structure_AMOS fact sheets count",
    "Structure_AMOS spectra count",
    "Structure_Presence in water lists count",
    "SOURCE_COUNT_COLLAPSED_NORM",
    "PATENT_COUNT_COLLAPSED_NORM",
    "LITERATURE_COUNT_COLLAPSED_NORM",
    "PUBMED_COUNT_COLLAPSED_NORM",
    "Structure_AMOS methods count_norm",
    "Structure_AMOS fact sheets count_norm",
    "Structure_AMOS spectra count_norm",
    "Structure_Presence in water lists count_norm",
    "STRUCTURE_TOTAL_NORM",
    "MS2 quotient score", 
    "Median blanksub mean feature abundance",
    "Final Occurrence Percentage", 
    "Acute Mammalian Toxicity Oral_authority_mapped",
    "Acute Mammalian Toxicity Inhalation_authority_mapped",
    "Acute Mammalian Toxicity Dermal_authority_mapped",
    "Carcinogenicity_authority_mapped",
    "Genotoxicity Mutagenicity_authority_mapped",
    "Endocrine Disruption_authority_mapped",
    "Reproductive_authority_mapped",
    "Developmental_authority_mapped",
    "Neurotoxicity Repeat Exposure_authority_mapped",
    "Neurotoxicity Single Exposure_authority_mapped",
    "Systemic Toxicity Repeat Exposure_authority_mapped",
    "Systemic Toxicity Single Exposure_authority_mapped",
    "Skin Sensitization_authority_mapped",
    "Skin Irritation_authority_mapped",
    "Eye Irritation_authority_mapped",
    "Acute Aquatic Toxicity_authority_mapped",
    "Chronic Aquatic Toxicity_authority_mapped",
    "Persistence_authority_mapped",
    "Bioaccumulation_authority_mapped",
    "Exposure_authority_mapped",
    "Acute Mammalian Toxicity Oral_score_mapped",
    "Acute Mammalian Toxicity Inhalation_score_mapped",
    "Acute Mammalian Toxicity Dermal_score_mapped",
    "Carcinogenicity_score_mapped",
    "Genotoxicity Mutagenicity_score_mapped",
    "Endocrine Disruption_score_mapped",
    "Reproductive_score_mapped",
    "Developmental_score_mapped",
    "Neurotoxicity Repeat Exposure_score_mapped",
    "Neurotoxicity Single Exposure_score_mapped",
    "Systemic Toxicity Repeat Exposure_score_mapped",
    "Systemic Toxicity Single Exposure_score_mapped",
    "Skin Sensitization_score_mapped",
    "Skin Irritation_score_mapped",
    "Eye Irritation_score_mapped",
    "Acute Aquatic Toxicity_score_mapped",
    "Chronic Aquatic Toxicity_score_mapped",
    "Persistence_score_mapped",
    "Bioaccumulation_score_mapped",
    "Exposure_score_mapped",
    "Hazard Score",
    "Hazard Completeness Score",
  ];

  let filteredData = [];
  data.forEach((row) => {
    let filteredRow = {};
    Object.entries(row).forEach(([key, value]) => {
      if (keysToKeep.includes(key)) {
        // converts numerical data into a Number data type
        if (key == "Feature ID"){value = Number(value);}
        else if (keysToNum.includes(key)) {value = Number(Number(value).toPrecision(3));} //Rounds all numerical columns to 3 sig figs
        filteredRow[key] = value;
      }
    });
    filteredData.push(filteredRow)
  });
  return filteredData;
}

// Creates an SVG element inside a parent element
function makeSvgElement(width, height, className, parentElement) {
  const svg = parentElement.append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("overflow", "visible")
    .attr("class", className);
  return svg;
}

// Returns the candidate data for only a single selected feature
function truncateData(data, selectedFeature){
  const result_truncated = data.filter(feature => feature['Feature ID'] == selectedFeature);
  return result_truncated;
}

//Returns the dataset with only the top 5 metadata candidates for each feature
function getTop5Rows(arr, categoryField, valueField) {
  const groupedData = {};

  arr.forEach(item => {
    const category = item[categoryField];
    if (!groupedData[category]) {groupedData[category] = [];}
    groupedData[category].push(item);
  });

  let result = [];

  for (const category in groupedData) {
    const sortedData = groupedData[category].sort((a, b) => b[valueField] - a[valueField]);
    result = result.concat(sortedData.slice(0, 5));
  }

  let usefulKeys = [
    "Feature ID",
    "DTXCID_INDIVIDUAL_COMPONENT",
    "SOURCE_COUNT_COLLAPSED",
    "PATENT_COUNT_COLLAPSED",
    "LITERATURE_COUNT_COLLAPSED",
    "PUBMED_COUNT_COLLAPSED",
    "Structure_AMOS methods count",
    "Structure_AMOS fact sheets count",
    "Structure_AMOS spectra count",
    "Structure_Presence in water lists count",
    "SOURCE_COUNT_COLLAPSED_NORM",
    "PATENT_COUNT_COLLAPSED_NORM",
    "LITERATURE_COUNT_COLLAPSED_NORM",
    "PUBMED_COUNT_COLLAPSED_NORM",
    "Structure_AMOS methods count_norm",
    "Structure_AMOS fact sheets count_norm",
    "Structure_AMOS spectra count_norm",
    "Structure_Presence in water lists count_norm",
    "STRUCTURE_TOTAL_NORM",
    "MS2 quotient score", 
    "Acute Mammalian Toxicity Oral_authority_mapped",
    "Acute Mammalian Toxicity Inhalation_authority_mapped",
    "Acute Mammalian Toxicity Dermal_authority_mapped",
    "Carcinogenicity_authority_mapped",
    "Genotoxicity Mutagenicity_authority_mapped",
    "Endocrine Disruption_authority_mapped",
    "Reproductive_authority_mapped",
    "Developmental_authority_mapped",
    "Neurotoxicity Repeat Exposure_authority_mapped",
    "Neurotoxicity Single Exposure_authority_mapped",
    "Systemic Toxicity Repeat Exposure_authority_mapped",
    "Systemic Toxicity Single Exposure_authority_mapped",
    "Skin Sensitization_authority_mapped",
    "Skin Irritation_authority_mapped",
    "Eye Irritation_authority_mapped",
    "Acute Aquatic Toxicity_authority_mapped",
    "Chronic Aquatic Toxicity_authority_mapped",
    "Persistence_authority_mapped",
    "Bioaccumulation_authority_mapped",
    "Exposure_authority_mapped",
    "Acute Mammalian Toxicity Oral_score_mapped",
    "Acute Mammalian Toxicity Inhalation_score_mapped",
    "Acute Mammalian Toxicity Dermal_score_mapped",
    "Carcinogenicity_score_mapped",
    "Genotoxicity Mutagenicity_score_mapped",
    "Endocrine Disruption_score_mapped",
    "Reproductive_score_mapped",
    "Developmental_score_mapped",
    "Neurotoxicity Repeat Exposure_score_mapped",
    "Neurotoxicity Single Exposure_score_mapped",
    "Systemic Toxicity Repeat Exposure_score_mapped",
    "Systemic Toxicity Single Exposure_score_mapped",
    "Skin Sensitization_score_mapped",
    "Skin Irritation_score_mapped",
    "Eye Irritation_score_mapped",
    "Acute Aquatic Toxicity_score_mapped",
    "Chronic Aquatic Toxicity_score_mapped",
    "Persistence_score_mapped",
    "Bioaccumulation_score_mapped",
    "Exposure_score_mapped",
    "Hazard Score",
    "Hazard Completeness Score",
  ];

  return cleanData(data = result, keysToKeep = usefulKeys)
}

//Creates the white-to-red gradient for the Hazard Completeness Score legend
function addHazardLegend(){
  const svgNS = "http://www.w3.org/2000/svg";

  const gradientSVG = document.createElementNS(svgNS, "svg");
  gradientSVG.setAttribute("id", "tripod-gradient-rect");
  gradientSVG.setAttribute("width", "300");
  gradientSVG.setAttribute("height", "50");

  document.getElementById("tripod-settings-container").appendChild(gradientSVG)
  
  const defs = document.createElementNS(svgNS, 'defs');

  const linearGradient = document.createElementNS(svgNS, "linearGradient");
  linearGradient.setAttribute("id", "tripod-Gradient1");
  linearGradient.setAttribute("x1", "0%");
  linearGradient.setAttribute("y1", "0%");
  linearGradient.setAttribute("x2", "100%");
  linearGradient.setAttribute("y2", "0%");

  const stop1 = document.createElementNS(svgNS, "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "white");
  linearGradient.appendChild(stop1);

  const stop2 = document.createElementNS(svgNS, "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "red");
  linearGradient.appendChild(stop2);

  defs.appendChild(linearGradient);
  gradientSVG.appendChild(defs)

  const gradRect = document.createElementNS(svgNS, "rect");
  gradRect.setAttribute("id", "tripod-rect1")
  gradRect.setAttribute("x", "10")
  gradRect.setAttribute("y", "10")
  gradRect.setAttribute("width", "300")
  gradRect.setAttribute("height", "20")
  gradRect.setAttribute("fill", 'url(#tripod-Gradient1)')

  gradientSVG.appendChild(gradRect)

  
}

// Adds Information Box and Settings Container text 
var structure_label_span = null
var structure_label = null
var more_features_as_text = ""
function addInfoBox() {
// Add a border around the visualization options
var settingsBorder = makeSvgElement(465, 420, "settings-border", d3.select("#tripod-settings-container"));

settingsBorder.append("rect")
  .attr("width", 465)
  .attr("height", 420)
  .attr("rx", 10)
  .attr("x", 1)
  .attr("fill", "transparent")
  .style("stroke", "#a7b2c2")
  .attr("z-index", -1);

settingsBorder.append("text")
  .text("Hazard Completeness Score")  
  .attr("font-size", 22)
  .attr("font-weight", "bold")
  .attr("x", 110)
  .attr("y", 230)

settingsBorder.append("text")
  .text("Metadata Legend")  
  .attr("font-size", 22)
  .attr("font-weight", "bold")
  .attr("x", 156)
  .attr("y", 45)

settingsBorder.append("text")
  .text("0.0")  
  .attr("font-size", 18)
  .attr("x", 90)
  .attr("y", 284) 

settingsBorder.append("text")
  .text("1.0")  
  .attr("font-size", 18)
  .attr("x", 358)
  .attr("y", 284)   

infoBox = makeSvgElement(465, 304, "infobox", d3.select("#tripod-infobox"))

infoBox.append("rect")
  .attr("width", 465)
  .attr("height", 347)
  .attr("rx", 10)
  .attr("x", 0)
  .attr("y", 0)
  .attr("fill", "transparent")
  .style("stroke", "#a7b2c2")
  .attr("z-index", -1)

structure_label_span = document.createElement('span')
  structure_label_span.style.position = "absolute"
  structure_label_span.style.top = "455px"
  structure_label_span.style.left = "21px"
  structure_label = document.createTextNode(' ')
  structure_label_span.appendChild(structure_label)
  document.getElementById("tripod-settings-container").appendChild(structure_label_span)

more_features_span = document.createElement('span')
  more_features_span.style.position = "absolute"
  more_features_span.style.zIndex = 1
  more_features_span.style.top = "620px"
  more_features_span.style.left = "21px"
  more_features_span.style.maxWidth = "160px"
  more_features_span.style.maxHeight = "160px"
  more_features_span.style.overflowY = "auto"
  more_features = document.createTextNode("")
  more_features_span.appendChild(more_features)
document.getElementById("tripod-settings-container").appendChild(more_features_span)

}

// Static URL links
const comptoxURL = "https://ccte-res-ncd.epa.gov/dashboard/dsstoxdb/results?search="
const structureImageURL = "https://comptox.epa.gov/dashboard-api/ccdapp1/chemical-files/image/by-dtxcid/"

addHazardLegend()
addInfoBox()

// ======= MAIN FUNCTION =======================================================================================================
async function generatePlots(filePath) {

// Import the input csv
const fullData = await parseCSV(filePath)

// Check if the dataset contains MS2 data
const hasMS2 = Object.keys(fullData[0]).some(col => col.includes("MS2"))

// create checkboxes for selecting plots to load
var metaInput = document.createElement("input")
  metaInput.setAttribute('type', 'checkbox')
  metaInput.setAttribute('id', 'input-meta')
  document.getElementById("tripod-main-container").appendChild(metaInput)
metaInput.checked = true  

var hazardInput = document.createElement("input")
  hazardInput.setAttribute('type', 'checkbox')
  hazardInput.setAttribute('id', 'input-hazard')
  document.getElementById("tripod-main-container").appendChild(hazardInput)
hazardInput.checked = true  

if (hasMS2){  
var MS2Input = document.createElement("input")
  MS2Input.setAttribute('type', 'checkbox')
  MS2Input.setAttribute('id', 'input-MS2')
  document.getElementById("tripod-main-container").appendChild(MS2Input)
MS2Input.checked = true
}
else{
  const mySpan = document.createElement('span')
  noMS2Text = document.createTextNode("No MS2 data found.")
  mySpan.appendChild(noMS2Text)
  document.getElementById("tripod-chart-MS2").appendChild(mySpan)
  mySpan.style.position = "absolute"
  mySpan.style.top = "200px"
  mySpan.style.left = "190px"
  mySpan.style.fontSize = '22px';
}


// Gets the dataset containing only the top 5 highest metadata rows. 
const top5groups = getTop5Rows(fullData, 'Feature ID', 'STRUCTURE_TOTAL_NORM');

// Get a list of all unique features in the dataset, sorted from smallest to largest
var uniqueFeatureList = [...new Set(fullData.map(item =>item['Feature ID']))]
for (let i = 0; i < uniqueFeatureList.length; i++) {uniqueFeatureList[i] = Number(uniqueFeatureList[i]);}
uniqueFeatureList.sort((a, b) => a - b);

// Define the feature to initially display in the plots
var selectedFeature = uniqueFeatureList[0]

// Define the number of unique feature IDs in the dataset
const uniqueFeatureListLength = uniqueFeatureList.length

// Define the mass, RT, abundance, and occurrence percentage of the selectedFeature to initially display in the plot title
var mass = Number(fullData[0]["Mass"]).toFixed(4)
var RT = Number(fullData[0]["Retention Time"]).toFixed(2)
var abundance = Math.round(fullData[0]["Median blanksub mean feature abundance"])
var occ_percentage = Number(fullData[0]["Final Occurrence Percentage"])

// boolean used by loadData() to check whether to use all data in the plots, or just the dataFromGrid
var gridUpdated = false 

var dataFromGrid = null 

var showingTop5 = false
// Create a button that toggles between showing all candidates, and just the top 5 candidates
function createTop5ToggleButton(){
  const button = document.createElement('button')
    button.textContent = "Click to show top 5 metadata candidates only";
    button.style.width = '190px';
    button.id = 'tripod-Top5ToggleButton';
    button.style.padding = '5px 10px';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    document.getElementById('tripod-settings-container').appendChild(button);
  
  button.addEventListener('click', function() {
    gridUpdated = false
    document.getElementById('tripod-grid').innerHTML= ""
    
    if (showingTop5){
      button.textContent = "Click to show top 5 metadata candidates only"
      showingTop5 = false
      makeLargeGrid()
      metaInput.checked = true;
      hazardInput.checked = false;
      if (hasMS2){MS2Input.checked = false;}

      document.getElementById('tripod-chart-meta').innerHTML= ""
      document.getElementById('tripod-title').innerHTML= ""
      updateData("STRUCTURE_TOTAL_NORM")
      loadData(data)

      metaInput.checked = false;
      hazardInput.checked = true;
      document.getElementById('tripod-chart-hazard').innerHTML= ""
      document.getElementById('tripod-title').innerHTML= ""
      updateData("Hazard Score")
      loadData(data)

      if (hasMS2){
      hazardInput.checked = false;
      MS2Input.checked = true
      document.getElementById('tripod-chart-MS2').innerHTML= ""
      document.getElementById('tripod-title').innerHTML= ""
      updateData("MS2 quotient score")
      loadData(data)}

      metaInput.checked = true
      hazardInput.checked = true
    }
    else {
      button.textContent = "Showing Top 5 metadata candidates. Click to show all";
      showingTop5 = true
      makeLargeGrid()
      metaInput.checked = true;
      hazardInput.checked = false;
      if (hasMS2){MS2Input.checked = false;}

      document.getElementById('tripod-chart-meta').innerHTML= ""
      document.getElementById('tripod-title').innerHTML= ""
      updateData("STRUCTURE_TOTAL_NORM")
      loadData(data)

      metaInput.checked = false;
      hazardInput.checked = true;
      document.getElementById('tripod-chart-hazard').innerHTML= ""
      document.getElementById('tripod-title').innerHTML= ""
      updateData("Hazard Score")
      loadData(data)

      if (hasMS2){
      hazardInput.checked = false;
      MS2Input.checked = true
      document.getElementById('tripod-chart-MS2').innerHTML= ""
      document.getElementById('tripod-title').innerHTML= ""
      updateData("MS2 quotient score")
      loadData(data)}

      metaInput.checked = true
      hazardInput.checked = true
      }
    });
}

// function to shuttle between feature IDs. argument position = 'first', 'last', 'forward', 'back', or 'input'
function goToPosition(event, position){
  if (position == "first"){selectedFeature = uniqueFeatureList[0]}
  else if (position == "last"){selectedFeature = uniqueFeatureList[uniqueFeatureListLength -1]}
  else if (position == "forward"){
    if (uniqueFeatureList.indexOf(selectedFeature) == uniqueFeatureListLength -1){return};
    let newIndex = uniqueFeatureList.indexOf(selectedFeature) + 1;
    selectedFeature = uniqueFeatureList[newIndex]}
  else if (position == "back"){
    if (uniqueFeatureList.indexOf(selectedFeature) == 0){return}
    let newIndex = uniqueFeatureList.indexOf(selectedFeature) - 1
    selectedFeature = uniqueFeatureList[newIndex]}
  else if (position == "input"){
    let input = document.getElementById("input-feature").value
    if (uniqueFeatureList.includes(Number(input))){selectedFeature = Number(input)}
  else{
      alert(`Feature ID '${input}' does not exist in the dataset. Please enter a valid Feature ID`)
      return
    }
  }  

  gridUpdated = false

  metaInput.checked = true;
  hazardInput.checked = false;
  if (hasMS2){MS2Input.checked = false;}

  document.getElementById('tripod-chart-meta').innerHTML= ""
  document.getElementById('tripod-title').innerHTML= ""
  updateData("STRUCTURE_TOTAL_NORM")
  loadData(data)

  metaInput.checked = false;
  hazardInput.checked = true;
  document.getElementById('tripod-chart-hazard').innerHTML= ""
  document.getElementById('tripod-title').innerHTML= ""
  updateData("Hazard Score")
  loadData(data)

  if (hasMS2){
  hazardInput.checked = false;
  MS2Input.checked = true
  document.getElementById('tripod-chart-MS2').innerHTML= ""
  document.getElementById('tripod-title').innerHTML= ""
  updateData("MS2 quotient score")
  loadData(data)}
  
  metaInput.checked = true
  hazardInput.checked = true

}

//Create shuttle buttons
function makeArrows(){
  const arrowsvgleft = makeSvgElement(30, 30, 'tripod-arrow-left', d3.select("#tripod-chart-container"));
    arrowsvgleft.attr('id', "left-arrow")
    arrowsvgleft.append('rect')
      .attr("id", "left-arrow-rect")
      .attr("width", "30px")
      .attr("height", "30px")
      .attr("rx", "6px")
      .attr("x", "1")
      .attr("y", "1")
      .attr("fill", "#DBE4F0")
    arrowsvgleft.append('path')
      .attr('d', 'M25 0H7a7 7 0 0 0-7 7v18a7 7 0 0 0 7 7h18a7 7 0 0 0 7-7V7a7 7 0 0 0-7-7zm5 25a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5z')
    arrowsvgleft.append('path')
      .attr('d', 'm13.71 9.71-1.42-1.42-7 7a1 1 0 0 0 0 1.41l7 7 1.41-1.41L8.41 17H27v-2H8.41z')
    document.getElementById('left-arrow').addEventListener('click', function(event) {goToPosition(event, position="back")});
    arrowsvgleft.attr("onmouseover", "document.getElementById('left-arrow-rect').setAttribute('fill', '#3d4e634d')")
    arrowsvgleft.attr("onmouseout", "document.getElementById('left-arrow-rect').setAttribute('fill', '#DBE4F0')")
  
  const arrowsvgright = makeSvgElement(30, 30, 'tripod-arrow-right', d3.select("#tripod-chart-container"));
    arrowsvgright.attr('id', "right-arrow")
    arrowsvgright.append('rect')
      .attr("id", "right-arrow-rect")
      .attr("width", "30px")
      .attr("height", "30px")
      .attr("rx", "6px")
      .attr("x", "1")
      .attr("y", "1")
      .attr("fill", "#DBE4F0")  
    arrowsvgright.append('path')
      .attr('d', 'M25 0H7a7 7 0 0 0-7 7v18a7 7 0 0 0 7 7h18a7 7 0 0 0 7-7V7a7 7 0 0 0-7-7zm5 25a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5z')
    arrowsvgright.append('path')
      .attr('d', 'm19.71 8.29-1.42 1.42 5.3 5.29H5v2h18.59l-5.29 5.29 1.41 1.41 7-7a1 1 0 0 0 0-1.41z')
    document.getElementById('right-arrow').addEventListener('click', function(event) {goToPosition(event, position="forward")});
    arrowsvgright.attr("onmouseover", "document.getElementById('right-arrow-rect').setAttribute('fill', '#3d4e634d')")
    arrowsvgright.attr("onmouseout", "document.getElementById('right-arrow-rect').setAttribute('fill', '#DBE4F0')")

    const arrowsvglast = makeSvgElement(30, 30, 'tripod-arrow-last', d3.select("#tripod-chart-container"));
      arrowsvglast.attr('id', "last-arrow")
      arrowsvglast.append('rect')
        .attr("id", "last-arrow-rect")
        .attr("width", "30px")
        .attr("height", "30px")
        .attr("rx", "6px")
        .attr("x", "1")
        .attr("y", "1")
        .attr("fill", "#DBE4F0")  
      arrowsvglast.append('path')
        .attr('d', 'M25 0H7a7 7 0 0 0-7 7v18a7 7 0 0 0 7 7h18a7 7 0 0 0 7-7V7a7 7 0 0 0-7-7zm5 25a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5z')
      arrowsvglast.append('path')
        .attr('d', 'M66.6,108.91c1.55,1.63,2.31,3.74,2.28,5.85c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12c-1.58,1.5-3.6,2.23-5.61,2.2 c-2.01-0.03-4.02-0.82-5.55-2.37C37.5,102.85,20.03,84.9,2.48,67.11c-0.07-0.05-0.13-0.1-0.19-0.16C0.73,65.32-0.03,63.19,0,61.08 c0.03-2.11,0.85-4.21,2.45-5.8l0.27-0.26C20.21,37.47,37.65,19.87,55.17,2.36C56.71,0.82,58.7,0.03,60.71,0 c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76c0.03,2.1-0.73,4.22-2.28,5.85L19.38,61.23L66.6,108.91 L66.6,108.91z M118.37,106.91c1.54,1.62,2.29,3.73,2.26,5.83c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12 c-1.57,1.5-3.6,2.23-5.61,2.21c-2.01-0.03-4.02-0.82-5.55-2.37C89.63,101.2,71.76,84.2,54.24,67.12c-0.07-0.05-0.14-0.11-0.21-0.17 c-1.55-1.63-2.31-3.76-2.28-5.87c0.03-2.11,0.85-4.21,2.45-5.8C71.7,38.33,89.27,21.44,106.8,4.51l0.12-0.13 c1.53-1.54,3.53-2.32,5.54-2.35c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76 c0.03,2.1-0.73,4.22-2.28,5.85L71.17,61.23L118.37,106.91L118.37,106.91z')
        .attr('transform', 'translate(26, 26) scale(0.16) rotate(180)')
      document.getElementById('last-arrow').addEventListener('click', function(event) {goToPosition(event, position="last")});
      arrowsvglast.attr("onmouseover", "document.getElementById('last-arrow-rect').setAttribute('fill', '#3d4e634d')")
      arrowsvglast.attr("onmouseout", "document.getElementById('last-arrow-rect').setAttribute('fill', '#DBE4F0')")

    const arrowsvgfirst = makeSvgElement(30, 30, 'tripod-arrow-first', d3.select("#tripod-chart-container"));
      arrowsvgfirst.attr('id', "first-arrow")
      arrowsvgfirst.append('rect')
        .attr("id", "first-arrow-rect")
        .attr("width", "30px")
        .attr("height", "30px")
        .attr("rx", "6px")
        .attr("x", "1")
        .attr("y", "1")
        .attr("fill", "#DBE4F0")  
      arrowsvgfirst.append('path')
        .attr('d', 'M25 0H7a7 7 0 0 0-7 7v18a7 7 0 0 0 7 7h18a7 7 0 0 0 7-7V7a7 7 0 0 0-7-7zm5 25a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5z')
      arrowsvgfirst.append('path')
        .attr('d', 'M66.6,108.91c1.55,1.63,2.31,3.74,2.28,5.85c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12c-1.58,1.5-3.6,2.23-5.61,2.2 c-2.01-0.03-4.02-0.82-5.55-2.37C37.5,102.85,20.03,84.9,2.48,67.11c-0.07-0.05-0.13-0.1-0.19-0.16C0.73,65.32-0.03,63.19,0,61.08 c0.03-2.11,0.85-4.21,2.45-5.8l0.27-0.26C20.21,37.47,37.65,19.87,55.17,2.36C56.71,0.82,58.7,0.03,60.71,0 c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76c0.03,2.1-0.73,4.22-2.28,5.85L19.38,61.23L66.6,108.91 L66.6,108.91z M118.37,106.91c1.54,1.62,2.29,3.73,2.26,5.83c-0.03,2.11-0.84,4.2-2.44,5.79l-0.12,0.12 c-1.57,1.5-3.6,2.23-5.61,2.21c-2.01-0.03-4.02-0.82-5.55-2.37C89.63,101.2,71.76,84.2,54.24,67.12c-0.07-0.05-0.14-0.11-0.21-0.17 c-1.55-1.63-2.31-3.76-2.28-5.87c0.03-2.11,0.85-4.21,2.45-5.8C71.7,38.33,89.27,21.44,106.8,4.51l0.12-0.13 c1.53-1.54,3.53-2.32,5.54-2.35c2.01-0.03,4.03,0.7,5.61,2.21l0.15,0.15c1.57,1.58,2.38,3.66,2.41,5.76 c0.03,2.1-0.73,4.22-2.28,5.85L71.17,61.23L118.37,106.91L118.37,106.91z')
        .attr('transform', 'translate(5.5, 6.5) scale(0.16) ')
      document.getElementById('first-arrow').addEventListener('click', function(event) {goToPosition(event, position="first")});
      arrowsvgfirst.attr("onmouseover", "document.getElementById('first-arrow-rect').setAttribute('fill', '#3d4e634d')")
      arrowsvgfirst.attr("onmouseout", "document.getElementById('first-arrow-rect').setAttribute('fill', '#DBE4F0')")

    const datalist = document.createElement('datalist');
      datalist.id = 'featureOptions'
      uniqueFeatureList.forEach(num => {
      const option = document.createElement('option');
      option.value = num;
      datalist.appendChild(option);
    });
    document.body.appendChild(datalist)

    var featureInput = document.createElement("input")
      featureInput.setAttribute('id', 'input-feature')
      featureInput.setAttribute('type', 'text')
      featureInput.setAttribute('min', `${uniqueFeatureList[0]}`)
      featureInput.setAttribute('min', `0`)
      featureInput.setAttribute('max', `${uniqueFeatureList[uniqueFeatureList.length -1]}`)
      featureInput.setAttribute('placeholder', 'Feature ID')
      featureInput.setAttribute('list', 'featureOptions')
      document.getElementById("tripod-main-container").appendChild(featureInput)

    let button = document.createElement('button')
      button.textContent = "Go";
      button.style.width = '30px';
      button.style.height = '30px';
      button.id = 'feature-input-button';
      button.style.cursor = 'pointer';
      document.getElementById('tripod-main-container').appendChild(button);
      button.addEventListener('click', function(event) {goToPosition(event, position="input")})
  }
  

//Add the static X-axis to the visualization.
var xMeta = null
var xHazard = null
var xMS2 = null
function addXaxis(xMax, pre_space){
  //Create svg for x-axis
  const xAxisSvg = makeSvgElement(400, 20, 'tripod-xaxis', d3.select("#tripod-xaxis"));
  let x = d3.scaleLinear() 
    .domain([0, xMax])
    .range([ 0, 360 ]);

  xlabel = xAxisSvg.append("g")
    .call(d3.axisBottom(x))
    .attr("transform", `translate(${pre_space}, 0)`)
    .classed("tripod-xlabel", true);

  return x
  }

makeArrows()  
createTop5ToggleButton() 

if (hasMS2) {
  xMS2 = addXaxis(1, pre_space = 136)
  xMeta = addXaxis(8, pre_space = 274)
  xHazard = addXaxis(12, pre_space = 410)
}
else {
  xMeta = addXaxis(8, pre_space = 674)
  xHazard = addXaxis(12, pre_space = 810)
}


// Keys to keep for cleaning data
const keysToKeep = [
    "Feature ID",
    "DTXCID_INDIVIDUAL_COMPONENT",
    "Mass", 
    "Retention Time",
    "SOURCE_COUNT_COLLAPSED",
    "PATENT_COUNT_COLLAPSED",
    "LITERATURE_COUNT_COLLAPSED",
    "PUBMED_COUNT_COLLAPSED",
    "Structure_AMOS methods count",
    "Structure_AMOS fact sheets count",
    "Structure_AMOS spectra count",
    "Structure_Presence in water lists count",
    "SOURCE_COUNT_COLLAPSED_NORM",
    "PATENT_COUNT_COLLAPSED_NORM",
    "LITERATURE_COUNT_COLLAPSED_NORM",
    "PUBMED_COUNT_COLLAPSED_NORM",
    "Structure_AMOS methods count_norm",
    "Structure_AMOS fact sheets count_norm",
    "Structure_AMOS spectra count_norm",
    "Structure_Presence in water lists count_norm",
    "STRUCTURE_TOTAL_NORM", 
    "Hazard Score", 
    "Hazard Completeness Score",
    "MS2 quotient score", 
    "Median blanksub mean feature abundance",
    "Final Occurrence Percentage", 
    "Acute Mammalian Toxicity Oral_authority_mapped",
    "Acute Mammalian Toxicity Inhalation_authority_mapped",
    "Acute Mammalian Toxicity Dermal_authority_mapped",
    "Carcinogenicity_authority_mapped",
    "Genotoxicity Mutagenicity_authority_mapped",
    "Endocrine Disruption_authority_mapped",
    "Reproductive_authority_mapped",
    "Developmental_authority_mapped",
    "Neurotoxicity Repeat Exposure_authority_mapped",
    "Neurotoxicity Single Exposure_authority_mapped",
    "Systemic Toxicity Repeat Exposure_authority_mapped",
    "Systemic Toxicity Single Exposure_authority_mapped",
    "Skin Sensitization_authority_mapped",
    "Skin Irritation_authority_mapped",
    "Eye Irritation_authority_mapped",
    "Acute Aquatic Toxicity_authority_mapped",
    "Chronic Aquatic Toxicity_authority_mapped",
    "Persistence_authority_mapped",
    "Bioaccumulation_authority_mapped",
    "Exposure_authority_mapped",
    "Acute Mammalian Toxicity Oral_score_mapped",
    "Acute Mammalian Toxicity Inhalation_score_mapped",
    "Acute Mammalian Toxicity Dermal_score_mapped",
    "Carcinogenicity_score_mapped",
    "Genotoxicity Mutagenicity_score_mapped",
    "Endocrine Disruption_score_mapped",
    "Reproductive_score_mapped",
    "Developmental_score_mapped",
    "Neurotoxicity Repeat Exposure_score_mapped",
    "Neurotoxicity Single Exposure_score_mapped",
    "Systemic Toxicity Repeat Exposure_score_mapped",
    "Systemic Toxicity Single Exposure_score_mapped",
    "Skin Sensitization_score_mapped",
    "Skin Irritation_score_mapped",
    "Eye Irritation_score_mapped",
    "Acute Aquatic Toxicity_score_mapped",
    "Chronic Aquatic Toxicity_score_mapped",
    "Persistence_score_mapped",
    "Bioaccumulation_score_mapped",
    "Exposure_score_mapped",
  ];
// Keys to keep for cleaning data further for sub-grouping on bar plot
const subgroupKeys = [
    "DTXCID_INDIVIDUAL_COMPONENT",
    "SOURCE_COUNT_COLLAPSED",
    "PATENT_COUNT_COLLAPSED",
    "LITERATURE_COUNT_COLLAPSED",
    "PUBMED_COUNT_COLLAPSED",
    "Structure_AMOS methods count",
    "Structure_AMOS fact sheets count",
    "Structure_AMOS spectra count",
    "Structure_Presence in water lists count",
    "SOURCE_COUNT_COLLAPSED_NORM",
    "PATENT_COUNT_COLLAPSED_NORM",
    "LITERATURE_COUNT_COLLAPSED_NORM",
    "PUBMED_COUNT_COLLAPSED_NORM",
    "Structure_AMOS methods count_norm",
    "Structure_AMOS fact sheets count_norm",
    "Structure_AMOS spectra count_norm",
    "Structure_Presence in water lists count_norm",
    "STRUCTURE_TOTAL_NORM", 
    "Hazard Score", 
    "Hazard Completeness Score",
    "MS2 quotient score", 
  ];

//Instantiate variables
var data = null
var unsorted_subGroupData = null
var subGroupData = null
var totalCandidates = null
var numCandidatesRemoved = null
var height = null
var svgMeta = null
var svgHazard = null
var svgMS2 = null


// const fieldList = ["meta", "hazard", "MS2"]
const fieldList = ["meta", "hazard"]
if (hasMS2) {fieldList.push("MS2")}

//Updates sorts, and cleans the data displayed in the plots 
function updateData (category){
  data = truncateData(fullData, selectedFeature);
  data = cleanData(data, keysToKeep)

  mass = Number(data[0]["Mass"]).toFixed(4)
  RT = Number(data[0]["Retention Time"]).toFixed(2)
  abundance = Math.round(data[0]["Median blanksub mean feature abundance"])
  occ_percentage = Number(data[0]["Final Occurrence Percentage"])

  unsorted_subGroupData = cleanData(data, subgroupKeys);
  totalCandidates = unsorted_subGroupData.length
  subGroupData = sortData(unsorted_subGroupData, category)
  numCandidatesRemoved = unsorted_subGroupData.length - subGroupData.length
  const subGroupHeaders = []; //includes all norm headers exept total norm
  Object.entries(subGroupData[0]).forEach(([key]) => {if (key.includes("NORM") && !key.includes("TOTAL")) {subGroupHeaders.push(key);}});

  //Check status of the Top-5 toggle button
  if (showingTop5) {
    subGroupData = sortData(unsorted_subGroupData, "STRUCTURE_TOTAL_NORM").slice(0, 5);
    subGroupData = sortData(subGroupData, category)
  } 

  //Check if the chart is being loaded from a grid update
  if (gridUpdated){subGroupData = dataFromGrid;}

}

//Keys to include in the metadata legend
var keysToInclude = [ 
  "Structure_AMOS fact sheets count_norm", 
  "Structure_AMOS methods count_norm", 
  "Structure_AMOS spectra count_norm",
  "PUBMED_COUNT_COLLAPSED_NORM",
  "LITERATURE_COUNT_COLLAPSED_NORM", 
  "PATENT_COUNT_COLLAPSED_NORM",
  "SOURCE_COUNT_COLLAPSED_NORM",
  "Structure_Presence in water lists count_norm",
  ] 

//Metadata fields to include in the metadata plot
var showKeys = [ 
  "Structure_AMOS fact sheets count_norm", 
  "Structure_AMOS methods count_norm", 
  "Structure_AMOS spectra count_norm",
  "PUBMED_COUNT_COLLAPSED_NORM",
  "LITERATURE_COUNT_COLLAPSED_NORM", 
  "PATENT_COUNT_COLLAPSED_NORM",
  "SOURCE_COUNT_COLLAPSED_NORM",
  "Structure_Presence in water lists count_norm",
  ] 
 
//Metadata fields NOT to show in the metadata plot (fields are crossed out in the legend)
var removedKeys = []

var yMeta = null
var yHazard = null
var yMS2 = null


//Create y axis for all three plots
function yAxisMeta(data){
  height = subGroupData.length * 30;
  let Ygroups = data.map(d => (d.DTXCID_INDIVIDUAL_COMPONENT))
  yMeta = d3.scaleBand() 
    .domain(Ygroups)
    .range([0, height])
    .padding([0.2]);

  ylabelMeta = svgMeta.append("g")
    .attr("transform", `translate(135, 20)`)
    .call(d3.axisLeft(yMeta).tickSizeOuter(0))
    .attr("id", "tripod-ylabel-meta")

  d3.select("#tripod-ylabel-meta").selectAll("text").attr("id", function(d, i){return "ylabel-" + Ygroups[i] + "-meta"})

  // Extend the y-axis line if there are less than 23 candidates for the selected feature ID. 
  if (Ygroups.length < 23) {
    ylabelMeta.select('path')
    .attr("stroke", "white")

    ylabelMeta.append('path')
      .attr("stroke", "black")
      .attr("d", "M0.5,0.5V1290.5")
      .attr("fill-opacity", "100%")
  }

  ylabelMeta.selectAll("g")
    .on("mouseover", mouseoverYlabel)
    .on("mousemove", mousemoveYlabel)
    .on("mouseleave", mouseleaveYlabel)
    .on("click", ylabelClick)
}
function yAxisHazard(data){
  height = subGroupData.length * 30;
  let Ygroups = data.map(d => (d.DTXCID_INDIVIDUAL_COMPONENT))
  yHazard = d3.scaleBand() 
    .domain(Ygroups)
    .range([0, height])
    .padding([0.2]);

  ylabelHazard = svgHazard.append("g")
    .attr("transform", `translate(135, 20)`)
    .call(d3.axisLeft(yHazard).tickSizeOuter(0))
    .attr("id", "tripod-ylabel-hazard")

  d3.select("#tripod-ylabel-hazard").selectAll("text").attr("id", function(d, i){return "ylabel-" + Ygroups[i] + "-hazard"})

  // Extend the y-axis line if there are less than 23 candidates for the selected feature ID. 
  if (Ygroups.length < 23) {

    ylabelHazard.select('path')
    .attr("stroke", "white")

    ylabelHazard.append('path')
      .attr("stroke", "black")
      .attr("d", "M0.5,0.5V1290.5")
  }

  ylabelHazard.selectAll("g")
    .on("mouseover", mouseoverYlabel)
    .on("mousemove", mousemoveYlabel)
    .on("mouseleave", mouseleaveYlabel)
    .on("click", ylabelClick)
}
function yAxisMS2(data){
  height = subGroupData.length * 30;
  let Ygroups = data.map(d => (d.DTXCID_INDIVIDUAL_COMPONENT))
  yMS2 = d3.scaleBand() 
    .domain(Ygroups)
    .range([0, height])
    .padding([0.2]);

  ylabelMS2 = svgMS2.append("g")
    .attr("transform", `translate(135, 20)`)
    .call(d3.axisLeft(yMS2).tickSizeOuter(0))
    .attr("id", "tripod-ylabel-MS2")

  d3.select("#tripod-ylabel-MS2").selectAll("text").attr("id", function(d, i){return "ylabel-" + Ygroups[i] + "-MS2"})

  // Extend the y-axis line if there are less than 23 candidates for the selected feature ID. 
  if (Ygroups.length < 23) {
    ylabelMS2.select('path')
    .attr("stroke", "white")

    ylabelMS2.append('path')
      .attr("stroke", "black")
      .attr("d", "M0.5,0.5V1290.5")
  }

  ylabelMS2.selectAll("g")
    .on("mouseover", mouseoverYlabel)
    .on("mousemove", mousemoveYlabel)
    .on("mouseleave", mouseleaveYlabel)
    .on("click", ylabelClick)
}

function goToHyperlink(){window.open(comptoxURL + clickedDTXCID)}

tooltipYlabel = null
// Create the y-axis structure image tooltip
function createYToolTip(){
  tooltipYlabel = d3.select("#tripod-chart-container")
    .append("div")
    .style("display", "none")
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("position", "fixed")
    .style("max-width", "200px")
    .attr("id", "tripod-yAxisToolTip"); 
  }
  createYToolTip()

// Create the clickable InfoBox structure image tooltip
var structureToolTip = d3.select(`#tripod-infobox`)
  .append("div")
  .attr("id", `tripod-StructureToolTip`)
var imageDiv = document.getElementById("tripod-StructureToolTip")
  imageDiv.addEventListener('click', goToHyperlink)
var image = document.createElement('div')
  image.style.width = "120px"
  image.style.height = "128px"
  imageDiv.appendChild(image)
  const textNode = document.createTextNode("Click on a a DTXCID to display the structure image")  
  image.appendChild(textNode)

const outlink = document.createElement('img');
  outlink.src = 'outlink.svg';
  outlink.id = 'tripod-outlink'
  document.getElementById("tripod-infobox").appendChild(outlink);  
  outlink.addEventListener('click', goToHyperlink)

// Function to get the structure image for the InfoBox tooltip
function getImage(name){
  image = document.createElement('img');
  image.src = structureImageURL + name
  image.style = "width:120px;height:120px;padding-top:2px;padding-bottom:2px;";
  image.alt = `Structure image for ${name}`
  return image
}

// Define the prevously clicked and currently clicked y-axis label
var previousClickedDTXCID = null
var clickedDTXCID = null

// Define function for y-label click 
var ylabelClick = function(event){
  var DTXCIDname = d3.select(this)['_groups'][0][0].querySelector('text').innerHTML
  structure_label.nodeValue = DTXCIDname

  //Get the other features that this DTXCID is a candidate for 
  const featureArray = fullData.filter(d => d.DTXCID_INDIVIDUAL_COMPONENT === DTXCIDname).map(d => d["Feature ID"])
  more_features_as_text = featureArray.join(", ")
  more_features.nodeValue = `Candidate for feature(s): ${more_features_as_text}`

  previousClickedDTXCID = clickedDTXCID
  clickedDTXCID = DTXCIDname
  imageDiv.removeChild(image)
  imageDiv.appendChild(getImage(DTXCIDname))

  if (previousClickedDTXCID == clickedDTXCID){
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
      if (!isElementVisibleInScrollContainer(document.getElementById(`ylabel-${DTXCIDname}-${key}`), document.getElementById(`tripod-chart-${key}`))){
        document.getElementById(`ylabel-${DTXCIDname}-${key}`).scrollIntoView({behavior: "smooth", block: "nearest"})
    }})
    return}

  else {
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
      if (!isElementVisibleInScrollContainer(document.getElementById(`ylabel-${DTXCIDname}-${key}`), document.getElementById(`tripod-chart-${key}`))){
        document.getElementById(`ylabel-${DTXCIDname}-${key}`).scrollIntoView({behavior: "smooth", block: "nearest"})
      }
      if (previousClickedDTXCID)  {
        try {
          let IdToHighlight2 = document.getElementById(`ylabel-${previousClickedDTXCID}-${key}`);
          IdToHighlight2.setAttribute("fill", "black");
          IdToHighlight2.style.fontWeight = "normal";}
        catch{return}}
  })} 
}

// Define function for bar click on metadata plot
var barClickMeta = function(){
  var DTXCIDname = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["data"]["DTXCID_INDIVIDUAL_COMPONENT"]}-meta`).innerHTML
  structure_label.nodeValue = DTXCIDname

  //Get the other features that this DTXCID is a candidate for 
  const featureArray = fullData.filter(d => d.DTXCID_INDIVIDUAL_COMPONENT === DTXCIDname).map(d => d["Feature ID"])
  more_features_as_text = featureArray.join(", ")
  more_features.nodeValue = `Candidate for feature(s): ${more_features_as_text}`

  previousClickedDTXCID = clickedDTXCID
  clickedDTXCID = DTXCIDname
  imageDiv.removeChild(image)
  imageDiv.appendChild(getImage(DTXCIDname))

  if (previousClickedDTXCID == clickedDTXCID){
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
      if (!isElementVisibleInScrollContainer(document.getElementById(`ylabel-${DTXCIDname}-${key}`), document.getElementById(`tripod-chart-${key}`))){
        document.getElementById(`ylabel-${DTXCIDname}-${key}`).scrollIntoView({behavior: "smooth", block: "nearest"})
      }})
    return}

  else {
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
      if (!isElementVisibleInScrollContainer(document.getElementById(`ylabel-${DTXCIDname}-${key}`), document.getElementById(`tripod-chart-${key}`))){
        document.getElementById(`ylabel-${DTXCIDname}-${key}`).scrollIntoView({behavior: "smooth", block: "nearest"})
      }
      if (previousClickedDTXCID)  {
        try {
          let IdToHighlight2 = document.getElementById(`ylabel-${previousClickedDTXCID}-${key}`);
          IdToHighlight2.setAttribute("fill", "black");
          IdToHighlight2.style.fontWeight = "normal";}
        catch{return}}
  })}
}

// Define function for bar click on MS2 and hazard plot
var barClickMS2Hazard = function(){
  var DTXCIDname = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["DTXCID_INDIVIDUAL_COMPONENT"]}-hazard`).innerHTML
  structure_label.nodeValue = DTXCIDname

  //Get the other features that this DTXCID is a candidate for 
  const featureArray = fullData.filter(d => d.DTXCID_INDIVIDUAL_COMPONENT === DTXCIDname).map(d => d["Feature ID"])
  more_features_as_text = featureArray.join(", ")
  more_features.nodeValue = `Candidate for feature(s): ${more_features_as_text}`

  previousClickedDTXCID = clickedDTXCID
  clickedDTXCID = DTXCIDname
  imageDiv.removeChild(image)
  imageDiv.appendChild(getImage(DTXCIDname))

  if (previousClickedDTXCID == clickedDTXCID){
    fieldList.forEach(key =>{
    let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
    IdToHighlight.setAttribute("fill", "red");
    IdToHighlight.style.fontWeight = "bold";
    if (!isElementVisibleInScrollContainer(document.getElementById(`ylabel-${DTXCIDname}-${key}`), document.getElementById(`tripod-chart-${key}`))){
        document.getElementById(`ylabel-${DTXCIDname}-${key}`).scrollIntoView({behavior: "smooth", block: "nearest"})
      }})
    return}

  else {
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
      if (!isElementVisibleInScrollContainer(document.getElementById(`ylabel-${DTXCIDname}-${key}`), document.getElementById(`tripod-chart-${key}`))){
        document.getElementById(`ylabel-${DTXCIDname}-${key}`).scrollIntoView({behavior: "smooth", block: "nearest"})
      }
      if (previousClickedDTXCID)  {
        try {
          let IdToHighlight2 = document.getElementById(`ylabel-${previousClickedDTXCID}-${key}`);
          IdToHighlight2.setAttribute("fill", "black");
          IdToHighlight2.style.fontWeight = "normal";}
        catch{return}}
  })}
}


var imageY = null
var imageDivY = null

// On-Hover functions for Y-axis
var mousemoveYlabel = function(event) {
structureToolTip
  .style("display", "block")

tooltipYlabel
  .style("left", (event.pageX + 20) + "px")
  .style("top", (event.pageY - window.pageYOffset + 10) + "px")
  .style("display", "block")
}
var mouseoverYlabel = function(d) {
  d3.select(this).style("cursor", "pointer")
  var DTXCIDname = d3.select(this)['_groups'][0][0].querySelector('text').innerHTML

  function getImageY(){
    imageY = document.createElement('img');
    imageY.src = structureImageURL + DTXCIDname
    imageY.style = "width:90px;height:90px;padding-top:2px;padding-bottom:2px;";
    imageY.alt = `Structure image for ${DTXCIDname}`
    return imageY
}
  imageDivY = document.getElementById("tripod-yAxisToolTip")
  imageDivY.appendChild(getImageY())

  //Make the corresponding y-axis label red
  fieldList.forEach(key =>{
    let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
    IdToHighlight.setAttribute("fill", "#FF13F0");
    IdToHighlight.style.fontWeight = "bold";
  })  
}
var mouseleaveYlabel = function() {
  tooltipYlabel
    .style("display", "none");

  imageDivY.removeChild(imageY)

  var DTXCIDname = d3.select(this)['_groups'][0][0].querySelector('text').innerHTML

    if (DTXCIDname != clickedDTXCID)
      {fieldList.forEach(key =>{
        let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`)
        IdToHighlight.setAttribute("fill", "black");
        IdToHighlight.style.fontWeight = "normal";
      })}  

    else {fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`)
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
    })}  
}

// colors for metadata subgroups
const stackColors = ['#E9B0C8', '#6E1E3A', '#FADD8B' ,  '#274F8B', '#C9D763', '#E3917B', '#25533F',  '#A4BDE0']

// Assign colors to each metadata group
const color = d3.scaleOrdinal()
  //.domain(groups)
  .range(stackColors);

//Create Interactive Metadata Legend
function makeLegend(){
  const legendData = d3.stack()
    .keys(keysToInclude)(subGroupData).sort((a, b) => a.key.localeCompare(b.key));    
// Add the legend  
  const legendsvg = makeSvgElement(800, 200, 'metadata-legendbox', d3.select("#metadata-legend"));
  legendsvg.attr('id', 'metadata-legendbox')
  var legend = legendsvg.append('g')
    .attr('class', 'metadata-legend')
    .attr('transform', 'translate(-25, 65)')
    .selectAll('rect')
    .data(legendData)
    .enter()
  legend.append('rect')
    .attr("id", (d, i) => "metadata-square" + i)
    .attr('y', function(d,i){
      if (i < 4){return i * 26}
      else {return (i-4) * 26}
      })
    .attr('x', function(d,i){
        if (i > 3)
        return 205;})
    .attr('width', 16)
    .attr('height', 16)
    .attr('fill', function(d,i){return color(i);})

//re-sort the bars from higest to lowest total normalized score
function reSortData(data, headers) {
  let newData = data;
  for (let i = 0; i < newData.length; i++) { //for each row in the array
    let scoreSum = 0;
    for (let j = 0; j < headers.length; j++){
        scoreSum += newData[i][headers[j] + '_original']; 
      }
      newData[i]['scoreSum'] = scoreSum;
  }

  newData.sort((a, b) => b["scoreSum"] - a["scoreSum"])

  if (metaInput.checked){
    document.getElementById("tripod-ylabel-meta").remove()
    yAxisMeta(newData)
  }

  if (hazardInput.checked){
    document.getElementById("tripod-ylabel-hazard").remove()
    yAxisHazard(newData)
  }

  if (hasMS2 && MS2Input.checked){
    document.getElementById("tripod-ylabel-MS2").remove()
    yAxisMS2(newData)
  }

  return newData;
}

var legendClick = function(event, d, i) {
    const currentDecoration = d3.select(this).style("text-decoration");
    var currentIndex = d3.select(this)["_groups"][0][0]["id"].slice(-1)

    const allKeys = [ 
      "Structure_AMOS fact sheets count_norm", 
      "Structure_AMOS methods count_norm", 
      "Structure_AMOS spectra count_norm",
      "PUBMED_COUNT_COLLAPSED_NORM",
      "LITERATURE_COUNT_COLLAPSED_NORM", 
      "PATENT_COUNT_COLLAPSED_NORM",
      "SOURCE_COUNT_COLLAPSED_NORM", 
      "Structure_Presence in water lists count_norm",
    ]

    if (currentDecoration === "line-through") { //If the text is already lined out....
      d3.select(this).style("text-decoration", "none"); //Remove the line from the text
      document.getElementById("metadata-square" + currentIndex).style.fill = stackColors[currentIndex] //white-out the color square
      showKeys.push(allKeys[currentIndex]); //Add the selected metadata to the showKeys list
      removedKeys = removedKeys.filter(item => item !== allKeys[currentIndex]); //removed the key from the removed keys list

      showKeys.sort((a, b) => {return allKeys.indexOf(a) - allKeys.indexOf(b);})
      
      let newData = reSortData(subGroupData, showKeys); //re-sort the data and y-axis

      if (metaInput.checked){
        meta_bars.remove(); //remove all bars 
        showBarsMetadata(showKeys, newData);
      }
    
      if (hazardInput.checked){
        hazard_bars.remove(); //remove all bars
        showBarsHazard(newData)
      }
    
      if (hasMS2 && MS2Input.checked){
        MS2_bars.remove()
        showBarsMS2(newData)
      }
    }
    else {
      d3.select(this).style("text-decoration", "line-through"); //Line-out the text
      document.getElementById("metadata-square" + currentIndex).style.fill = "white" //white-out the color square
      removedKeys.push(allKeys[currentIndex]); // adds the key to the removed keys list
      showKeys = showKeys.filter(item => item !== allKeys[currentIndex]); //Remove the selected metadata from showKeys list
      let newData = reSortData(subGroupData, showKeys); //re-sort the data and y-axis

      if (metaInput.checked){
        meta_bars.remove(); //remove all bars 
        showBarsMetadata(showKeys, newData);
      }
    
      if (hazardInput.checked){
        hazard_bars.remove(); //remove all bars
        showBarsHazard(newData)
      }
    
      if (hasMS2 && MS2Input.checked){
        MS2_bars.remove()
        showBarsMS2(newData)
      }
    }
    
  }

  legendText = ["AMOS Fact Sheets","AMOS Methods","AMOS Spectra","PubMed Articles", "PubChem Articles","PubChem Patents","PubChem Sources", "Dashboard Water Lists"]

  legend.select('g')
  .data(legendData)
  .enter()
  .append('text')
  .text(function(d, i){return legendText[i];})
  .attr('y', function(d, i){
    if (i < 4){return i * 26}
    else {return (i-4) * 26}
    })
  .attr('x', function(d, i){
      if (i > 3)
      return 205;})
  .attr('alignment-baseline', 'hanging')  
  .attr('transform', 'translate(22,0)')  
  .attr("id", (d, i) => "metadata-legendText" + i)
  .style("font-size", "22px")
  .on("mouseover", function() {d3.select(this).style("cursor", "pointer");})
  .on("click", legendClick);
}

function makeTitleStatic(){
  const titlesvg = makeSvgElement(500, 20, 'tripod-title', d3.select("#tripod-title-static"));
  titlesvg.append("rect") 
    .attr("width", 1610)
    .attr("height", 50)
    .attr("rx", 10)
    .attr("x", -19)
    .attr("y", -10)
    .attr("fill", "#DBE4F0") //light blue grey
    .style("stroke", "#808080")
    .attr("z-index", -1)

  // Sub-title
  titlesvg.append("rect") 
    .attr("width", 537)
    .attr("height", 40)
    .attr("x", -19)
    .attr("y", 30)
    .attr("fill", "#DBE4F0") //light blue grey
    .style("stroke", "#808080")
    .attr("z-index", -1)

  titlesvg.append("text")  
    .attr("x", 0)
    .attr("y", 60)
    .attr("text-anchor", "left")
    .style("font-size", "22px")
    .style("font-weight", "bold")
    .text(`MS2`);  

  if (hasMS2){
  titlesvg.append("text")  
    .attr("x", 346)
    .attr("y", 55)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .text(`Select plot to sort`); }

  titlesvg.append("rect") 
    .attr("width", 536)
    .attr("height", 40)
    .attr("x", 519)
    .attr("y", 30)
    .attr("fill", "#DBE4F0") //light blue grey
    .style("stroke", "#808080")
    .attr("z-index", -1)

  titlesvg.append("text")  
    .attr("x", 535)
    .attr("y", 60)
    .attr("text-anchor", "left")
    .style("font-size", "22px")
    .style("font-weight", "bold")
    .text(`Metadata`);  

  titlesvg.append("text")  
    .attr("x", 880)
    .attr("y", 55)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .text(`Select plot to sort`); 

  titlesvg.append("rect") 
    .attr("width", 536)
    .attr("height", 40)
    .attr("x", 1055)
    .attr("y", 30)
    .attr("fill", "#DBE4F0") //light blue grey
    .style("stroke", "#808080")
    .attr("z-index", -1)

  titlesvg.append("text")  
    .attr("x", 1070)
    .attr("y", 60)
    .attr("text-anchor", "left")
    .style("font-size", "22px")
    .style("font-weight", "bold")
    .text(`Hazard`);  

  titlesvg.append("text")  
    .attr("x", 1418)
    .attr("y", 55)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .text(`Select plot to sort`); 

  titlesvg.append("text") 
    .attr("x", 850)
    .attr("y", 18)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .text(`# total candidates:          # removed (no metadata): `)  

}
makeTitleStatic()



function loadData(data){
// create svg for visualization
  const width = 500;
  height = subGroupData.length * 30;

// Create a tooltip for the stacked bars -----------------------------------------------------------------
  var tooltipBarMeta = d3.select("#tripod-chart-meta")
    .append("div")
    .style("display", "none")
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("position", "fixed")
    .attr("id", "tripod-tooltipbar");

    if (hasMS2){
    var tooltipBarMS2 = d3.select("#tripod-chart-MS2")
    .append("div")
    .style("display", "none")
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("position", "fixed")
    .attr("id", "tripod-tooltipbar");}

    var tooltipBarHazard = d3.select("#tripod-chart-hazard")
    .append("div")
    .style("display", "none")
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("position", "fixed")
    .attr("id", "tripod-tooltipbar");

  // Hover functions for Metadata bars
  var mouseoverBarMeta = function(d) {
    var categoryName = d3.select(this.parentNode).datum().key;
    let wordsList = categoryName.split("_");

    var labelName = null
    if (categoryName.includes("fact")){
      labelName = "AMOS Fact Sheets"
      let catName = wordsList[1];
      var categoryValue = d.srcElement.__data__.data["Structure_" +catName];
    }
    else if (categoryName.includes("methods")){
      labelName = "AMOS Methods"
      let catName = wordsList[1];
      var categoryValue = d.srcElement.__data__.data["Structure_" +catName];
    }
    else if (categoryName.includes("spectra")){
      labelName = "AMOS Spectra"
      let catName = wordsList[1];
      var categoryValue = d.srcElement.__data__.data["Structure_" +catName];
    }
    else if (categoryName.includes("LITERATURE")){
      labelName = "PubChem Articles"
      let catName = wordsList[0];
      var categoryValue = d.srcElement.__data__.data[catName + "_COUNT_COLLAPSED"];
    }
    else if (categoryName.includes("PATENT")){
      labelName = "PubChem Patents"
      let catName = wordsList[0];
      var categoryValue = d.srcElement.__data__.data[catName + "_COUNT_COLLAPSED"];
    }
    else if (categoryName.includes("water")){
      labelName = "Dashboard Water Lists"
      let catName = wordsList[1];
      var categoryValue = d.srcElement.__data__.data["Structure_" +catName];
    }
    else if (categoryName.includes("PUBMED")){
      labelName = "PubMed Articles"
      let catName = wordsList[0];
      var categoryValue = d.srcElement.__data__.data[catName + "_COUNT_COLLAPSED"];
    }
    else if (categoryName.includes("SOURCE")){
      labelName = "PubChem Sources"
      let catName = wordsList[0];
      var categoryValue = d.srcElement.__data__.data[catName + "_COUNT_COLLAPSED"];
    }


    tooltipBarMeta
        .html(labelName + ": " + categoryValue)
        .style("opacity", 1)

    // Make the corresponding y-axis label red
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["data"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`);
      IdToHighlight.setAttribute("fill", "#FF13F0");
      IdToHighlight.style.fontWeight = "bold";})

  }
  var mousemoveBarMeta = function(event) {
    tooltipBarMeta
      .style("left", (event.pageX + 20) + "px")
      .style("top", (event.pageY - window.pageYOffset + 10) + "px")
      .style("display", "block")
  }
  var mouseleaveBarMeta = function() {
    tooltipBarMeta
      .style("display", "none");

    if (clickedDTXCID != d3.select(this)._groups[0][0]["__data__"]["data"]["DTXCID_INDIVIDUAL_COMPONENT"])
      {fieldList.forEach(key =>{
        let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["data"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`)
        IdToHighlight.setAttribute("fill", "black");
        IdToHighlight.style.fontWeight = "normal";
    })} 
    else {fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["data"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`)
      IdToHighlight.setAttribute("fill", "red");
      IdToHighlight.style.fontWeight = "bold";
    })}  
  }

  // Hover functions for MS2 bars
  var mouseoverBarMS2 = function(d) {
    var MS2Score = d3.select(this)._groups[0][0]["__data__"]["MS2 quotient score"];
    tooltipBarMS2
      .html("MS2 Score: " + MS2Score)
      .style("opacity", 1)

    // Make the corresponding y-axis label red
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`)
      IdToHighlight.setAttribute("fill", "#FF13F0");
      IdToHighlight.style.fontWeight = "bold";
    })  

  }
  var mousemoveBarMS2 = function(event) {
    tooltipBarMS2
      .style("left", (event.pageX + 20) + "px")
      .style("top", (event.pageY - window.pageYOffset + 10) + "px")
      .style("display", "block")
  }
  var mouseleaveBarMS2Hazard = function() {
    if (hasMS2){tooltipBarMS2.style("display", "none");}
    tooltipBarHazard.style("display", "none");  

  // Make the corresponding y-axis label black again
  if (clickedDTXCID != d3.select(this)._groups[0][0]["__data__"]["DTXCID_INDIVIDUAL_COMPONENT"])
    {fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`)
      IdToHighlight.setAttribute("fill", "black");
      IdToHighlight.style.fontWeight = "normal";
    })}  
  else {fieldList.forEach(key =>{
    let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`)
    IdToHighlight.setAttribute("fill", "red");
    IdToHighlight.style.fontWeight = "bold";
    })}  
  }

  // Hover functions for Hazard bars
  var mouseoverBarHazard = function(d) {
    var HScore = d3.select(this)._groups[0][0]["__data__"]["Hazard Score"];
    var HCompScore = d3.select(this)._groups[0][0]["__data__"]["Hazard Completeness Score"];
    tooltipBarHazard
      .html("Hazard Score: " + HScore + "<br>" + "Hazard Completeness Score: " + HCompScore)
      .style("opacity", 1)

    // Make the corresponding y-axis label red
    fieldList.forEach(key =>{
      let IdToHighlight = document.getElementById(`ylabel-${d3.select(this)._groups[0][0]["__data__"]["DTXCID_INDIVIDUAL_COMPONENT"]}-${key}`)
      IdToHighlight.setAttribute("fill", "#FF13F0");
      IdToHighlight.style.fontWeight = "bold";
    })  
  }
  var mousemoveBarHazard = function(event) {
    tooltipBarHazard
      .style("left", (event.pageX + 20) + "px")
      .style("top", (event.pageY - window.pageYOffset + 10) + "px")
      .style("display", "block")
  }

//Display bar functions for all three plots 
showBarsMetadata = function(keys2Include, data){
  let stackedData = d3.stack().keys(keys2Include)(data);
  barGroup = svgMeta.append("g").selectAll("g").data(stackedData)
  // Enter in the stack data = loop key per key = group per group
  meta_bars = barGroup.join("g")
  .attr("fill", d => color(d.key))
  .selectAll("rect")
  // enter a second time = loop subgroup per subgroup to add all rectangles
  .data(d => {return d})
  .join("rect")
    .attr("y", d => yMeta(d.data.DTXCID_INDIVIDUAL_COMPONENT))
    .attr("x", d => xMeta(d[0]))
    .attr("transform", `translate(137, 20)`)
    .attr("width", d => xMeta(d[1]) - xMeta(d[0]))
    .attr("height", yMeta.bandwidth())
    .on("mouseover", mouseoverBarMeta)
    .on("mousemove", mousemoveBarMeta)
    .on("mouseleave", mouseleaveBarMeta)
    .on("click", barClickMeta)

}
showBarsHazard = function(data){
  svgHazard.append("g");
  hazard_bars = svgHazard.selectAll(".bar")
  .data(data)
  .enter().append("rect").attr("fill", "red").attr("opacity", d => d["Hazard Completeness Score"])
  .attr("transform", `translate(137, 20)`)
  .attr("class", "hazard-bar")
  .attr("y", d => yHazard(d.DTXCID_INDIVIDUAL_COMPONENT))
  .attr("x", 0)
  .attr("width", d => xHazard(d["Hazard Score"]))
  .attr("height", yHazard.bandwidth())
  .on("mouseover", mouseoverBarHazard)
  .on("mousemove", mousemoveBarHazard)
  .on("mouseleave", mouseleaveBarMS2Hazard)
  .on("click", barClickMS2Hazard);

}
showBarsMS2 = function(data){
  svgMS2.append("g");
  MS2_bars = svgMS2.selectAll(".bar")
  .data(data)
  .enter().append("rect").attr("fill", "#93AEC5")
  .attr("transform", `translate(137, 20)`)
  .attr("class", "MS2-bar")
  .attr("y", d => yMS2(d.DTXCID_INDIVIDUAL_COMPONENT))
  .attr("x", 0)
  .attr("width", d => xMS2(d["MS2 quotient score"]))
  .attr("height", yMS2.bandwidth())
  .on("mouseover", mouseoverBarMS2)
  .on("mousemove", mousemoveBarMS2)
  .on("mouseleave", mouseleaveBarMS2Hazard)
  .on("click", barClickMS2Hazard);

}

if (metaInput.checked){
  svgMeta = makeSvgElement(width, height + 20, "tripod-vis", d3.select("#tripod-chart-meta"));
  yAxisMeta(subGroupData);
  showBarsMetadata(showKeys, subGroupData);
}

if (hazardInput.checked){
  svgHazard = makeSvgElement(width, height + 20, "tripod-vis", d3.select("#tripod-chart-hazard"));
  yAxisHazard(subGroupData);
  showBarsHazard(subGroupData);
}

if (hasMS2 && MS2Input.checked){
  svgMS2 = makeSvgElement(width, height + 20, "tripod-vis", d3.select("#tripod-chart-MS2"));
  yAxisMS2(subGroupData);
  showBarsMS2(subGroupData);
}

//Add the title
function makeTitle(){
  const titlesvg = makeSvgElement(width, 20, 'tripod-title', d3.select("#tripod-title"));

  titlesvg.append("text")  
    .attr("x", 0)
    .attr("y", 18)
    .attr("text-anchor", "left")
    .style("font-size", "22px")
    .style("font-weight", "bold")
    .text(`Feature ${selectedFeature}`);  

  titlesvg.append("text")  
    .attr("x", 1000)
    .attr("y", 19)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text(`${totalCandidates}`);  

  titlesvg.append("text")  
    .attr("x", 1250)
    .attr("y", 19)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text(` ${numCandidatesRemoved}`); 

  titlesvg.append("text") 
    .attr("x", 138)
    .attr("y", 18)
    .attr("text-anchor", "left")
    .style("font-size", "20px")
    .text(`Mass: ${mass}    RT: ${RT}          Median Abundance: ${abundance}    Occurrence: ${occ_percentage}%`) 
}

makeTitle()    
}

function createInfoTooltip(){
  tooltipInfo = d3.select("#tripod-i")
    .append("div")
    .style("display", "none")
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("position", "fixed")
    .style("max-width", "200px")
    .attr("id", "tripod-InfoTooltip"); 

  const infosvg = makeSvgElement(64, 20, 'tripod-info', d3.select("#tripod-i"));  
    backgroundCircle = infosvg.append('circle')
    backgroundCircle.attr("r", "11")
    backgroundCircle.attr("cx", "144")
    backgroundCircle.attr("cy", "50")
    backgroundCircle.attr('fill', '#DBE4F0')
    backgroundCircle.on("mouseover", infoCircleMouseover)
    backgroundCircle.on("mousemove", infoCircleMousemove)
    backgroundCircle.on("mouseout", infoCircleMouseout)
  
    infoCircle = infosvg.append('path')
    infoCircle.attr("d", "M960 0c530.193 0 960 429.807 960 960s-429.807 960-960 960S0 1490.193 0 960 429.807 0 960 0Zm0 101.053c-474.384 0-858.947 384.563-858.947 858.947S485.616 1818.947 960 1818.947 1818.947 1434.384 1818.947 960 1434.384 101.053 960 101.053Zm-42.074 626.795c-85.075 39.632-157.432 107.975-229.844 207.898-10.327 14.249-10.744 22.907-.135 30.565 7.458 5.384 11.792 3.662 22.656-7.928 1.453-1.562 1.453-1.562 2.94-3.174 9.391-10.17 16.956-18.8 33.115-37.565 53.392-62.005 79.472-87.526 120.003-110.867 35.075-20.198 65.9 9.485 60.03 47.471-1.647 10.664-4.483 18.534-11.791 35.432-2.907 6.722-4.133 9.646-5.496 13.23-13.173 34.63-24.269 63.518-47.519 123.85l-1.112 2.886c-7.03 18.242-7.03 18.242-14.053 36.48-30.45 79.138-48.927 127.666-67.991 178.988l-1.118 3.008a10180.575 10180.575 0 0 0-10.189 27.469c-21.844 59.238-34.337 97.729-43.838 138.668-1.484 6.37-1.484 6.37-2.988 12.845-5.353 23.158-8.218 38.081-9.82 53.42-2.77 26.522-.543 48.24 7.792 66.493 9.432 20.655 29.697 35.43 52.819 38.786 38.518 5.592 75.683 5.194 107.515-2.048 17.914-4.073 35.638-9.405 53.03-15.942 50.352-18.932 98.861-48.472 145.846-87.52 41.11-34.26 80.008-76 120.788-127.872 3.555-4.492 3.555-4.492 7.098-8.976 12.318-15.707 18.352-25.908 20.605-36.683 2.45-11.698-7.439-23.554-15.343-19.587-3.907 1.96-7.993 6.018-14.22 13.872-4.454 5.715-6.875 8.77-9.298 11.514-9.671 10.95-19.883 22.157-30.947 33.998-18.241 19.513-36.775 38.608-63.656 65.789-13.69 13.844-30.908 25.947-49.42 35.046-29.63 14.559-56.358-3.792-53.148-36.635 2.118-21.681 7.37-44.096 15.224-65.767 17.156-47.367 31.183-85.659 62.216-170.048 13.459-36.6 19.27-52.41 26.528-72.201 21.518-58.652 38.696-105.868 55.04-151.425 20.19-56.275 31.596-98.224 36.877-141.543 3.987-32.673-5.103-63.922-25.834-85.405-22.986-23.816-55.68-34.787-96.399-34.305-45.053.535-97.607 15.256-145.963 37.783Zm308.381-388.422c-80.963-31.5-178.114 22.616-194.382 108.33-11.795 62.124 11.412 115.76 58.78 138.225 93.898 44.531 206.587-26.823 206.592-130.826.005-57.855-24.705-97.718-70.99-115.729Z")
    infoCircle.attr("viewBox", "0 0 1920 1920")
    infoCircle.attr("width", "64px")
    infoCircle.attr("height", "64px")
    infoCircle.attr('transform', 'translate(133, 37.5) scale(0.012) ')
    infoCircle.on("mouseover", infoCircleMouseover)
    infoCircle.on("mousemove", infoCircleMousemove)
    infoCircle.on("mouseout", infoCircleMouseout)
  
  function infoCircleMouseover()  {
    backgroundCircle.attr('fill', '#3d4e634d')
    tooltipInfo = d3.select("#tripod-InfoTooltip")
    tooltipInfo
      .html("Each metadata bar segment is normalized to a value between 0 and 1 based on the highest value among all DTXCIDs for a given feature, with a minimum bar width of 0.05.")
      .style("opacity", 1)
    }
  
  function infoCircleMousemove(event)  {
    tooltipInfo = d3.select("#tripod-InfoTooltip")
    tooltipInfo
      .style("left", (event.pageX + 20) + "px")
      .style("top", (event.pageY - window.pageYOffset + 10) + "px")
      .style("display", "block")
    }  
  
  function infoCircleMouseout()  {
    backgroundCircle.attr('fill', '#DBE4F0')
    tooltipInfo = d3.select("#tripod-InfoTooltip")
    tooltipInfo.style("display", "none")
      }
  }
createInfoTooltip()

function makeLargeGrid(){
  var gridData = null
  //Check status of the toggle button
  if (showingTop5) {gridData = top5groups;} 
  else {gridData = cleanData(fullData, keysToKeep);}

  gridData = gridData.sort(function(a, b){return a["Feature ID"] - b["Feature ID"]})

  var columnDefs = [
    {headerName: "", 
      children: [
        {field: 'Feature ID', filter: 'agNumberColumnFilter', floatingFilter: true, width: 90, sortingOrder: ['desc', 'asc', null]},
        {field: 'Structure', autoHeight: true, width: 100,
        cellRenderer: params => {
          try {
            var image = document.createElement('img');
            image.src = structureImageURL + params.data.DTXCID_INDIVIDUAL_COMPONENT
          
            image.style = "width:80px;height:80px;padding-top:2px;padding-bottom:2px;";
            image.alt = `Structure image for ${params.data.DTXCID_INDIVIDUAL_COMPONENT}`
            return image;
          } 
          catch (error) {
            var p = document.createElement('div')
            p.style = "width:70px;height:70px;padding-top:2px;padding-bottom:2px;text-align: center; line-height: 70px;";
            p.innerText = "No structure."
            return p
          }
        }
        },
        {headerName: "DTXCID", field: 'DTXCID_INDIVIDUAL_COMPONENT', filter: 'agTextColumnFilter', floatingFilter: true, width: 120, sortingOrder: ['desc', 'asc', null], 
          cellRenderer: params => {
          return "<a href='" + comptoxURL + params.data.DTXCID_INDIVIDUAL_COMPONENT + "' target='_blank'>" + params.data.DTXCID_INDIVIDUAL_COMPONENT + "</a>"
          }
        },
      ]},
      {headerName: "Metadata", 
        openByDefault: true,
        children: [
          {columnGroupShow: "closed", headerName: "Metadata Score", field: 'STRUCTURE_TOTAL_NORM', floatingFilter: true, filter: 'agNumberColumnFilter', width: 200, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "Metadata Score", field: 'STRUCTURE_TOTAL_NORM', floatingFilter: true, filter: 'agNumberColumnFilter', width: 140, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "AMOS Fact Sheets", field: 'Structure_AMOS fact sheets count', floatingFilter: true, filter: 'agNumberColumnFilter', width: 150, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "AMOS Methods", field: 'Structure_AMOS methods count', floatingFilter: true, filter: 'agNumberColumnFilter', width: 130, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "AMOS Spectra", field: 'Structure_AMOS spectra count', floatingFilter: true, filter: 'agNumberColumnFilter', width: 130, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "PubMed Articles", field: 'PUBMED_COUNT_COLLAPSED', floatingFilter: true, filter: 'agNumberColumnFilter', width: 150, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "PubChem Articles", field: 'LITERATURE_COUNT_COLLAPSED', floatingFilter: true, filter: 'agNumberColumnFilter', width: 150, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "PubChem Patents", field: 'PATENT_COUNT_COLLAPSED', floatingFilter: true, filter: 'agNumberColumnFilter', width: 150, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "PubChem Sources", field: 'SOURCE_COUNT_COLLAPSED', floatingFilter: true, filter: 'agNumberColumnFilter', width: 150, sortingOrder: ['desc', 'asc', null]},
          {columnGroupShow: "open", headerName: "Dashboard Water Lists", field: 'Structure_Presence in water lists count', floatingFilter: true, filter: 'agNumberColumnFilter', width: 175, sortingOrder: ['desc', 'asc', null]},
        ]
      },    
    {headerName: "MS2", children: [{headerName: 'MS2 Score', 
      field: 'MS2 quotient score', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null], 
      valueGetter: (params) => {return params.data?.["MS2 quotient score"] ?? 'N/A'}
    }]},
    {headerName: "Hazard", 
      children: [
        {columnGroupShow: "closed", headerName: "Hazard Score", field: 'Hazard Score', floatingFilter: true, filter: 'agNumberColumnFilter', width: 140, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "closed", headerName: "Hazard Completeness Score", field: 'Hazard Completeness Score', floatingFilter: true, filter: 'agNumberColumnFilter', width: 210, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Hazard Score", field: 'Hazard Score', floatingFilter: true, filter: 'agNumberColumnFilter', width: 150, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Hazard Completeness Score", field: 'Hazard Completeness Score', floatingFilter: true, filter: 'agNumberColumnFilter', width: 200, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Aquatic Toxicity Authority", field: 'Acute Aquatic Toxicity_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Aquatic Toxicity Score", field: 'Acute Aquatic Toxicity_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Mammalian Toxicity Dermal Authority", field: 'Acute Mammalian Toxicity Dermal_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Mammalian Toxicity Dermal Score", field: 'Acute Mammalian Toxicity Dermal_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Mammalian Toxicity Inhalation Authority", field: 'Acute Mammalian Toxicity Inhalation_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Mammalian Toxicity Inhalation Score", field: 'Acute Mammalian Toxicity Inhalation_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Mammalian Toxicity Oral Authority", field: 'Acute Mammalian Toxicity Oral_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Acute Mammalian Toxicity Oral Score", field: 'Acute Mammalian Toxicity Oral_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Bioaccumulation Authority", field: 'Bioaccumulation_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Bioaccumulation Score", field: 'Bioaccumulation_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Carcinogenicity Authority", field: 'Carcinogenicity_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Carcinogenicity Score", field: 'Carcinogenicity_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Chronic Aquatic Toxicity Authority", field: 'Chronic Aquatic Toxicity_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Chronic Aquatic Toxicity Score", field: 'Chronic Aquatic Toxicity_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Developmental Authority", field: 'Developmental_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Developmental Score", field: 'Developmental_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Endocrine Disruption Authority", field: 'Endocrine Disruption_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Endocrine Disruption Score", field: 'Endocrine Disruption_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Exposure Authority", field: 'Exposure_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Exposure Score", field: 'Exposure_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Eye Irritation Authority", field: 'Eye Irritation_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Eye Irritation Score", field: 'Eye Irritation_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Genotoxicity Mutagenicity Authority", field: 'Genotoxicity Mutagenicity_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Genotoxicity Mutagenicity Score", field: 'Genotoxicity Mutagenicity_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Neurotoxicity Repeat Exposure Authority", field: 'Neurotoxicity Repeat Exposure_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Neurotoxicity Repeat Exposure Score", field: 'Neurotoxicity Repeat Exposure_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Neurotoxicity Single Exposure Authority", field: 'Neurotoxicity Single Exposure_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Neurotoxicity Single Exposure Score", field: 'Neurotoxicity Single Exposure_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Persistence Authority", field: 'Persistence_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Persistence Score", field: 'Persistence_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Reproductive Authority", field: 'Reproductive_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Reproductive Score", field: 'Reproductive_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Skin Irritation Authority", field: 'Skin Irritation_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Skin Irritation Toxicity Score", field: 'Skin Irritation_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Skin Sensitization Authority", field: 'Skin Sensitization_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Skin Sensitization Score", field: 'Skin Sensitization_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Systemic Toxicity Repeat Exposure Authority", field: 'Systemic Toxicity Repeat Exposure_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Systemic Toxicity Repeat Exposure Score", field: 'Systemic Toxicity Repeat Exposure_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Systemic Toxicity Single Exposure Authority", field: 'Systemic Toxicity Single Exposure_authority_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
        {columnGroupShow: "open", headerName: "Systemic Toxicity Single Exposurey Score", field: 'Systemic Toxicity Single Exposure_score_mapped', floatingFilter: true, filter: 'agNumberColumnFilter', width: 100, sortingOrder: ['desc', 'asc', null]},
      ]
    }
  ];
  
  // var featureData = data
  var featureData = gridData

  var gridOptions = {
    columnDefs: columnDefs,
    rowData: featureData, 
    onGridReady: (event) => {window.gridAPI = event.api}, // Get the grid API functions
    onFilterChanged: (event) => onGridFilter(),
    onSortChanged: (event) => onGridSort(),
    onRowClicked: function(event) {
      if (!event.event.target.toString().includes("https")){

        selectedFeature = event.data["Feature ID"]

        gridUpdated = false

        metaInput.checked = true;
        hazardInput.checked = false;
        if (hasMS2){MS2Input.checked = false;}

        document.getElementById('tripod-chart-meta').innerHTML= ""
        document.getElementById('tripod-title').innerHTML= ""
        updateData("STRUCTURE_TOTAL_NORM")
        loadData(data)

        metaInput.checked = false;
        hazardInput.checked = true;
        document.getElementById('tripod-chart-hazard').innerHTML= ""
        document.getElementById('tripod-title').innerHTML= ""
        updateData("Hazard Score")
        loadData(data)

        if (hasMS2){
        hazardInput.checked = false;
        MS2Input.checked = true
        document.getElementById('tripod-chart-MS2').innerHTML= ""
        document.getElementById('tripod-title').innerHTML= ""
        updateData("MS2 quotient score")
        loadData(data)}
        
        document.getElementById("tripod-yAxisToolTip").remove()
        createYToolTip()

        metaInput.checked = true
        hazardInput.checked = true

        // highlight the selected DTXCID on the y-axis labels
        var DTXCIDname = event.data["DTXCID_INDIVIDUAL_COMPONENT"]
        structure_label.nodeValue = DTXCIDname

        //Get the other features that this DTXCID is a candidate for 
        const featureArray = fullData.filter(d => d.DTXCID_INDIVIDUAL_COMPONENT === DTXCIDname).map(d => d["Feature ID"])
        more_features_as_text = featureArray.join(", ")
        more_features.nodeValue = `Candidate for feature(s): ${more_features_as_text}`

        previousClickedDTXCID = clickedDTXCID
        clickedDTXCID = DTXCIDname
        imageDiv.removeChild(image)
        imageDiv.appendChild(getImage(DTXCIDname))
      
        if (previousClickedDTXCID == clickedDTXCID){
          fieldList.forEach(key =>{
            let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
            IdToHighlight.setAttribute("fill", "red");
            IdToHighlight.style.fontWeight = "bold";
            })
          return}
      
        else {
          fieldList.forEach(key =>{
            let IdToHighlight = document.getElementById(`ylabel-${DTXCIDname}-${key}`);
            IdToHighlight.setAttribute("fill", "red");
            IdToHighlight.style.fontWeight = "bold";
          
            if (previousClickedDTXCID)  {
              try {
                let IdToHighlight2 = document.getElementById(`ylabel-${previousClickedDTXCID}-${key}`);
                IdToHighlight2.setAttribute("fill", "black");
                IdToHighlight2.style.fontWeight = "normal";}
              catch{return}}
        })} 

        // // When a row is clicked, the AG grid will filter to only show that feature. Perhaps add this later? Not sure if it would be useful. 
        // window.gridAPI.setFilterModel({
        //   "Feature ID": {
        //     type: "equals", 
        //     filter: event.data["Feature ID"]
        //   }
        // })
        // window.gridAPI.onFilterChanged()


      }
    },
  }

  var eGridDiv = document.querySelector('#tripod-grid')
  new agGrid.createGrid(eGridDiv, gridOptions);

  function onGridSort(){
    gridUpdated = true
    dataset = []
    window.gridAPI.forEachNodeAfterFilterAndSort((rowNode, index) => {
      if (rowNode.data["Feature ID"] == selectedFeature){
      dataset.push(rowNode.data)}
    })
    dataFromGrid = sortData(dataset);

    if (metaInput.checked){document.getElementById('tripod-chart-meta').innerHTML= ""}
    if (hazardInput.checked){document.getElementById('tripod-chart-hazard').innerHTML= ""}
    if (hasMS2 && MS2Input.checked){document.getElementById('tripod-chart-MS2').innerHTML= ""}

    document.getElementById("tripod-yAxisToolTip").remove()
    createYToolTip()

    document.getElementById('tripod-title').innerHTML= ""
    updateData("STRUCTURE_TOTAL_NORM")
    loadData(data)
  
    // highlight the y-axis label after sorting. 
    if (clickedDTXCID){
      fieldList.forEach(key =>{
        let IdToHighlight = document.getElementById(`ylabel-${clickedDTXCID}-${key}`);
        IdToHighlight.setAttribute("fill", "red");
        IdToHighlight.style.fontWeight = "bold";
        })}

  }

  function onGridFilter(){
    gridUpdated = true
    dataset = []
    window.gridAPI.forEachNodeAfterFilterAndSort((rowNode, index) => {
      if (rowNode.data["Feature ID"] == selectedFeature){
      dataset.push(rowNode.data)}
    })
    dataFromGrid = sortData(dataset);

    let originallyCheckedMeta = metaInput.checked
    if (hasMS2){let originallyCheckedMS2 = MS2Input.checked}
    let originallyCheckedHazard = hazardInput.checked

    metaInput.checked = true
    if (hasMS2){MS2Input.checked = true}
    hazardInput.checked = true

    document.getElementById('tripod-chart-meta').innerHTML= ""
    document.getElementById('tripod-chart-hazard').innerHTML= ""
    if (hasMS2){document.getElementById('tripod-chart-MS2').innerHTML= ""}

    document.getElementById("tripod-yAxisToolTip").remove()
    createYToolTip()

    document.getElementById('tripod-title').innerHTML= ""
    updateData("Structure_total_norm")
    loadData(data)

    metaInput.checked = originallyCheckedMeta
    if (hasMS2){MS2Input.checked = originallyCheckedMS2}
    hazardInput.checked = originallyCheckedHazard

    // highlight the y-axis label after filtering. 
    if (clickedDTXCID){

      try{
        fieldList.forEach(key =>{
          let IdToHighlight = document.getElementById(`ylabel-${clickedDTXCID}-${key}`);
          IdToHighlight.setAttribute("fill", "red");
          IdToHighlight.style.fontWeight = "bold";
          })}
      catch(error){return}  

  }
}
}

hazardInput.checked = false
if (hasMS2){MS2Input.checked = false}
updateData("STRUCTURE_TOTAL_NORM")
makeLegend()
makeLargeGrid()
function makeExportButton(){
  const exportButton = makeSvgElement(30, 30, 'tripod-export-button', d3.select("#tripod-grid"));
      exportButton.attr('id', "tripod-export-button")
      exportButton.append("rect")
      .attr("id", "export-button-rect")
        .attr("width", "30px")
        .attr("height", "30px")
        .attr("rx", "6px")
        .attr("x", "1")
        .attr("y", "1")
        .attr("fill", "#DBE4F0")  
      exportButton.append('path')
        .attr('d', 'M25 0H7a7 7 0 0 0-7 7v18a7 7 0 0 0 7 7h18a7 7 0 0 0 7-7V7a7 7 0 0 0-7-7zm5 25a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5z')  
      exportButton.append("path")
      .attr("d", "M12 6.25C12.4142 6.25 12.75 6.58579 12.75 7V12.1893L14.4697 10.4697C14.7626 10.1768 15.2374 10.1768 15.5303 10.4697C15.8232 10.7626 15.8232 11.2374 15.5303 11.5303L12.5303 14.5303C12.3897 14.671 12.1989 14.75 12 14.75C11.8011 14.75 11.6103 14.671 11.4697 14.5303L8.46967 11.5303C8.17678 11.2374 8.17678 10.7626 8.46967 10.4697C8.76256 10.1768 9.23744 10.1768 9.53033 10.4697L11.25 12.1893V7C11.25 6.58579 11.5858 6.25 12 6.25Z")
      .attr('transform', 'translate(-5.5, -6) scale(1.8) ')
      exportButton.append("path")
      .attr("d", "M7.25 17C7.25 16.5858 7.58579 16.25 8 16.25H16C16.4142 16.25 16.75 16.5858 16.75 17C16.75 17.4142 16.4142 17.75 16 17.75H8C7.58579 17.75 7.25 17.4142 7.25 17Z")
      .attr('transform', 'translate(-5.5, -6) scale(1.8) ')

      exportButton.attr("onmouseover", "document.getElementById('export-button-rect').setAttribute('fill', '#3d4e634d')")
      exportButton.attr("onmouseout", "document.getElementById('export-button-rect').setAttribute('fill', '#DBE4F0')")
      document.getElementById('tripod-export-button').addEventListener('click', function(event) {
        const allVisibleColumns = window.gridAPI.getAllDisplayedColumns()
        const columnsToExport = allVisibleColumns
          .filter(col => col.getColId() !== 'Structure')
          .map(col => col.getColId());
        window.gridAPI.exportDataAsCsv({fileName:"candidate_ranking_grid_data.csv", skipColumnGroupHeaders:"true", columnKeys: columnsToExport})});
}  
makeExportButton()

loadData(data)

metaInput.checked = false
hazardInput.checked = true
document.getElementById('tripod-chart-hazard').innerHTML= ""
document.getElementById('tripod-title').innerHTML= ""
updateData("Hazard Score")
loadData()

if(hasMS2){
hazardInput.checked = false
MS2Input.checked = true
document.getElementById('tripod-chart-MS2').innerHTML= ""
document.getElementById('tripod-title').innerHTML= ""
updateData("MS2 quotient score")
loadData()}

metaInput.checked = true
hazardInput.checked = true


const screenshotButton = document.getElementById('screenshot-btn');
const node = document.getElementById('tripod-main-container');
screenshotButton.addEventListener('click', () => {
  htmlToImage.toPng(node)
    .then(function(dataUrl) {
    const link = document.createElement('a');
    link.download = 'candidate_plots.png'
    link.href = dataUrl;
    link.click();
  });
});

}

// ======= CALL MAIN FUNCTION ==================================================================================================
const dataPath = "./data/WW2DW_Data_Analysis_file_5_with_MS2.csv";
// const dataPath = "./data/WW2DW_Data_Analysis_file_5_without_MS2.csv";
generatePlots(dataPath);

