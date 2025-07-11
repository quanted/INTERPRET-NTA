// var jobid = JSON.parse(document.getElementById('jobid').textContent);
var jobid = window.location.pathname.split("/").pop();

// set path for webApp reduced CSV
var csv_path = './data/052825_tamoxifen_flag_for_QAQC_visuals.csv';
// csv_path = './data/subset.csv'
var init_parmaeters_path = './data/Analysis Parameters_tamoxifen.csv'
// var csv_path = '/nta/ms1/results/decision_tree_data/' + jobid;

/**
 * Changes in v0.6.0
 *  - Added sliders for Min Blank Replicate Threshold (%)
 *    - If a feature fails blank replicate threshold, the MRL is set to 0 for all occurences in that feature
 *  - Annotation for replicate threshold in the tree SVGs have changed to give both the blank replicate and sample replicate thresholds
 *  - The colors of the threshold sliders have been updated to match their box colors from the SVGs -- Replicates and MRL = grey; CV = red
 * 
 * Changes in v0.5.5
 *  - Removed the mrlPass variable for the feature level tree. It used to pass a feature if at least 1 occurrence passed CV and ANY occurrence passed MRL.
 *    Now a feature only passes if at least 1 occurence passes all 3 checks --> Replicate, CV, MRL
 * 
 * Changes in v0.5.4a
 *  - Fixed bug where the feature-level trees would never put a feature in the "< Replicate Threshold" leaf-node
 *  - Fixed bug where the header row of the input csv was being fed into the count functions, which would return undefined values
 *  - Added the ability to set default threshold values for the "A" trees by providing an "Analysis Parameters.csv" file 
 *  - Fixed bug where the positions of the bifurcating arrows in the feature-level trees were being calculated from the positions of the
 *    boxes from the occurence-level trees, which would cause them to sometimes not be centered depending on count values.
 * 
 * Changes in v0.5.3
 *  - Added MDL multiplier sliders for x3, x5, x10
 * 
 * Changes in v0.5.2
 *  - Added styling for center column.
 * 
 * Changes in v0.5.1
 *  - Changed process for downloading SVGs, adding namespaces in attempt to prevent styling issues in the WebApp
 *  - Optimized functions to only iterate over the data a single time, instead of once per graph
 *    - Fixed bug where it was counting the header row as an extra feature
 *  - Added toggleable icicle plots that are also downloadable
 * 
 */

// set path for webApp reduced CSV
// var csv_path = '../Reduced_WebApp_input_file_perc.csv';

// set main data structure that holds all threshold and count data
var countData = {
  "A": {
    "threshold": {
      "blankRep": 66.7,
      "rep": 66.7,
      "cv": 1.25,
      "mrl": 3,
      "blankRepPassArr": []
    },
    "counts": {
      "occ": {
        "total": 0,
        "present": 0,
        "missing": 0,
        "overRep": 0,
        "underRep": 0,
        "overCV": 0,
        "underCV": 0,
        "overCVOverMRL": 0,
        "overCVUnderMRL": 0,
        "underCVOverMRL": 0,
        "underCVUnderMRL": 0
      },
      "feat": {
        "total": 0,
        "present": 0,
        "missing": 0,
        "overRep": 0,
        "underRep": 0,
        "overCV": 0,
        "underCV": 0,
        "overCVOverMRL": 0,
        "overCVUnderMRL": 0,
        "underCVOverMRL": 0,
        "underCVUnderMRL": 0
      }
    }
  },

  "B": {
    "threshold": {
      "blankRep": 50.0,
      "rep": 50.0,
      "cv": 0.80,
      "mrl": 3,
      "blankRepPassArr": []
    },
    "counts": {
      "occ": {
        "total": 0,
        "present": 0,
        "missing": 0,
        "overRep": 0,
        "underRep": 0,
        "overCV": 0,
        "underCV": 0,
        "overCVOverMRL": 0,
        "overCVUnderMRL": 0,
        "underCVOverMRL": 0,
        "underCVUnderMRL": 0
      },
      "feat": {
        "total": 0,
        "present": 0,
        "missing": 0,
        "overRep": 0,
        "underRep": 0,
        "overCV": 0,
        "underCV": 0,
        "overCVOverMRL": 0,
        "overCVUnderMRL": 0,
        "underCVOverMRL": 0,
        "underCVUnderMRL": 0
      }
    }
  }
}

var thresholdData = {
  "repMax": 100.0,
  "repMin": 0.0,
  "cvMax": 5.0,
  "cvMin": 0.0
}

// boolean variables for toggle buttons
var showingOccurrence = true;
var showingIcicle = false;

// we must wrap the rest of the script in the d3.csv function because
// it is asyncronous, meaning that we can not return data from it
try {
  d3.csv(init_parmaeters_path).then(function(init_parameter_data) {

    // update the default parameters of the "A" thresholds
    for (let iRow in init_parameter_data) {
      let row = init_parameter_data[iRow];
      if (!(Array.isArray(row))) {
        if (row['Parameter'] === 'Min replicate hits (%)') {
          countData['A']['threshold']['rep'] = Number(row['Value'])
        } else if (row['Parameter'] === 'Max replicate CV') {
          countData['A']['threshold']['cv'] = Number(row['Value'])
        } else if (row['Parameter'] === 'MRL standard deviation multiplier') {
          countData['A']['threshold']['mrl'] = Number(row['Value'])
        } else if (row['Parameter'] === 'Min replicate hits in blanks (%)') {
          countData['A']['threshold']['blankRep'] = Number(row['Value'])
        }
      }
    }
  })

  // Data validation
  //// Blank Replicate
  if (countData["A"]["threshold"]["blankRep"] > thresholdData["repMax"]) {
    countData["A"]["threshold"]["blankRep"] = thresholdData["repMax"];
  } else if (countData["A"]["threshold"]["blankRep"] < thresholdData["repMin"]) {
    countData["A"]["threshold"]["blankRep"] = thresholdData["repMin"];
  }

  //// Replicate
  if (countData["A"]["threshold"]["rep"] > thresholdData["repMax"]) {
    countData["A"]["threshold"]["rep"] = thresholdData["repMax"];
  } else if (countData["A"]["threshold"]["rep"] < thresholdData["repMin"]) {
    countData["A"]["threshold"]["rep"] = thresholdData["repMin"];
  }

  //// CV
  if (countData["A"]["threshold"]["cv"] > thresholdData["cvMax"]) {
    countData["A"]["threshold"]["cv"] = thresholdData["cvMax"];
  } else if (countData["A"]["threshold"]["cv"] < thresholdData["cvMin"]) {
    countData["A"]["threshold"]["cv"] = thresholdData["cvMin"];
  }

  //// MRL
  if (countData["A"]["threshold"]["mrl"] < 4) {
    countData["A"]["threshold"]["mrl"] = 3;
  } else if (countData["A"]["threshold"]["mrl"] < 7.5) {
    countData["A"]["threshold"]["mrl"] = 5;
  } else {
    countData["A"]["threshold"]["mrl"] = 10;
  }
}
catch(err) {
  console.log('No default parameter file found')
}



d3.csv(csv_path).then(function(data) {
  /**
   * For updating the plots on toggle button clicks, and on threshold parameter changes.
   * @param {object} countData The object containing our count data.
   * @param {boolean} showingIcicle Global boolean parameter for if icicle plots are toggled on.
   * @param {boolean} showingOccurrence Global boolean parameter for if on occurrence-level view (false for feature).
   */
  function updateDecisionTreePlots(countData, showingIcicle, showingOccurrence) {
    if (showingIcicle) {
      if (showingOccurrence) {
        createIcicle(countData, 'occTreeABox', 'occTreeASVG', "A", "occ");
        createIcicle(countData, 'occTreeBBox', 'occTreeBSVG', "B", "occ");
      } else {
        createIcicle(countData, 'occTreeABox', 'occTreeASVG', "A", "feat");
        createIcicle(countData, 'occTreeBBox', 'occTreeBSVG', "B", "feat");
      }
    } else {
      if (showingOccurrence) {
        createOccTree(countData, 'occTreeABox', 'occTreeASVG', "A");
        createOccTree(countData, 'occTreeBBox', 'occTreeBSVG', "B");
      } else {
        createFeatTree(countData, 'occTreeABox', 'occTreeASVG', "A");
        createFeatTree(countData, 'occTreeBBox', 'occTreeBSVG', "B");
      }
    }
  }

  /******************************************
   * set up button panel functionality
   * 
  *******************************************/

  // First the occurrence/feature level toggle
  let toggleOccurrenceButton = document.getElementById("toggleOccurrenceButton");
  toggleOccurrenceButton.onclick = () => {
    showingOccurrence = !showingOccurrence;
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  };

  // The icicle plot toggle
  let toggleIcicleButton = document.getElementById("toggleIcicle");
  toggleIcicleButton.onclick = () => {
    showingIcicle = !showingIcicle;
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  };

  // download buttons
  let downloadAButton = document.getElementById("downloadA");
  downloadAButton.onclick = () => {
    let level = showingOccurrence === true ? "occ" : "feat";
    let type = showingIcicle === false ? "Tree" : "Icicle";
    downloadPNG_fromID('svg#occTreeASVG', `${level}${type}A.png`)
  };

  let downloadBButton = document.getElementById("downloadB");
  downloadBButton.onclick = () => {
    let level = showingOccurrence === true ? "occ" : "feat";
    let type = showingIcicle === false ? "Tree" : "Icicle";
    downloadPNG_fromID('svg#occTreeBSVG', `${level}${type}B.png`)
  };

  /** *******************************************
   * set up sliders/input boxes for thresholds
   * 
   ***********************************************/ 
  
  // Blank Replicate Threshold A
  var sliderBlankRepA = document.getElementById("ThreshSliderRange_blankRepA"),
    inputBoxBlankRepA = document.getElementById("ThreshSliderNumber_blankRepA");
  //// update with default threshold values if applicable
  sliderBlankRepA.value = countData["A"]["threshold"]["blankRep"]; // update with initial input value
  inputBoxBlankRepA.value = Number(sliderBlankRepA.value);
  sliderBlankRepA.oninput = function() {
    if (sliderBlankRepA.value > thresholdData["repMax"]) {
      sliderBlankRepA.value = thresholdData["repMax"];
    } else if (sliderBlankRepA.value < thresholdData["repMin"]) {
      sliderBlankRepA.value = thresholdData["repMin"];
    }
    inputBoxBlankRepA.value = Number(sliderBlankRepA.value);

    countData["A"]["threshold"]["blankRep"] = Number(sliderBlankRepA.value)

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }
  inputBoxBlankRepA.oninput = function() {
    if (inputBoxBlankRepA.value > thresholdData["repMax"]) {
      inputBoxBlankRepA.value = thresholdData["repMax"];
    } else if (inputBoxBlankRepA.value < thresholdData["repMin"]) {
      inputBoxBlankRepA.value = thresholdData["repMin"];
    }
    sliderBlankRepA.value = Number(inputBoxBlankRepA.value);

    countData["A"]["threshold"]["blankRep"] = Number(sliderBlankRepA.value);

    countData = get_counts(countData)

    tableCreate(countData, true)
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }


  // Sample Replicate Threshold A
  var sliderRepA = document.getElementById("ThreshSliderRange_repA"),
    inputBoxRepA = document.getElementById("ThreshSliderNumber_repA");
  //// update with default threshold values if applicable
  sliderRepA.value = countData["A"]["threshold"]["rep"]; // update with initial input value
  inputBoxRepA.value = Number(sliderRepA.value);
  sliderRepA.oninput = function() {
    if (sliderRepA.value > thresholdData["repMax"]) {
      sliderRepA.value = thresholdData["repMax"];
    } else if (sliderRepA.value < thresholdData["repMin"]) {
      sliderRepA.value = thresholdData["repMin"];
    }
    inputBoxRepA.value = Number(sliderRepA.value);

    countData["A"]["threshold"]["rep"] = Number(sliderRepA.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }
  inputBoxRepA.oninput = function() {
    if (inputBoxRepA.value > thresholdData["repMax"]) {
      inputBoxRepA.value = thresholdData["repMax"];
    } else if (inputBoxRepA.value < thresholdData["repMin"]) {
      inputBoxRepA.value = thresholdData["repMin"];
    }
    sliderRepA.value = Number(inputBoxRepA.value);

    countData["A"]["threshold"]["rep"] = Number(sliderRepA.value);

    countData = get_counts(countData);

    tableCreate(countData, true)
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  // CV Threshold A
  var sliderCVA = document.getElementById("ThreshSliderRange_cvA"),
    inputBoxCVA = document.getElementById("ThreshSliderNumber_cvA");
  sliderCVA.value = countData["A"]["threshold"]["cv"]; // update with initial input value
  inputBoxCVA.value = Number(sliderCVA.value);
  sliderCVA.oninput = function() {
    if (sliderCVA.value > thresholdData["cvMax"]) {
      sliderCVA.value = thresholdData["cvMax"];
    } else if (sliderCVA.value < thresholdData["cvMin"]) {
      sliderCVA.value = thresholdData["cvMin"];
    }
    inputBoxCVA.value = Number(sliderCVA.value);

    countData["A"]["threshold"]["cv"] = Number(sliderCVA.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }
  inputBoxCVA.oninput = function() {
    if (inputBoxCVA.value > thresholdData["cvMax"]) {
      inputBoxCVA.value = thresholdData["cvMax"];
    } else if (inputBoxCVA.value < thresholdData["cvMin"]) {
      inputBoxCVA.value = thresholdData["cvMin"];
    }
    sliderCVA.value = Number(inputBoxCVA.value);

    countData["A"]["threshold"]["cv"] = Number(sliderCVA.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  // Blank Replicate Threshold B
  var sliderBlankRepB = document.getElementById("ThreshSliderRange_blankRepB"),
    inputBoxBlankRepB = document.getElementById("ThreshSliderNumber_blankRepB");
  sliderBlankRepB.oninput = function() {
    if (sliderBlankRepB.value > thresholdData["repMax"]) {
      sliderBlankRepB.value = thresholdData["repMax"];
    } else if (sliderBlankRepB.value < thresholdData["repMin"]) {
      sliderBlankRepB.value = thresholdData["repMin"];
    }
    inputBoxBlankRepB.value = Number(sliderBlankRepB.value);

    countData["B"]["threshold"]["blankRep"] = Number(sliderBlankRepB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }
  inputBoxBlankRepB.oninput = function() {
    if (inputBoxBlankRepB.value > thresholdData["repMax"]) {
      inputBoxBlankRepB.value = thresholdData["repMax"];
    } else if (inputBoxBlankRepB.value < thresholdData["repMin"]) {
      inputBoxBlankRepB.value = thresholdData["repMin"];
    }
    sliderBlankRepB.value = Number(inputBoxBlankRepB.value);

    countData["B"]["threshold"]["blankRep"] = Number(sliderBlankRepB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  // Sample Replicate Threshold B
  var sliderRepB = document.getElementById("ThreshSliderRange_repB"),
    inputBoxRepB = document.getElementById("ThreshSliderNumber_repB");
  sliderRepB.oninput = function() {
    if (sliderRepB.value > thresholdData["repMax"]) {
      sliderRepB.value = thresholdData["repMax"];
    } else if (sliderRepB.value < thresholdData["repMin"]) {
      sliderRepB.value = thresholdData["repMin"];
    }
    inputBoxRepB.value = Number(sliderRepB.value);

    countData["B"]["threshold"]["rep"] = Number(sliderRepB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }
  inputBoxRepB.oninput = function() {
    if (inputBoxRepB.value > thresholdData["repMax"]) {
      inputBoxRepB.value = thresholdData["repMax"];
    } else if (inputBoxRepB.value < thresholdData["repMin"]) {
      inputBoxRepB.value = thresholdData["repMin"];
    }
    sliderRepB.value = Number(inputBoxRepB.value);

    countData["B"]["threshold"]["rep"] = Number(sliderRepB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  // CV Threshold B
  var sliderCVB = document.getElementById("ThreshSliderRange_cvB"),
    inputBoxCVB = document.getElementById("ThreshSliderNumber_cvB");
  sliderCVB.oninput = function() {
    if (sliderCVB.value > thresholdData["cvMax"]) {
      sliderCVB.value = thresholdData["cvMax"];
    } else if (sliderCVB.value < thresholdData["cvMin"]) {
      sliderCVB.value = thresholdData["cvMin"];
    }
    inputBoxCVB.value = Number(sliderCVB.value);

    countData["B"]["threshold"]["cv"] = Number(sliderCVB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }
  inputBoxCVB.oninput = function() {
    if (inputBoxCVB.value > thresholdData["cvMax"]) {
      inputBoxCVB.value = thresholdData["cvMax"];
    } else if (inputBoxCVB.value < thresholdData["cvMin"]) {
      inputBoxCVB.value = thresholdData["cvMin"];
    }
    sliderCVB.value = Number(inputBoxCVB.value);

    countData["B"]["threshold"]["cv"] = Number(sliderCVB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  // MRL Threshold A
  var sliderMRLA = document.getElementById("ThreshSliderRange_mrlA"),
    inputBoxMRLA = document.getElementById("ThreshSliderNumber_mrlA");
  sliderMRLA.value = countData["A"]["threshold"]["mrl"]; // update with initial input value
  inputBoxMRLA.value = Number(sliderMRLA.value);
  sliderMRLA.oninput = function() {
    // First set the possible values for the slider
    if (sliderMRLA.value < 4) {
      sliderMRLA.value = 3;
    } else if (sliderMRLA.value < 7.5) {
      sliderMRLA.value = 5;
    } else {
      sliderMRLA.value = 10;
    }
    inputBoxMRLA.value = Number(sliderMRLA.value);
    countData["A"]["threshold"]["mrl"] = Number(sliderMRLA.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  // MRL Threshold B
  var sliderMRLB = document.getElementById("ThreshSliderRange_mrlB"),
    inputBoxMRLB = document.getElementById("ThreshSliderNumber_mrlB");
  sliderMRLB.oninput = function() {
    // First set the possible values for the slider
    if (sliderMRLB.value < 4) {
      sliderMRLB.value = 3;
    } else if (sliderMRLB.value < 7.5) {
      sliderMRLB.value = 5;
    } else {
      sliderMRLB.value = 10;
    }
    inputBoxMRLB.value = Number(sliderMRLB.value)
    countData["B"]["threshold"]["mrl"] = Number(sliderMRLB.value);

    countData = get_counts(countData);

    tableCreate(countData, true);
    updateDecisionTreePlots(countData, showingIcicle, showingOccurrence);
  }

  /** ******************************
   * Setup download buttons
   * 
   * 
   *********************************/

  function triggerDownload(imgURI, download_file) {
    const a = document.createElement('a');
    a.download = download_file; // filename
    a.target = '_blank';
    a.href = imgURI;
  
    // trigger download button
    // (set `bubbles` to false here.
    // or just `a.click()` if you don't care about bubbling)
    a.dispatchEvent(new MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true
    }));
  }
  
  function downloadPNG_fromID(css_selector, download_file) {
    const svgNode = document.querySelector(css_selector);
    const svgString = (new XMLSerializer()).serializeToString(svgNode);
    const svgBlob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8'
    });
  
    const DOMURL = window.URL || window.webkitURL || window;
    const url = DOMURL.createObjectURL(svgBlob);
  
    const image = new Image();
    image.width = svgNode.width.baseVal.value;
    image.height = svgNode.height.baseVal.value;
    image.src = url;
    image.onload = function () {
      const canvas = document.getElementById('logicTreeCanvas');
      canvas.width = image.width;
      canvas.height = image.height;
  
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      DOMURL.revokeObjectURL(url);
  
      const imgURI = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      triggerDownload(imgURI, download_file);
    };
  }


  /** ****************************************
   * Setup table and trees with starting data
   * 
   *********************************/

  // get counts based on current 
  countData = get_counts(countData)

  tableCreate(countData, false)
  createOccTree(countData, 'occTreeABox', 'occTreeASVG', "A")
  createOccTree(countData, 'occTreeBBox', 'occTreeBSVG', "B")


  /** ******************
   * Functions
   * 
   *********************/

  /**
   * 
   * @param {Object} countData The object that has count data for the SVG tree you want to build.
   * @param {String} divID      The ID for the outer div that holds the SVG you want to build. 
   * @param {String} svgID      The ID for the SVG you want to build.  
   */
  function createIcicle(countData, divID, svgID, threshID, type) {
    var occ_counts = countData[threshID]["counts"][type]
    // remove chart if it exists, but get dims first
    var svgWidth = document.getElementById(svgID).getAttribute('width'),
      svgHeight = document.getElementById(svgID).getAttribute('height');

    var chart = document.getElementById(divID);
    if (chart) {
      chart.children[0].innerHTML = '';
    }

    d3.selectAll(`#${svgID} > *`).remove();

    var pass_fc = '#FFF',
      nonDetect_fc = '#B2B2B2',
      fail_fc = '#F999A4',
      text_c = '#000',
      stroke_c = '#000';

    // create SVG element
    var svg = document.getElementById(svgID);
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);

    if (type === 'occ') {
      var init_name = `Initial Input Data  -  Total Occurrences (${threshID})`
    } else {
      var init_name = `Initial Input Data  -  Total Features (${threshID})`
    }

    let data = {
      name: init_name,
      color: pass_fc,
      text_color: text_c,
      stroke: stroke_c,
      stroke_width: '2px',
      fontsize: '1rem',
      fontweight: 'normal',
      children: [
        {
          name: "Missing",
          size: occ_counts['missing'],
          color: nonDetect_fc,
          text_color: text_c,
          stroke: stroke_c,
          stroke_width: '2px',
          fontsize: '1rem',
          fontweight: 'normal'
        },
        {
          name: "Present",
          color: pass_fc,
          text_color: text_c,
          stroke: stroke_c,
          stroke_width: '2px',
          fontsize: '1rem',
          fontweight: 'normal',
          children: [
            {
              name: "< Rep",
              size: occ_counts['underRep'],
              color: nonDetect_fc,
              text_color: text_c,
              stroke: stroke_c,
              stroke_width: '2px',
              fontsize: '1rem',
              fontweight: 'normal'
            },
            {
              name: "\u2265 Rep",
              color: pass_fc,
              text_color: text_c,
              stroke: stroke_c,
              stroke_width: '2px',
              fontsize: '1rem',
              fontweight: 'normal',
              children: [
                {
                  name: "> CV",
                  color: fail_fc,
                  text_color: text_c,
                  stroke: stroke_c,
                  stroke_width: '2px',
                  fontsize: '1rem',
                  fontweight: 'normal',
                  children: [
                    {
                      name: "< MRL",
                      text_color: text_c,
                      size: occ_counts['overCVUnderMRL'],
                      color: nonDetect_fc,
                      stroke: stroke_c,
                      stroke_width: '2px',
                      fontsize: '1rem',
                      fontweight: 'normal'
                    },
                    {
                      name: "\u2265 MRL",
                      size: occ_counts['overCVOverMRL'],
                      color: fail_fc,
                      text_color: text_c,
                      stroke: stroke_c,
                      stroke_width: '2px',
                      fontsize: '1rem',
                      fontweight: 'normal'
                    }
                  ]
                },
                {
                  name: "\u2264 CV",
                  color: pass_fc,
                  text_color: text_c,
                  stroke: stroke_c,
                  stroke_width: '2px',
                  fontsize: '1rem',
                  fontweight: 'normal',
                  children: [
                    {
                      name: "< MRL",
                      size: occ_counts['underCVUnderMRL'],
                      color: nonDetect_fc,
                      text_color: text_c,
                      stroke: stroke_c,
                      stroke_width: '2px',
                      fontsize: '1rem',
                      fontweight: 'normal'
                    },
                    {
                      name: "\u2265 MRL",
                      size: occ_counts['underCVOverMRL'],
                      color: pass_fc,
                      text_color: text_c,
                      stroke: stroke_c,
                      stroke_width: '4px',
                      fontsize: '1.3rem',
                      fontweight: 'bold'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    let partition = d3.partition() 
      .size([svgWidth, svgHeight])
      .padding(8);

    let root = d3.hierarchy(data)
      .sum((d) => d.size);

    partition(root);

    let svg2 = d3.select(`#${svgID}`);

    let g = svg2.selectAll("g")
      .data(root)
      .enter().append("g");

    g.append("title")
      .text((d) => `${d.data.name}\n${numberWithCommas(d.value)}\n${Math.floor((d.value / occ_counts['total'])*10000) / 100}%`)

    g.append("rect")
      .attr('x', function(d) { return d.x0; })
      .attr('y', function(d) { return d.y0; })
      .attr('width', function(d) { return d.x1 - d.x0; })
      .attr('height', function(d) { return d.y1 - d.y0; })
      .style("fill", function (d) { return d.data.color; })
      .style("stroke", function (d) { return d.data.stroke })
      .attr('rx', '15px')
      .attr('ry', '15px');

    g.append('text')
      .attr("dy", "-0.75em")
      .text(function (d) { 
        if (d.x1 - d.x0 < 78) {
          return '';
        } else {
          return d.data.name; 
        }
      })
      .style('fill', (d) => d.data.text_color)
      .style('font-size', "1.4rem")
      .attr("xml:space", "preserve")
      .attr("x", function(d) {
        return ((d.x1 + d.x0) / 2) - (this.getBBox().width / 2);
      })
      .attr("y", (d) => (d.y1 + d.y0) / 2)

    // now we add the boxes with values
    let sunburst_text_values = g.append("text")
      .attr("dy", "1.5em")
      .text(function (d) { return numberWithCommas(d.value); })
      .style('fill', "black")
      .style('font-size', (d) => d.data.fontsize)
      .attr("xml:space", "preserve")
      .attr("x", function(d) {
        return ((d.x1 + d.x0) / 2) - (this.getBBox().width / 2);
      })
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("class", "sunburst_text_values")
      .style("font-weight", (d) => d.data.fontweight)
      .style('display', function(d) {
        if (d.x1 - d.x0 < 78) {
          return 'none';
        } else {
          return 'default'
        }
      });

    g.append("rect")
      .attr('class', 'sunburst_rect_values')
      .attr('width', function(d) { 
        let text_node = this.parentNode.childNodes[this.parentNode.childNodes.length-2];
        return text_node.getBBox().width * 1.84; 
      })
      .attr('height', function(d) { 
        let text_node = this.parentNode.childNodes[this.parentNode.childNodes.length-2];
        return text_node.getBBox().height *1.5;
      })
      .attr('x', function(d) { 
        let text_node = this.parentNode.childNodes[this.parentNode.childNodes.length-2];
        return Number(text_node.getAttribute('x')) - (this.getAttribute('width') - text_node.getBBox().width)/2; 
      })
      .attr('y', function(d) { 
        let text_node = this.parentNode.childNodes[this.parentNode.childNodes.length-2];
        return Number(text_node.getAttribute('y')) + (this.getAttribute("height") -  text_node.getBBox().height)/2; 
      })
      .style("fill", function (d) { return 'white'; })
      .attr('rx', '6px')
      .attr('ry', '6px')
      .style('stroke-width', (d) => d.data.stroke_width)
      .style('stroke', (d) => d.data.stroke)

    sunburst_text_values.raise();
    
  }

  /**
   * Function to reset all counts to 0 in main data structure
   * March 14, 2024
   * @param {Object} myData Object with count data to reset to 0
   * @returns {Object} Updated myData object with all counts set to 0
   */
  function resetCounts(myData) {
    for (let i in myData["A"]["counts"]["occ"]) {
      myData["A"]["counts"]['occ'][i] = 0;
      myData["A"]["counts"]['feat'][i] = 0;
      myData["B"]["counts"]['occ'][i] = 0;
      myData["B"]["counts"]['feat'][i] = 0;
      myData["A"]["threshold"]["blankRepPassArr"] = [];
      myData["B"]["threshold"]["blankRepPassArr"] = [];
    }

    return myData;
  }

  /**
   * Updates the countData object for a single row of data
   * March 14, 2024
   *  Updated: August 30, 2024
   *    - Issue where max_pass variable was always being overwritten to be one of ['underCVOverMRL', 'underCVUnderMRL', 'overCVOverMRL', 'overCVUnderMRL']
   *      Fixed by adding an if statement to only overwrite max_pass to one of these four leaf-nodes when max_pass does NOT equal 'underRep' or 'missing'.
   *  Updated: September 4, 2024
   *    - Previously a feature passed if at least 1 occurence passed replicate + CV and ANY occurrence passed MRL. Now it only passes
   *      if at least one occurrence passes all 3 checks.
   * @param {Object} countData Main object of count data
   * @param {Object} row The current row (feature)
   * @param {String} threshID The key, if we are looking at threshold "A" or "B"
   * @returns updated countData Object, and max_pass string for updating feature counts
   */

  // function get_counts_by_row(countData, row, threshID, blankRepPassIndex) {
  //     // We need to store information about "pass-hierarchy" to keep track of the 'highest-level-occurrence' in a feature.
  //     var pass_hierarchy = {
  //         'missing': 0,
  //         'present': 1,
  //         'underRep': 2,
  //         'overCVUnderMRL': 3,
  //         'overCVOverMRL': 4,
  //         'underCVUnderMRL': 5,
  //         'underCVOverMRL': 6
  //     };

  //     // Get 'sample suffixes'. We need to find them by looking for the "Detection Count" column names
  //     var column_headers = Object.keys(data[0]);
  //     var sample_names = [];
  //     for (let header_i in column_headers) {
  //         if (column_headers[header_i].slice(0, 16) === 'Detection Count ') {
  //             sample_names.push(column_headers[header_i].slice(16));
  //         }
  //     }

  //     // Check if this feature passed the mass blank threshold
  //     var passedBlankRep = countData[threshID]["threshold"]["blankRepPassArr"][blankRepPassIndex];

  //     // Ensure we are not looking at an empty row at the end of CSV.
  //     if (row['Feature ID']) {
  //         var max_pass = 'missing';

  //         // Iterate over sample names (occurrences)
  //         for (let i in sample_names) {
  //             countData[`${threshID}`]["counts"]["occ"]["total"] += 1;

  //             // Check to see if the sample exists... "Detection Count" is > 0
  //             var sample_name = sample_names[i];
  //             var detection_count_header = `Detection Count ${sample_name}`;
  //             var isBlankSample = ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"].some(blankStr => sample_name.includes(blankStr));

  //             if (Number(row[detection_count_header]) > 0) {
  //                 countData[`${threshID}`]["counts"]["occ"]["present"] += 1;

  //                 // Apply different thresholds based on whether it's a blank or sample
  //                 var sample_rep_header = "Detection Percentage " + sample_name;
  //                 var passedReplicate = false;

  //                 if (isBlankSample) {
  //                     if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["blankRep"]) {
  //                         countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;
  //                         passedReplicate = true;
  //                     } else {
  //                         countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
  //                     }
  //                 } else {
  //                     if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["rep"]) {
  //                         countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;
  //                         passedReplicate = true;
  //                     } else {
  //                         countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
  //                     }
  //                 }

  //                 // Only evaluate CV and MRL if replicate threshold is passed
  //                 // Only evaluate CV and MRL if replicate threshold is passed
  //                 if (passedReplicate) {
  //                     var sample_cv_header = "CV " + sample_name;
  //                     var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`;
  //                     var sample_mean_header = "Mean " + sample_name;

  //                     if (Number(row[sample_cv_header]) <= countData[`${threshID}`]["threshold"]["cv"]) {
  //                         countData[`${threshID}`]["counts"]["occ"]["underCV"] += 1;
  //                         if ((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header]) && passedBlankRep) || (!passedBlankRep && Number(row[sample_mean_header]) >= 0)) {
  //                             countData[`${threshID}`]["counts"]["occ"]["underCVOverMRL"] += 1;
  //                             max_pass = 'underCVOverMRL';
  //                         } else {
  //                             countData[`${threshID}`]["counts"]["occ"]["underCVUnderMRL"] += 1;
  //                             if (pass_hierarchy['underCVUnderMRL'] > pass_hierarchy[max_pass]) {
  //                                 max_pass = 'underCVUnderMRL';
  //                             }
  //                         }
  //                     } else {
  //                         countData[`${threshID}`]["counts"]["occ"]["overCV"] += 1;
  //                         if ((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header]) && passedBlankRep) || (!passedBlankRep && Number(row[sample_mean_header]) >= 0)) {
  //                             countData[`${threshID}`]["counts"]["occ"]["overCVOverMRL"] += 1;
  //                             if (pass_hierarchy['overCVOverMRL'] > pass_hierarchy[max_pass]) {
  //                                 max_pass = 'overCVOverMRL';
  //                             }
  //                         } else {
  //                             countData[`${threshID}`]["counts"]["occ"]["overCVUnderMRL"] += 1;
  //                             if (pass_hierarchy['overCVUnderMRL'] > pass_hierarchy[max_pass]) {
  //                                 max_pass = 'overCVUnderMRL';
  //                             }
  //                         }
  //                     }
  //                 }
  //             } else {
  //                 // n_abun = 0
  //                 countData[`${threshID}`]["counts"]["occ"]["missing"] += 1;
  //             }
  //       }
  //     }

  //   return countData, max_pass;
  // }

  // // AC added whole function
  // function get_counts_by_row(countData, row, threshID, blankRepPassIndex) {
  //     // We need to store information about "pass-hierarchy" to keep track of the 'highest-level-occurrence' in a feature.
  //     var pass_hierarchy = {
  //         'missing': 0,
  //         'present': 1,
  //         'underRep': 2,
  //         'overCVUnderMRL': 3,
  //         'overCVOverMRL': 4,
  //         'underCVUnderMRL': 5,
  //         'underCVOverMRL': 6
  //     };

  //     // Get 'sample suffixes'. We need to find them by looking for the "Detection Count" column names
  //     var column_headers = Object.keys(data[0]);
  //     var sample_names = [];
  //     for (let header_i in column_headers) {
  //         if (column_headers[header_i].slice(0, 16) === 'Detection Count ') {
  //             sample_names.push(column_headers[header_i].slice(16));
  //         }
  //     }

  //     // Check if this feature passed the mass blank threshold
  //     var passedBlankRep = countData[threshID]["threshold"]["blankRepPassArr"][blankRepPassIndex];

  //     // Ensure we are not looking at an empty row at the end of CSV.
  //     if (row['Feature ID']) {
  //         var max_pass = 'missing';

  //         // Iterate over sample names (occurrences)
  //         for (let i in sample_names) {
  //             countData[`${threshID}`]["counts"]["occ"]["total"] += 1;

  //             // Check to see if the sample exists... "Detection Count" is > 0
  //             var sample_name = sample_names[i];
  //             var detection_count_header = `Detection Count ${sample_name}`;
  //             var isBlankSample = ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"].some(blankStr => sample_name.includes(blankStr));

  //             if (Number(row[detection_count_header]) > 0) {
  //                 countData[`${threshID}`]["counts"]["occ"]["present"] += 1;

  //                 // Apply different thresholds based on whether it's a blank or sample
  //                 var sample_rep_header = "Detection Percentage " + sample_name;
  //                 if (isBlankSample) {
  //                     if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["blankRep"]) {
  //                         countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;
  //                         // Further logic for blanks passing replicate threshold
  //                     } else {
  //                         countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
  //                         // Further logic for blanks failing replicate threshold
  //                     }
  //                 } else {
  //                     if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["rep"]) {
  //                         countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;
  //                         // Further logic for samples passing replicate threshold
  //                     } else {
  //                         countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
  //                         // Further logic for samples failing replicate threshold
  //                     }
  //                 }

  //                 // Check the CV and MRL logic as per your existing conditions
  //                 var sample_cv_header = "CV " + sample_name;
  //                 var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`;
  //                 var sample_mean_header = "Mean " + sample_name;

  //                 if (Number(row[sample_cv_header]) <= countData[`${threshID}`]["threshold"]["cv"]) {
  //                     countData[`${threshID}`]["counts"]["occ"]["underCV"] += 1;
  //                     if ((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header]) && passedBlankRep) || (!passedBlankRep && Number(row[sample_mean_header]) >= 0)) {
  //                         countData[`${threshID}`]["counts"]["occ"]["underCVOverMRL"] += 1;
  //                         max_pass = 'underCVOverMRL';
  //                     } else {
  //                         countData[`${threshID}`]["counts"]["occ"]["underCVUnderMRL"] += 1;
  //                         if (pass_hierarchy['underCVUnderMRL'] > pass_hierarchy[max_pass]) {
  //                             max_pass = 'underCVUnderMRL';
  //                         }
  //                     }
  //                 } else {
  //                     countData[`${threshID}`]["counts"]["occ"]["overCV"] += 1;
  //                     if ((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header]) && passedBlankRep) || (!passedBlankRep && Number(row[sample_mean_header]) >= 0)) {
  //                       countData[`${threshID}`]["counts"]["occ"]["overCVOverMRL"] += 1;
  //                       if (pass_hierarchy['overCVOverMRL'] > pass_hierarchy[max_pass]) {
  //                           max_pass = 'overCVOverMRL';
  //                       }
  //                   } else {
  //                       countData[`${threshID}`]["counts"]["occ"]["overCVUnderMRL"] += 1;
  //                       if (pass_hierarchy['overCVUnderMRL'] > pass_hierarchy[max_pass]) {
  //                           max_pass = 'overCVUnderMRL';
  //                       }
  //                   }
  //               }
  //           } else {
  //               // n_abun = 0
  //               countData[`${threshID}`]["counts"]["occ"]["missing"] += 1;
  //           }
  //       }
  //   }

  //   return countData, max_pass;
  // }


  function get_counts_by_row(countData, row, threshID, blankRepPassIndex) {
    // we need to store information about "pass-hierarchy" to keep track of the 'highest-level-occurrence' in a feature.
    // e.g., if all occurrences of a feature are missing except for one occurrence that passes all filtering steps,
    //       then the feature is said to have passed.
    var pass_hierarchy = {
      'missing': 0,
      'present': 1,
      'underRep': 2,
      'overCVUnderMRL': 3,
      'overCVOverMRL': 4,
      'underCVUnderMRL': 5,
      'underCVOverMRL': 6
    }

    // get 'sample suffixes'. Since we don't have a priori knowledge of the sample names, we need
    // to find them by looking for the "Detection Count" column names, which always end with a unique sample name
    var column_headers = Object.keys(data[0]); // array of all column headers
    var sample_names = []; // e.g., ['_MB', '_53_T', '_54_T', ...]
    for (let header_i in column_headers) {
      if (column_headers[header_i].slice(0, 16) === 'Detection Count ') {
        sample_names.push(column_headers[header_i].slice(16));
      }
    }

    // check if this feature passed the mass blank threshold
    //// The index in the array is equal to the feature ID - 1
    var passedBlankRep = countData[threshID]["threshold"]["blankRepPassArr"][blankRepPassIndex];

    // ensure we are not looking at an empty row at the end of CSV.
    if (row['Feature ID']) {
      // FOR THE FEATURE CHECK
      //  A feature passes if at least one occurence in that feature passes replicat + CV + MRL
      var max_pass = 'missing';

      // iterate over sample names (occurrences)
      for (let i in sample_names) {
        countData[`${threshID}`]["counts"]["occ"]["total"] += 1;

        // check to see if the sample exists... "Detection Count" is > 0
        var sample_name = sample_names[i];
        var isBlankSample = ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"].some(blankStr => sample_name.includes(blankStr));

        var detection_count_header = `Detection Count ${sample_name}`;
        if (Number(row[detection_count_header]) > 0) {
          countData[`${threshID}`]["counts"]["occ"]["present"] += 1;

          // update max_pass if needed (I think this not needed here, but for clarity)
          if (pass_hierarchy['present'] > pass_hierarchy[max_pass]) {
            max_pass = 'present';
          }


          //**********************************************//
          // THIS IS WHERE WE BRANCH ON THRESHOLD A AND B //
          //**********************************************//           

          // check if this occurrence within the feature passes MRL check (and hence causes the feature to pass)
          var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`; 
          var sample_mean_header = "Mean " + sample_name;

          // now we need to check the replicate threshold
          var sample_rep_header = "Detection Percentage " + sample_name;
          var passedReplicate = false;
          if (isBlankSample) {
              if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["blankRep"]) {
                  countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;
                  passedReplicate = true;
              } else {
                  countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
                  // if (pass_hierarchy['underRep'] > pass_hierarchy[max_pass]) {
                  //   max_pass = 'underRep';
                  // }
                  // if (!isBlankSample && pass_hierarchy['underRep'] > pass_hierarchy[max_pass]) {
                  //   max_pass = 'underRep';
                  // }
              }
          } else {
            if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["rep"]) {
              countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;
              passedReplicate = true;
            } else {
              countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
              if (pass_hierarchy['underRep'] > pass_hierarchy[max_pass]) {
                max_pass = 'underRep';
              }
              // if (!isBlankSample && pass_hierarchy['underRep'] > pass_hierarchy[max_pass]) {
              //   max_pass = 'underRep';
              // }            
            }
          }

          if (passedReplicate) {  // Evaluate CV and MRL only if replicate threshold is passed
            // now we check the CV threshold
            var sample_cv_header = "CV " + sample_name;
            // // AC added
            // var isBlankSample = ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"].some(blankStr => sample_name.includes(blankStr));

            // AC added
            // if (Number(row[sample_cv_header]) <= countData[`${threshID}`]["threshold"]["cv"]) {
            if (isBlankSample || Number(row[sample_cv_header]) <= countData[`${threshID}`]["threshold"]["cv"]) {
              // passed cv
              countData[`${threshID}`]["counts"]["occ"]["underCV"] += 1;

              // check if this occurrence passes MRL check
              var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`; 
              var sample_mean_header = "Mean " + sample_name;
              if (((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header])) && (passedBlankRep)) || ((!(passedBlankRep)) && (Number(row[sample_mean_header])) >= 0)) {
                // pass MRL (pass replicate-->pass CV-->pass MRL) = (overRep,underCV,overMRL)
                countData[`${threshID}`]["counts"]["occ"]["underCVOverMRL"] += 1;
                max_pass = 'underCVOverMRL' // highest level of pass, so no need to check before assigning
              } else {
                // fail MRL (pass replicate-->pass CV-->fail MRL) = (overRep,underCV,underMRL)
                countData[`${threshID}`]["counts"]["occ"]["underCVUnderMRL"] += 1;
                if (pass_hierarchy['underCVUnderMRL'] > pass_hierarchy[max_pass]) {
                  max_pass = 'underCVUnderMRL'
                }
              }

            } else {
              // failed cv
              countData[`${threshID}`]["counts"]["occ"]["overCV"] += 1;

              // check if this occurrence passes MRL check
              var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`
              var sample_mean_header = "Mean " + sample_name;
              if (((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header])) && (passedBlankRep)) || ((!(passedBlankRep)) && (Number(row[sample_mean_header])) >= 0)) {
                // pass MRL (pass replicate-->fail CV-->pass MRL) = (overRep,overCV,overMRL)
                countData[`${threshID}`]["counts"]["occ"]["overCVOverMRL"] += 1;
                if (pass_hierarchy['overCVOverMRL'] > pass_hierarchy[max_pass]) {
                  max_pass = 'overCVOverMRL'
                }
              } else {
                // fail MRL (pass replicate-->fail CV-->fail MRL) = (overRep,overCV,underMRL)
                countData[`${threshID}`]["counts"]["occ"]["overCVUnderMRL"] += 1;
                if (pass_hierarchy['overCVUnderMRL'] > pass_hierarchy[max_pass]) {
                  max_pass = 'overCVUnderMRL'
                }
              }
            }
          }

        } else {
          // n_abun = 0
          countData[`${threshID}`]["counts"]["occ"]["missing"] += 1
        }
      }
    // // AC Debug - console log out the features that fail replicate
    // if (max_pass = 'underRep') {
    //   console.log(row)
    // }      
    } // END OF FEATURE


    return countData, max_pass

  }


  // function get_counts_by_row(countData, row, threshID, blankRepPassIndex) {
  //   // we need to store information about "pass-hierarchy" to keep track of the 'highest-level-occurrence' in a feature.
  //   // e.g., if all occurrences of a feature are missing except for one occurrence that passes all filtering steps,
  //   //       then the feature is said to have passed.
  //   var pass_hierarchy = {
  //     'missing': 0,
  //     'present': 1,
  //     'underRep': 2,
  //     'overCVUnderMRL': 3,
  //     'overCVOverMRL' : 4,
  //     'underCVUnderMRL': 5,
  //     'underCVOverMRL': 6
  //   }

  //   // get 'sample suffixes'. Since we don't have a priori knowledge of the sample names, we need
  //   // to find them by looking for the "Detection Count" column names, which always end with a unique sample name
  //   var column_headers = Object.keys(data[0]); // array of all column headers
  //   var sample_names = []; // e.g., ['_MB', '_53_T', '_54_T', ...]
  //   for (let header_i in column_headers) {
  //     if (column_headers[header_i].slice(0, 16) === 'Detection Count ') {
  //       sample_names.push(column_headers[header_i].slice(16));
  //     }
  //   }

  //   // check if this feature passed the mass blank threshold
  //   //// The index in the array is equal to the feature ID - 1
  //   var passedBlankRep = countData[threshID]["threshold"]["blankRepPassArr"][blankRepPassIndex];

  //   // ensure we are not looking at an empty row at the end of CSV.
  //   if (row['Feature ID']) {
  //     // FOR THE FEATURE CHECK
  //     //  A feature passes if at least one occurence in that feature passes replicat + CV + MRL
  //     var max_pass = 'missing';

  //     // iterate over sample names (occurrences)
  //     for (let i in sample_names) {
  //       countData[`${threshID}`]["counts"]["occ"]["total"] += 1;

  //       // check to see if the sample exists... "Detection Count" is > 0
  //       var sample_name = sample_names[i];
  //       var isBlankSample = ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"].some(blankStr => sample_name.includes(blankStr));

  //       var detection_count_header = `Detection Count ${sample_name}`;
  //       if (Number(row[detection_count_header]) > 0) {
  //         countData[`${threshID}`]["counts"]["occ"]["present"] += 1;

  //         // update max_pass if needed (I think this not needed here, but for clarity)
  //         if (pass_hierarchy['present'] > pass_hierarchy[max_pass]) {
  //           max_pass = 'present';
  //         }


  //         //**********************************************//
  //         // THIS IS WHERE WE BRANCH ON THRESHOLD A AND B //
  //         //**********************************************//           

  //         // check if this occurrence within the feature passes MRL check (and hence causes the feature to pass)
  //         var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`; 
  //         var sample_mean_header = "Mean " + sample_name;

  //         // now we need to check the replicate threshold
  //         var sample_rep_header = "Detection Percentage " + sample_name;
  //         if (Number(row[sample_rep_header]) >= countData[`${threshID}`]["threshold"]["rep"]) {
            
  //           // we pass the replicate threshold
  //           countData[`${threshID}`]["counts"]["occ"]["overRep"] += 1;

  //           // now we check the CV threshold
  //           var sample_cv_header = "CV " + sample_name;
  //           // AC added
  //           var isBlankSample = ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"].some(blankStr => sample_name.includes(blankStr));

  //           // AC added
  //           // if (Number(row[sample_cv_header]) <= countData[`${threshID}`]["threshold"]["cv"]) {
  //           if (isBlankSample || Number(row[sample_cv_header]) <= countData[`${threshID}`]["threshold"]["cv"]) {
  //             // passed cv
  //             countData[`${threshID}`]["counts"]["occ"]["underCV"] += 1;

  //             // check if this occurrence passes MRL check
  //             var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`; 
  //             var sample_mean_header = "Mean " + sample_name;
  //             if (((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header])) && (passedBlankRep)) || ((!(passedBlankRep)) && (Number(row[sample_mean_header])) >= 0)) {
  //               // pass MRL (pass replicate-->pass CV-->pass MRL) = (overRep,underCV,overMRL)
  //               countData[`${threshID}`]["counts"]["occ"]["underCVOverMRL"] += 1;
  //               max_pass = 'underCVOverMRL' // highest level of pass, so no need to check before assigning
  //             } else {
  //               // fail MRL (pass replicate-->pass CV-->fail MRL) = (overRep,underCV,underMRL)
  //               countData[`${threshID}`]["counts"]["occ"]["underCVUnderMRL"] += 1;
  //               if (pass_hierarchy['underCVUnderMRL'] > pass_hierarchy[max_pass]) {
  //                 max_pass = 'underCVUnderMRL'
  //               }
  //             }

  //           } else {
  //             // failed cv
  //             countData[`${threshID}`]["counts"]["occ"]["overCV"] += 1;

  //             // check if this occurrence passes MRL check
  //             var mrl_threshold_header = `MRL (${countData[threshID]['threshold']['mrl']}x)`
  //             var sample_mean_header = "Mean " + sample_name;
  //             if (((Number(row[sample_mean_header]) >= Number(row[mrl_threshold_header])) && (passedBlankRep)) || ((!(passedBlankRep)) && (Number(row[sample_mean_header])) >= 0)) {
  //               // pass MRL (pass replicate-->fail CV-->pass MRL) = (overRep,overCV,overMRL)
  //               countData[`${threshID}`]["counts"]["occ"]["overCVOverMRL"] += 1;
  //               if (pass_hierarchy['overCVOverMRL'] > pass_hierarchy[max_pass]) {
  //                 max_pass = 'overCVOverMRL'
  //               }
  //             } else {
  //               // fail MRL (pass replicate-->fail CV-->fail MRL) = (overRep,overCV,underMRL)
  //               countData[`${threshID}`]["counts"]["occ"]["overCVUnderMRL"] += 1;
  //               if (pass_hierarchy['overCVUnderMRL'] > pass_hierarchy[max_pass]) {
  //                 max_pass = 'overCVUnderMRL'
  //               }
  //             }
  //           }
  //         } else {
  //           // If we failed replicate check, we should update max_pass
  //           // we pass the replicate threshold
  //           countData[`${threshID}`]["counts"]["occ"]["underRep"] += 1;
  //           if (pass_hierarchy['underRep'] > pass_hierarchy[max_pass]) {
  //             max_pass = 'underRep';
  //           }
  //         }
  //       } else {
  //         // n_abun = 0
  //         countData[`${threshID}`]["counts"]["occ"]["missing"] += 1
  //       }
  //     }
  //   } // END OF FEATURE

  //   return countData, max_pass

  // }

  /**
   * Function that updates the feature counts in the countData data structure based on the value of max_pass for a row
   * March 14, 2024
   * @param {Object} countData Main object with count data
   * @param {String} max_pass String that denotes the filtering level of a feature
   * @param {String} threshID Threshold key ("A" or "B")
   * @returns updated countData object
   */
  function update_feature_count(countData, max_pass, threshID) {
    // now we can determine our counts by using the max_pass string
    countData[`${threshID}`]["counts"]["feat"]["total"] += 1;
    if (max_pass === 'missing') {
      countData[`${threshID}`]["counts"]["feat"]["missing"] += 1;
    } else if (max_pass == 'present') {
      countData[`${threshID}`]["counts"]["feat"]["present"] += 1;
    } else if (max_pass === 'underRep') {
      countData[`${threshID}`]["counts"]["feat"]["present"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["underRep"] += 1;
    } else if (max_pass === 'overCVUnderMRL') {
      countData[`${threshID}`]["counts"]["feat"]["present"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overRep"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overCV"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overCVUnderMRL"] += 1;
    } else if (max_pass === 'overCVOverMRL') {
      countData[`${threshID}`]["counts"]["feat"]["present"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overRep"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overCV"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overCVOverMRL"] += 1;
    } else if (max_pass === 'underCVUnderMRL') {
      countData[`${threshID}`]["counts"]["feat"]["present"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overRep"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["underCV"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["underCVUnderMRL"] += 1;
    } else if (max_pass === 'underCVOverMRL') {
      countData[`${threshID}`]["counts"]["feat"]["present"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["overRep"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["underCV"] += 1;
      countData[`${threshID}`]["counts"]["feat"]["underCVOverMRL"] += 1;
    }

    return countData;
  }

  /**
   * Function for getting counts at both the occurence and Feature level simultaneously for both set of threshold values
   * March 14, 2024
   *  Updated: August 30, 2024
   *    - Error where header row was being usedas a feature, returning undefined values. Fixed by checking
   *      if the row is an array -- it should be an object.
   * @param {Object} countData 
   * @returns {Object} the updated myData object with new counts
   */
  function get_counts(countData) {
    // anytime this function is called, we need to reset the counts to zero
    countData = resetCounts(countData);

    // check first row of data to determine which string is used for MB
    var row_keys = Object.keys(data[1]);
    var blank_perc_header = false;
    for (let key of row_keys) {
      if (key.startsWith("Detection Percentage ")) {
        for (let valid_blank_string of ["MB", "Mb", "mb", "BLANK", "Blank", "blank", "BLK", "Blk"]) {
          if (key.includes(valid_blank_string)) {
            blank_perc_header = key;
            break;
          }
        }
      }
      if (blank_perc_header) {
        break;
      }
    }

    // iterate over rows once to get boolean array for blank replicate pass/fail
    for (let iRow in data) {
      var row = data[iRow];
      if (!(Array.isArray(row))) {

        if (row[blank_perc_header] >= countData["A"]["threshold"]["blankRep"]) {
          countData["A"]["threshold"]["blankRepPassArr"].push(true);
        } else {
          countData["A"]["threshold"]["blankRepPassArr"].push(false);
        }

        if (row[blank_perc_header] >= countData["B"]["threshold"]["blankRep"]) {
          countData["B"]["threshold"]["blankRepPassArr"].push(true);
        } else {
          countData["B"]["threshold"]["blankRepPassArr"].push(false);
        }
      }
    }

    // iterate over rows (features)
	var max_pass = "";
    for (let iRow in data) {
      var row = data[iRow];
      if (!(Array.isArray(row))) {
        countData, max_pass = get_counts_by_row(countData, row, "A", Number(iRow))
        if (max_pass === 'missing') {
          // console.log(row['Feature ID'])
        }
        if (max_pass) {
          countData = update_feature_count(countData, max_pass, "A")
        }

        countData, max_pass = get_counts_by_row(countData, row, "B", Number(iRow))
        if (max_pass) {
          countData = update_feature_count(countData, max_pass, "B")
        }
      }
    }

    return countData;
  }

  /**
   * Function for generating table
   * @param {Object} countData
   * @param {Bool} del If we want to delete the table before making a new one
   */
  function tableCreate(countData, del=true) {
    // remove table if it exists
    var element = document.getElementById('tTable');
    if (del) {
        element.parentNode.removeChild(element);
    }

    let objs = [countData["A"]["counts"]["occ"], countData["B"]["counts"]["occ"], countData["A"]["counts"]["feat"], countData["B"]["counts"]["feat"]]

    // setup column/row labels
    var row_names = [
      'Initial Input',
      "No Occurrences",
      'Failed CV',
      'Passed All'
    ];
    var col_names = [
      'Filter Label',
      'Occ A',
      'Occ B',
      'Feat A',
      'Feat B'
    ]

    // get the number of columns/rows
    const n_rows = row_names.length,
      n_columns = 5; // Filter; OccA; OccB; FeatA; FeatB

      // create <table> and <tbody> elements
      const tbl = document.createElement("table");
      tbl.setAttribute('id', 'tTable');
      tbl.setAttribute('class', 'logicTree')
      const tblBody = document.createElement("tbody");
      
      // creating cells --> | Count_name | Count_value |
      for (let i = 0; i <= n_rows; i++) {
        // creates a table row
        const row = document.createElement("tr");
        row.setAttribute('class', 'logicTree')

        for (let j = 0; j < n_columns; j++) {
          // create a <td> element and a text node, make the text for 
          // the node of <td> contents
          // if header, use <th> instead of <td>
          if (i === 0) {
            var cell = document.createElement("th");
            cell.setAttribute('class', 'logicTree')
            var cellText = document.createTextNode(col_names[j]);
          } else {
            var cell = document.createElement("td");
            cell.setAttribute('class', 'logicTree')
          }

          // if not first row, start adding data per row
          if (i !== 0) {
            // set data per column, first the filter label
            if (j === 0) {
              var cellText = document.createTextNode(row_names[i-1]);
            } else { // now other data dependant on our row
              if (i === 1) {
                var cellText = document.createTextNode(numberWithCommas(objs[j-1]['total']));
              } else if (i === 4) {
                var cellText = document.createTextNode(numberWithCommas(objs[j-1]['underCVOverMRL']));
              } else if (i === 3) {
                var cellText = document.createTextNode(numberWithCommas(objs[j-1]['overCVOverMRL']));
              } else if (i === 2) {
                var cellText = document.createTextNode(numberWithCommas(objs[j-1]['overCVUnderMRL'] + objs[j-1]['underCVUnderMRL'] + objs[j-1]['missing'] + objs[j-1]['underRep']));
              } 
            }
          } 

          cell.appendChild(cellText);
          row.appendChild(cell);
        }
        // add row to the end of table body
        tblBody.appendChild(row);
      }

      // put <tbody> in table
      tbl.appendChild(tblBody);
      // append <table> into <body>
      document.getElementById('myTable').appendChild(tbl);
      // styles and attributes
      tbl.setAttribute("border", "2");
      var windowHeight = window.screen.height;
      tbl.setAttribute("height", "20px");
  }

  /**
   * 
   * @param {Object} countData  The object that has count data for the SVG tree you want to build.
   * @param {String} divID      The ID for the outer div that holds the SVG you want to build. 
   * @param {String} svgID      The ID for the SVG you want to build.  
   */
  function createFeatTree(countData, divID, svgID, threshID) {
    var feat_counts = countData[`${threshID}`]["counts"]["feat"]
    // remove chart if it exists
    var chart = document.getElementById(divID);
    if (chart) {
      chart.children[0].innerHTML = ''
    }
    // get dimensions of window
    let svgWidth = 688,
      svgHeight = 500;

    // get y-positions of each row of the decision tree
    let contentPaddingTopFactor = 0.16,
      contentPaddingBottomFactor = 0.05,
      contentPaddingTop = contentPaddingTopFactor * svgHeight,
      contentPaddingBottom = contentPaddingBottomFactor * svgHeight,
      yTitle = contentPaddingTop * 0.38,                
      yRow01 = contentPaddingTop,                    
      yRow04 = svgHeight - contentPaddingBottom,      
      yRow02 = yRow01 + ((yRow04 - yRow01) / 3),      
      yRow03 = yRow02 + ((yRow04 - yRow01) / 3); 

    // get x-positions of each box
    let xTitle = svgWidth * 0.02,
      xTotalSampleOccurrence = 1.12 * svgWidth / 3,           
      xMissing = 2.1 * svgWidth / 3,
      xOverReplicateThreshold = 0.8 * svgWidth / 7,
      xUnderReplicateThreshold = 5.1 * svgWidth / 9,
      xUnderCVThreshold = svgWidth / 8.4,
      xOverCVThreshold = 5.4 * svgWidth / 9,
      xUnderCVOverMRL = svgWidth / 30,
      xUnderCVUnderMRL = 3.9 * svgWidth / 13,
      xOverCVOverMRL = 7.45 *svgWidth / 13,
      xOverCVUnderMRL = 10.4 * svgWidth / 13;

    // set colors for SVG elements. fc = facecolor; ec = edgecolor; tc = textcolor
    let pass_arrow_fc = '#FFF',
      pass_arrow_ec = '#000',
      nonDetect_arrow_fc = '#B2B2B2',
      nonDetect_arrow_ec = '#000',
      fail_arrow_fc = '#F999A4',
      fail_arrow_ec = '#9F1D37';

    let pass_box_fc = '#FFF',
      pass_box_ec = '#000',
      pass_box_tc = '#000',
      nonDetect_box_fc = '#B2B2B2',
      nonDetect_box_ec = '#000',
      nonDetect_box_tc = '#000',
      fail_box_fc = '#F999A4',
      fail_box_ec = '#9F1d37',
      fail_box_tc = '#000';

    // create SVG element
    let svg = document.getElementById(svgID);
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.style['background-color'] = 'white';

    let fontSizeText = "1rem";

    // add the title
    let textValue = 'Features   ' + svgID.charAt(svgID.length-4)
    let tag = `occ${svgID.charAt(svgID.length-4)}`; // for setting box ID on SVG children elements -- how arrows are drawn.
    svg = addTitleBox(svg, xTitle, yTitle, textValue, '2.0rem', 'rgba(0,0,0,0)', 'transparent', "black", `treeTitle${tag}`);

    // total sample occurrence text and box
    textValue = `Present &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    // addBox(svg, "text", "count_BGcolor", 'xcoord', 'ycoor', 'text', 'fontsize', 'box_ec', 'box_fc', 'box_tc', 'boxid' )
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['present']) + "  ", "#FFF", xTotalSampleOccurrence, yRow01, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nPresent${tag}`);

    

    // missing text and box
    textValue = `Missing &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['missing']) + "  ", "#FFF", xMissing, yRow01, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nMissing${tag}`);

    // over replicate text and box
    textValue = `&#8805 Replicate Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['overRep']) + "  ", "#FFF", xOverReplicateThreshold, yRow02, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nOverRep${tag}`);

    // under replicate text and box
    textValue = `< Replicate Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['underRep']) + "  ", "#FFF", xUnderReplicateThreshold, yRow02, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nUnderRep${tag}`);

    // under CV text and box
    textValue = `&#8804 CV Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['underCV']) + "  ", "#FFF", xUnderCVThreshold, yRow03, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nUnderCV${tag}`);

    // over CV text and box
    textValue = `> CV Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['overCV']) + "  ", "#FFF", xOverCVThreshold, yRow03, textValue, fontSizeText, fail_box_ec, fail_box_fc, fail_box_tc, `nOverCV${tag}`);

    // under CV over MRL
    textValue = `&#8805 MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['underCVOverMRL']) + "  ", "#FFF", xUnderCVOverMRL, yRow04, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nUnderCVOverMRL${tag}`);

    // under CV under MRL
    textValue = `< MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['underCVUnderMRL']) + "  ", "#FFF", xUnderCVUnderMRL, yRow04, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nUnderCVUnderMRL${tag}`);

    // over CV over MRL
    textValue = `&#8805 MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['overCVOverMRL']) + "  ", "#FFF", xOverCVOverMRL, yRow04, textValue, fontSizeText, fail_box_ec, fail_box_fc, fail_box_tc, `nOverCVOverMRL${tag}`);

    // over CV under MRL
    textValue = `< MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(feat_counts['overCVUnderMRL']) + "  ", "#FFF", xOverCVUnderMRL, yRow04, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nOverCVUnderMRL${tag}`);

    // add bifurcating arrows
    // addBifurcatingArrow('svg', 'id', 'bid', 'cid', 'arrowheadlen', 'a_ec', 'a_fc', 'b_ec', 'b_fc', 'c_ec', 'b_fc', 'textLeft', 'textRight')
    svg = addBifurcatingArrow(svg, `nPresent${tag}`, `nOverRep${tag}`, `nUnderRep${tag}`, 20, pass_arrow_ec, pass_arrow_fc, pass_arrow_ec, pass_arrow_fc, nonDetect_arrow_ec, nonDetect_arrow_fc, "Kept", "Removed");
    svg = addBifurcatingArrow(svg, `nOverRep${tag}`, `nUnderCV${tag}`, `nOverCV${tag}`, 20, pass_arrow_ec, pass_arrow_fc, pass_arrow_ec, pass_arrow_fc, fail_arrow_ec, fail_arrow_fc, "", "CV Flag");
    svg = addBifurcatingArrow(svg, `nUnderCV${tag}`, `nUnderCVOverMRL${tag}`, `nUnderCVUnderMRL${tag}`, 20, pass_arrow_ec, pass_arrow_fc, pass_arrow_ec, pass_arrow_fc, nonDetect_arrow_ec, nonDetect_arrow_fc, "", "MRL Flag");
    svg = addBifurcatingArrow(svg, `nOverCV${tag}`, `nOverCVOverMRL${tag}`, `nOverCVUnderMRL${tag}`, 20, fail_arrow_ec, fail_arrow_fc, fail_arrow_ec, fail_arrow_fc, nonDetect_arrow_ec, nonDetect_arrow_fc, "", "MRL Flag");

    // add text for Threshold values on SVG
    var replicateText = addText(45, 96, `<tspan>Replicate Threshold:</tspan>`, 18, "black");
    svg.appendChild(replicateText);
    var replicateText = addText(10, 118, `<tspan text-decoration="underline">Sample / Blank = ${countData[threshID]["threshold"]["rep"]}% / ${countData[threshID]["threshold"]["blankRep"]}%</tspan>`, 18, "black");
    svg.appendChild(replicateText);
    var replicateText = addText(20, 252, `<tspan text-decoration="underline">CV Threshold = ${countData[threshID]["threshold"]["cv"]}</tspan>`, 18, "black");
    svg.appendChild(replicateText);
    var replicateText = addText(10, 384, `<tspan text-decoration="underline">MRL Multiplier = ${countData[threshID]["threshold"]["mrl"]}</tspan>`, 18, "black");
    svg.appendChild(replicateText);

    // append svg to our container div
    document.getElementById(divID).appendChild(svg);
  }
  /**
   * 
   * @param {Object} countData The object that has count data for the SVG tree you want to build.
   * @param {String} divID      The ID for the outer div that holds the SVG you want to build. 
   * @param {String} svgID      The ID for the SVG you want to build.  
   */
  function createOccTree(countData, divID, svgID, threshID) {
    var occ_counts = countData[`${threshID}`]["counts"]["occ"]

    // remove chart if it exists
    var chart = document.getElementById(divID);
    if (chart) {
      chart.children[0].innerHTML = ''
    }
    // get dimensions of window
    let svgWidth = 688,
      svgHeight = 500;

    // get y-positions of each row of the decision tree
    let contentPaddingTopFactor = 0.16,
      contentPaddingBottomFactor = 0.05,
      contentPaddingTop = contentPaddingTopFactor * svgHeight,
      contentPaddingBottom = contentPaddingBottomFactor * svgHeight,
      yTitle = contentPaddingTop * 0.38,                
      yRow01 = contentPaddingTop,                    
      yRow04 = svgHeight - contentPaddingBottom,      
      yRow02 = yRow01 + ((yRow04 - yRow01) / 3),      
      yRow03 = yRow02 + ((yRow04 - yRow01) / 3); 

    // get x-positions of each box
    let xTitle = svgWidth * 0.02,
      xTotalSampleOccurrence = 1.12 * svgWidth / 3,           
      xMissing = 2.1 * svgWidth / 3,                  
      xOverReplicateThreshold = 0.8 * svgWidth / 7,     
      xUnderReplicateThreshold = 5.1 * svgWidth / 9,
      xUnderCVThreshold = svgWidth / 8.4,
      xOverCVThreshold = 5.4 * svgWidth / 9, 
      xUnderCVOverMRL = svgWidth / 30,
      xUnderCVUnderMRL = 3.9 * svgWidth / 13,
      xOverCVOverMRL = 7.22 *svgWidth / 13,
      xOverCVUnderMRL = 10.2 * svgWidth / 13;

    // set colors for SVG elements. fc = facecolor; ec = edgecolor; tc = textcolor
    let pass_arrow_fc = '#FFF',
      pass_arrow_ec = '#000',
      nonDetect_arrow_fc = '#B2B2B2',
      nonDetect_arrow_ec = '#000',
      fail_arrow_fc = '#F999A4',
      fail_arrow_ec = '#9F1D37';

    let pass_box_fc = '#FFF',
      pass_box_ec = '#000',
      pass_box_tc = '#000',
      nonDetect_box_fc = '#B2B2B2',
      nonDetect_box_ec = '#000',
      nonDetect_box_tc = '#000',
      fail_box_fc = '#F999A4',
      fail_box_ec = '#9F1d37',
      fail_box_tc = '#000';

    // create SVG element
    let svg = document.getElementById(svgID);
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.style['background-color'] = 'white';

    let fontSizeText = "1rem";

    // add the title
    let textValue = 'Occurrences   ' + svgID.charAt(svgID.length-4)
    let tag = `occ${svgID.charAt(svgID.length-4)}`; // for setting box ID on SVG children elements -- how arrows are drawn.
    svg = addTitleBox(svg, xTitle, yTitle, textValue, '2.0rem', 'rgba(0,0,0,0)', 'transparent', "black", `treeTitle${tag}`);

    // total sample occurrence text and box
    textValue = `Present &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['present']) + "  ", "#FFF", xTotalSampleOccurrence, yRow01, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nPresent${tag}`);

    // missing text and box
    textValue = `Missing &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['missing']) + "  ", "#FFF", xMissing, yRow01, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nMissing${tag}`);

    // over replicate text and box
    textValue = `&#8805 Replicate Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['overRep']) + "  ", "#FFF", xOverReplicateThreshold, yRow02, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nOverRep${tag}`);

    // under replicate text and box
    textValue = `< Replicate Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['underRep']) + "  ", "#FFF", xUnderReplicateThreshold, yRow02, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nUnderRep${tag}`);

    // under CV text and box
    textValue = `&#8804 CV Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['underCV']) + "  ", "#FFF", xUnderCVThreshold, yRow03, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nUnderCV${tag}`);

    // over CV text and box
    textValue = `> CV Threshold &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['overCV']) + "  ", "#FFF", xOverCVThreshold, yRow03, textValue, fontSizeText, fail_box_ec, fail_box_fc, fail_box_tc, `nOverCV${tag}`);

    // under CV over MRL
    textValue = `&#8805 MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['underCVOverMRL']) + "  ", "#FFF", xUnderCVOverMRL, yRow04, textValue, fontSizeText, pass_box_ec, pass_box_fc, pass_box_tc, `nUnderCVOverMRL${tag}`);

    // under CV under MRL
    textValue = `< MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['underCVUnderMRL']) + "  ", "#FFF", xUnderCVUnderMRL, yRow04, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nUnderCVUnderMRL${tag}`);

    // over CV over MRL
    textValue = `&#8805 MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['overCVOverMRL']) + "  ", "#FFF", xOverCVOverMRL, yRow04, textValue, fontSizeText, fail_box_ec, fail_box_fc, fail_box_tc, `nOverCVOverMRL${tag}`);

    // over CV under MRL
    textValue = `< MRL &nbsp&nbsp&nbsp <tspan fill="transparent"></tspan>`;
    svg = addBox(svg, "    " + numberWithCommas(occ_counts['overCVUnderMRL']) + "  ", "#FFF", xOverCVUnderMRL, yRow04, textValue, fontSizeText, nonDetect_box_ec, nonDetect_box_fc, nonDetect_box_tc, `nOverCVUnderMRL${tag}`);

    // add bifurcating arrows
    svg = addBifurcatingArrow(svg, `nPresent${tag}`, `nOverRep${tag}`, `nUnderRep${tag}`, 20, pass_arrow_ec, pass_arrow_fc, pass_arrow_ec, pass_arrow_fc, nonDetect_arrow_ec, nonDetect_arrow_fc, "Kept", "Removed");
    svg = addBifurcatingArrow(svg, `nOverRep${tag}`, `nUnderCV${tag}`, `nOverCV${tag}`, 20, pass_arrow_ec, pass_arrow_fc, pass_arrow_ec, pass_arrow_fc, fail_arrow_ec, fail_arrow_fc, "", "CV Flag");
    svg = addBifurcatingArrow(svg, `nUnderCV${tag}`, `nUnderCVOverMRL${tag}`, `nUnderCVUnderMRL${tag}`, 20, pass_arrow_ec, pass_arrow_fc, pass_arrow_ec, pass_arrow_fc, nonDetect_arrow_ec, nonDetect_arrow_fc, "", "MRL Flag");
    svg = addBifurcatingArrow(svg, `nOverCV${tag}`, `nOverCVOverMRL${tag}`, `nOverCVUnderMRL${tag}`, 20, fail_arrow_ec, fail_arrow_fc, fail_arrow_ec, fail_arrow_fc, nonDetect_arrow_ec, nonDetect_arrow_fc, "", "MRL Flag");

    // add text for Threshold values on SVG
    var replicateText = addText(45, 96, `<tspan>Replicate Threshold:</tspan>`, 18, "black");
    svg.appendChild(replicateText);
    var replicateText = addText(10, 118, `<tspan text-decoration="underline">Sample / Blank = ${countData[threshID]["threshold"]["rep"]}% / ${countData[threshID]["threshold"]["blankRep"]}%</tspan>`, 18, "black");
    svg.appendChild(replicateText);
    var replicateText = addText(20, 252, `<tspan text-decoration="underline">CV Threshold = ${countData[threshID]["threshold"]["cv"]}</tspan>`, 18, "black");
    svg.appendChild(replicateText);
    var replicateText = addText(10, 384, `<tspan text-decoration="underline">MRL Multiplier = ${countData[threshID]["threshold"]["mrl"]}</tspan>`, 18, "black");
    svg.appendChild(replicateText);

    // append svg to our container div
    document.getElementById(divID).appendChild(svg);
  }

  /**
   * Generates an SVG text node for our tree diagrams.
   * @param {Number} x X position of text node.
   * @param {Number} y Y position of text node.
   * @param {String} value Text you want written in the node.
   * @param {String} fontSize 
   * @param {String} fontColor 
   * @returns SVG txt node.
   */
  function addText(x, y, value, fontSize, fontColor) {
    var txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttributeNS(null, "x", x);     
    txt.setAttributeNS(null, "y", y); 
    txt.setAttributeNS(null, "font-size", fontSize);
    txt.setAttribute('fill', fontColor);
    txt.innerHTML = value;
    txt.setAttribute("xml:space", "preserve");
    txt.setAttribute('class', 'logicTree')
    return txt;
  }

  /**
   * Generates an SVG rect element.
   * @param {Number} x X coordinate of rect element.
   * @param {Number} y Y coordinate of rect element.
   * @param {Number} width Width of rect element.
   * @param {Number} height Height of rect element.
   * @param {String} stroke Outline color of rect element.
   * @param {String} fill Fill color of rect element.
   * @param {Number} strokeWidth Border width for rect element.
   * @param {String} boxId The ID for the SVG box element.
   * @returns SVG rect element.
   */
  function addRectangle(x, y, width, height, stroke, fill, strokeWidth, boxId) {
    var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke-width', strokeWidth);
    rect.setAttribute('rx', "5");
    rect.setAttribute('id', boxId)
    return rect
  }

  /**
   * Adds a title to some SVG element.
   * @param {SVGElement} svgElement The SVG object you want 
   * @param {Number} xText X position of text.
   * @param {Number} yText Y position of text.
   * @param {String} valueText Text you want to be used as the title.
   * @param {String} fontSizeText 
   * @param {String} boxOutlineColor 
   * @param {String} boxFill 
   * @param {String} fontColor 
   * @param {String} boxId The ID for the title box element.
   * @returns Your SVG element with a title added.
   */
  function addTitleBox(svgElement, xText, yText, valueText, fontSizeText, boxOutlineColor, boxFill, fontColor, boxId) {
    var text = addText(xText, yText, valueText, fontSizeText, fontColor);
    svgElement.appendChild(text);
    var bbox = text.getBBox();
    var textWidth = bbox.width;
    var textHeight = bbox.height;
    var widthBox = textWidth * 1.1;
    var heightBox = textHeight * 1.8;
    var xBox = xText - (widthBox - textWidth)/2;
    var yBox = yText - textHeight - 0.11*heightBox;
    var rect = addRectangle(xBox, yBox, widthBox, heightBox, boxOutlineColor, boxFill, 2.5, boxId);
    svgElement.removeChild(text); // remove child then add again so it is on top... needed to append earlier to get dims
    svgElement.appendChild(rect);
    svgElement.appendChild(text);

    return svgElement;
  }

  /**
   * Adds a nested rect for highlighting counts in svg rect elements.
   * @param {SVGElement} svgElement SVG element you want to append.
   * @param {String} n The number (count) you want put in the box.
   * @param {String} nBGColor Background color of the box that the count is in.
   * @param {Number} xText 
   * @param {Number} yText 
   * @param {String} valueText 
   * @param {String} fontSizeText 
   * @param {String} boxOutlineColor 
   * @param {String} boxFill 
   * @param {String} fontColor 
   * @param {String} boxId Identifier for the box.
   * @returns Your SVG element with the appended box.
   */
  function addBox(svgElement, n, nBGColor, xText, yText, valueText, fontSizeText, boxOutlineColor, boxFill, fontColor, boxId) {
    // start by building the text box WITHOUT the count n value to get coordinates
    var textNoN = addText(xText, yText, valueText, fontSizeText, fontColor);
    svgElement.appendChild(textNoN);
    var bbox = textNoN.getBBox(),
      textNoNWidth = bbox.width,
      textNoNHeight = bbox.height,
      textNoNBoxHeight = 2 * textNoNHeight,
      xBoxRight = xText + (textNoNWidth),
      yBox = yText - textNoNBoxHeight - 0.11*textNoNBoxHeight;
    svgElement.removeChild(textNoN);

    // now we can build our secondary box
    var nBGText = "<tspan fill='black'></tspan><tspan fill='black'>" + n + "</tspan>  ",
      textN = addText(xBoxRight -13, yText, nBGText, fontSizeText, fontColor);
    svgElement.appendChild(textN);
    var bbox = textN.getBBox(),
      xBoxN = xBoxRight - 10;
    svgElement.removeChild(textN);

    // now we want to build the full box with the n count set to transparent within the tspan to get proper width of box
    var text = addText(xText, yText, valueText, fontSizeText, fontColor);
    if (text.childNodes[1]) {
        var tspan = text.childNodes[1];
    } else {
        var tspan = text.childNodes[0];
    }
    tspan.innerHTML = "<tspan fill='transparent'>" + n + "</tspan>";

    svgElement.appendChild(text);
    var bbox = text.getBBox(),
      textWidth = bbox.width,
      textHeight = bbox.height,
      widthBox = textWidth * 1.1,
      heightBox = textHeight * 1.9,
      xBox = xText - (widthBox - textWidth)/2,
      yBox = yText - textHeight - 0.11*heightBox,
      rect = addRectangle(xBox, yBox, widthBox, heightBox, boxOutlineColor, boxFill, 2.5, boxId);
    svgElement.removeChild(text);

    // now we should create the background rectangle for our count n
    var n_value = addText(xBoxN, yBox, nBGText, fontSizeText, fontColor);
    svgElement.appendChild(n_value)
    var bbox = n_value.getBBox(),
      nWidth = bbox.width,
      nHeight = bbox.height,
      nBoxWidth = 0.9 * nWidth,
      nBoxHeight = 1.4 * nHeight,
      yBoxN = (yBox + heightBox/2) - (0.5 * nBoxHeight),
      rectN = addRectangle(xBoxN, yBoxN, nBoxWidth, nBoxHeight, "black", nBGColor, 1, "back");
    svgElement.removeChild(n_value);
    
    // add elements to SVG in proper order
    svgElement.appendChild(rect);
    svgElement.appendChild(rectN);
    svgElement.appendChild(text);
    svgElement.appendChild(textN);

    return svgElement;
  }

  /**
   * Adds a horizontal arrow pointing from box aId to box bId.
   * @param {SVGElement} svgElement SVG element you want to append an arrow to.
   * @param {String} aId Identifier for the first SVG rect you want to point from.
   * @param {String} bId Identifier for the second SVG rect you want to point to.
   * @param {Number} arrowHeadLength Length of arrow head.
   * @param {String} strokeColor 
   * @param {String} fillColor 
   * @returns Your updated SVG element with an arrow added.
   */
  function addSingleHorizontalArrow(svgElement, aId, bId, arrowHeadLength, strokeColor, fillColor) {
    // Currently assumes that aID is to the left of bID... would be easy to generalize with some logic
    var boxA = document.getElementById(aId),
      boxB = document.getElementById(bId),
      bboxA = boxA.getBBox(), // { x: Number, y: Number, width: Number, height: Number }
      bboxB = boxB.getBBox(),
      xA = bboxA.x,
      yA = bboxA.y,
      widthA = bboxA.width,
      heightA = bboxA.height,
      xB = bboxB.x,
      yB = bboxB.y,
      heightB = bboxB.height,
      firstOffset = 0.2 * heightA, // first offset in y from middle
      secondOffset = 0.2 * heightA; // second offset in y to create arrow head

    // find vertices of arrow
    var x0 = xA + widthA,
      y0 = yA + heightA/2 + firstOffset,
      x1 = xB - arrowHeadLength,
      y1 = y0,
      x2 = x1,
      y2 = y1 + secondOffset,
      x3 = xB,
      y3 = yB + heightB/2,
      x4 = x2,
      y4 = y2 - 2 * (secondOffset + firstOffset),
      x5 = x4,
      y5 = y4 + firstOffset,
      x6 = x0,
      y6 = y0 - 2 * firstOffset;

    var points = `${x0} ${y0}, ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}, ${x4} ${y4}, ${x5} ${y5}, ${x6} ${y6}, ${x0} ${y0}`;

    var arrow = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    arrow.setAttribute('points', points);
    arrow.setAttribute('stroke', strokeColor);
    arrow.setAttribute('fill', fillColor);
    arrow.setAttribute('stroke-width', 1.5);

    svgElement.appendChild(arrow);

    return svgElement;
  }

  /**
   * Adds Bifurcating arrow from aId to bId/cId.
   * @param {SVGElement} svgElement SVG element you want to add arrow to.
   * @param {String} aId Identifier for box A.
   * @param {String} bId Identifier for box B.
   * @param {String} cId Identifier for box C.
   * @param {Number} arrowHeadLength 
   * @param {String} aStrokeColor 
   * @param {String} aFillColor 
   * @param {String} bStrokeColor 
   * @param {String} bFillColor 
   * @param {String} cStrokeColor 
   * @param {String} cFillColor 
   * @param {String} textLeft Text to be appended above the left branch of arrow.
   * @param {String} textRight Text to be appended above the right branch of arrow.
   * @returns Your SVG element with a bifurcating arrow appended.
   */
  function addBifurcatingArrow(svgElement, aId, bId, cId, arrowHeadLength, aStrokeColor, aFillColor, bStrokeColor, bFillColor, cStrokeColor, cFillColor, textLeft, textRight) {
    var textColor = 'black';
    // aId is top box, bId is bottom left, cId is bottom right
    var boxA = document.getElementById(aId),
      boxB = document.getElementById(bId),
      boxC = document.getElementById(cId),
      bboxA = boxA.getBBox(), // { x: Number, y: Number, width: Number, height: Number }
      bboxB = boxB.getBBox(),
      bboxC = boxC.getBBox(), 
      xA = bboxA.x,
      yA = bboxA.y,
      widthA = bboxA.width,
      heightA = bboxA.height,
      xB = bboxB.x,
      yB = bboxB.y,
      widthB = bboxB.width,
      xC = bboxC.x,
      yC = bboxC.y,
      widthC = bboxC.width,
      widthOffset = 0.2 * heightA,
      tipOffset = 0.2 * heightA;

    // get vertices for first rectangle
    var v0x = xA + (widthA / 2) - widthOffset,
      v0y = yA + heightA + 1.1,
      v1x = v0x,
      v1y = (v0y + yB) / 2,
      v2x = v1x + (widthOffset * 2),
      v2y = v1y,
      v3x = v2x,
      v3y = v0y;

    var points = `${v0x} ${v0y}, ${v1x} ${v1y}, ${v2x} ${v2y}, ${v3x} ${v3y}`;

    var arrow = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    arrow.setAttribute('points', points);
    arrow.setAttribute('stroke', aStrokeColor);
    arrow.setAttribute('fill', aFillColor);
    arrow.setAttribute('stroke-width', 1.5);

    svgElement.appendChild(arrow);

    // get vertices for second rectangle
    var u0x = xA + (widthA / 2),
      u0y = v1y - widthOffset,
      u1x = xB + (widthB / 2) - widthOffset,
      u1y = u0y,
      u2x = u1x,
      u2y = yB - arrowHeadLength,
      u3x = u2x - tipOffset,
      u3y = u2y,
      u4x = xB + (widthB / 2),
      u4y = yB - 1,
      u5x = xB + (widthB / 2) + widthOffset + tipOffset,
      u5y = u2y,
      u6x = u5x - tipOffset,
      u6y = u5y,
      u7x = u6x,
      u7y = u0y + (2 * widthOffset),
      u8x = u0x,
      u8y = u7y;

    var points = `${u0x} ${u0y}, ${u1x} ${u1y}, ${u2x} ${u2y}, ${u3x} ${u3y}, ${u4x} ${u4y}, ${u5x} ${u5y}, ${u6x} ${u6y}, ${u7x} ${u7y}, ${u8x} ${u8y}`;

    var arrow = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    arrow.setAttribute('points', points);
    arrow.setAttribute('stroke', bStrokeColor);
    arrow.setAttribute('fill', bFillColor);
    arrow.setAttribute('stroke-width', 1.8);

    svgElement.appendChild(arrow);
    
    // get vertices for third rectangle
    var w0x = xA + (widthA / 2),
      w0y = v1y - widthOffset,
      w1x = xC + (widthC / 2) + widthOffset,
      w1y = w0y,
      w2x = w1x,
      w2y = yC - arrowHeadLength,
      w3x = w2x + tipOffset,
      w3y = w2y,
      w4x = xC + (widthC / 2),
      w4y = yC - 1,
      w5x = xC + (widthC / 2) - widthOffset - tipOffset,
      w5y = w2y,
      w6x = w5x + tipOffset,
      w6y = w5y,
      w7x = w6x,
      w7y = w0y + (2 * widthOffset),
      w8x = w0x,
      w8y = w7y;

    var points = `${w0x} ${w0y}, ${w1x} ${w1y}, ${w2x} ${w2y}, ${w3x} ${w3y}, ${w4x} ${w4y}, ${w5x} ${w5y}, ${w6x} ${w6y}, ${w7x} ${w7y}, ${w8x} ${w8y}`;

    var arrow = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    arrow.setAttribute('points', points);
    arrow.setAttribute('stroke', cStrokeColor);
    arrow.setAttribute('fill', cFillColor);
    arrow.setAttribute('stroke-width', 1.8);

    svgElement.appendChild(arrow);

    // add text elements
    var xTextL = (u0x + u1x) / 2,
      xTextR = (w1x + w0x) / 2,
      yText = u0y - widthOffset;

    var textL = addText(xTextL, yText, textLeft, 16, textColor);
    svgElement.appendChild(textL);
    var bbox = textL.getBBox();
    svgElement.removeChild(textL);
    var textLWidth = bbox.width;
    xTextL -= textLWidth / 2;
    var textL = addText(xTextL, yText, textLeft, 16, textColor);
    svgElement.appendChild(textL);
    textL.setAttribute("font-style", "italic");

    var textR = addText(xTextR, yText, textRight, 16, textColor);
    svgElement.appendChild(textR);
    var bbox = textR.getBBox();
    svgElement.removeChild(textR);
    var textRWidth = bbox.width;
    xTextR -= textRWidth / 2;
    var textR = addText(xTextR, yText, textRight, 16, textColor);
    svgElement.appendChild(textR);
    textR.setAttribute("font-style", "italic");

    return svgElement;
  }

  /**
   * Function for converting into a string with commas separating 3 digits.
   * @param {Number} x The number you want to convert.
   * @returns x with commas separating every 3 digits
   */
  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  /**
   * Downloads an SVG with an id to path.
   * @param {String} SVGid Identifier for the SVG to download.
   * @param {String} DIVid Identifier for the div that contains the SVG.
   * @param {String} path Download path.
   */
  function downloadSVG(svg, path) {
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);

    //add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    //convert svg source to URI data scheme.
    var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

    //set url value to a element's href attribute.
    downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = path;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
})

