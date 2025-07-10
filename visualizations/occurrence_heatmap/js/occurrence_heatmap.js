import * as dataUtils from "./dataUtils.js";
import * as heatmapUtils from "./heatmapUtils.js";

import * as THREE from "three";

async function createOccurrenceHeatmap(
  csvPathOccurrence,
  csvPathParameters,
  data = null,
  minSample = null,
  minBlank = null,
  maxCv = null,
  mrlMult = null
) {
  // read in and parse data from files
  // var [
  //   data,
  //   minReplicateHitsPercent,
  //   minReplicateBlankHitPercent,
  //   maxReplicateCvValue,
  //   MrlMult,
  // ] = dataUtils.getOccurrenceAndParameterData(dataXlsxPath);
  let fetchedData; // Declare fetchedData outside the block

  try {
    // Use the variables declared outside the block for destructuring
    [
      fetchedData,
      minReplicateHitsPercent,
      minReplicateBlankHitPercent,
      maxReplicateCvValue,
      MrlMult,
    ] = await dataUtils.getOccurrenceAndParameterData(csvPathOccurrence, csvPathParameters);

    console.log('data1');
    console.log(fetchedData);

  } catch (error) {
    console.error('Error loading data:', error);
  }

  console.log('data2');
  console.log(fetchedData); // This should now correctly log the fetched data

  if (minSample !== null) {
    var minReplicateHitsPercent = minSample;
    var minReplicateBlankHitPercent = minBlank;
    var maxReplicateCvValue = maxCv;
    var MrlMult = mrlMult;
  }

  let thresholdData = {
    minReplicateBlankHitPercent,
    minReplicateHitsPercent,
    maxReplicateCvValue,
    MrlMult,
  };

  // console.log('data')
  // console.log(data)

  // get unique sample headers
  const sampleGroups = dataUtils.getUniqueSampleHeaders(fetchedData);

  // find the blank sample names
  const [blankMeanHeader, blankStdHeader, blankRepPerHeader] =
    dataUtils.getBlankHeaders(sampleGroups);

  // get rep_percent, CV and Mean cols for data
  const [repColHeaders, cvColHeaders, meanColHeaders] =
    dataUtils.getRepCvMeanHeaders(sampleGroups);

  // Calculate the MRL
  data = dataUtils.calcMRL(
    fetchedData,
    blankMeanHeader,
    blankStdHeader,
    blankRepPerHeader,
    MrlMult,
    minReplicateBlankHitPercent
  );

  // get subset of data for CV columns
  let cvData = dataUtils.getCvSubset(data, cvColHeaders);

  // replace cvValues with null if don't pass n_abun / MRL cutoffs
  let cvDataDiscrete = dataUtils.cleanCvDataAndGetDiscretizedData(
    cvData,
    data,
    minReplicateBlankHitPercent,
    minReplicateHitsPercent,
    maxReplicateCvValue,
    repColHeaders,
    cvColHeaders,
    meanColHeaders,
    blankRepPerHeader
  );

  // flatten data for generating three.js heatmap
  let cvDataFlat;
  [cvDataFlat, data] = dataUtils.getFlattenedCvData(
    cvDataDiscrete,
    data,
    sampleGroups
  );

  // get counts (n_samples, n_features, n_passes for each sample)
  const nFeatures = cvDataDiscrete.length;
  const samplePassCounts = dataUtils.getSamplePassCounts(cvDataFlat, nFeatures);

  // we need counts for how many cells are red, grey and white
  let [redCount, greyCount, whiteCount] = dataUtils.getColorCounts(cvDataFlat);

  // draw heatmap
  drawHeatMap();

  function drawHeatMap() {
    // await new Promise(r => setTimeout(r, 3000));
    // determine number of rows and columns
    const nRows = cvColHeaders.length;
    const nCols = cvDataDiscrete.length;
    const nCells = nRows * nCols;

    // setup graph and cell dims
    const margin = { top: 75, right: 0, bottom: 75, left: 0 };
    const width = 1300 - margin.left - margin.right;
    const height = 725 - margin.top - margin.bottom;
    const paddingHeight = 100;
    const paddingWidth = 100;
    const actualWidth = width + paddingWidth * 2;
    const actualHeight = height + paddingHeight * 2;

    const cellHeight = height / nRows;
    const cellWidth = width / nCols;
    const apparentCellWidth = cellWidth * 1.125; // prevents gaps in between columns

    const dimsObject = {
      width,
      height,
      paddingWidth,
      paddingHeight,
      actualWidth,
      actualHeight,
      cellHeight,
      cellWidth,
      apparentCellWidth,
    };

    // setup the renderers, cameras, orbitControls and scene
    let [
      canvas,
      renderer,
      labelRenderer,
      camera,
      cameraDefaults,
      orbitControls,
      scene,
    ] = heatmapUtils.setTheScene("heatmap", dimsObject);

    // set renderer bg color
    renderer.setClearColor(0xffffff, 1);

    // set dims and geometry for heatmap graph, and heatmap cells
    const [graphGeometry, cellGeometry, horzLineGeo, vertLineGeo] =
      heatmapUtils.getGeometries(dimsObject);

    const vertLineLimit = 60; // diff in x zoomed coords for showing vertical line separators

    // setup materials (the colors for graph bg, cells and axes)
    const [
      redMaterial,
      greyMaterial,
      whiteMaterial,
      clearMaterial,
      zoomBoxMaterial,
      blackMaterial,
    ] = heatmapUtils.getMaterials();

    // create instanced mesh objects, to prevent creating a new mesh for each cell of the heatmap
    let redMesh = heatmapUtils.createInstancedMesh(
      cellGeometry,
      redMaterial,
      redCount
    );
    let greyMesh = heatmapUtils.createInstancedMesh(
      cellGeometry,
      greyMaterial,
      greyCount
    );
    let whiteMesh = heatmapUtils.createInstancedMesh(
      cellGeometry,
      whiteMaterial,
      whiteCount
    );

    redMesh.renderOrder = 998; // ensure redMesh is rendered on top

    // create a single group for the cell meshes and add to the scene
    const heatmapGroup = new THREE.Group();
    heatmapGroup.add(redMesh);
    heatmapGroup.add(greyMesh);
    heatmapGroup.add(whiteMesh);

    scene.add(heatmapGroup);

    // find cell positions and colors, get red cell instances for animation later
    const redCellInstances = heatmapUtils.setCellColorAndPos(
      cvDataFlat,
      dimsObject,
      greyMesh,
      redMesh,
      whiteMesh
    );

    // add a transparent mesh to house the graph title/labels/partitions
    const graphMesh = new THREE.Mesh(graphGeometry, clearMaterial);
    scene.add(graphMesh);

    // add title, x-axis label, y-axis labels, horizontal and vertical partition lines
    heatmapUtils.addTitle(canvas, thresholdData, dimsObject, graphMesh);
    heatmapUtils.addXAxisLabel(canvas, dimsObject, graphMesh);
    heatmapUtils.addYAxisLabelsAndHorzLines(
      canvas,
      sampleGroups,
      dimsObject,
      horzLineGeo,
      blackMaterial,
      graphMesh,
      scene
    );
    let vertLineObjects = heatmapUtils.getVertLines(
      dimsObject,
      nFeatures,
      vertLineGeo,
      blackMaterial
    );

    // set up rendering loop
    animate();

    // build on-hover tooltips for cells, y-axis labels and title
    const titleTooltip = heatmapUtils.buildTitleTooltip();
    const yAxisTooltip = heatmapUtils.buildYAxisTooltip();
    const tooltip = heatmapUtils.buildTooltip();

    // add event listeners for title (show tooltip on-hover; highlight red cells on click)
    const heatmapTitleDiv = document.querySelector(".title");

    heatmapTitleDiv.addEventListener("mouseenter", (e) => {
      heatmapUtils.mouseenterTitleEvent(
        e,
        samplePassCounts,
        titleTooltip,
        heatmapTitleDiv,
        dimsObject
      );
    });

    heatmapTitleDiv.addEventListener("mouseout", () => {
      heatmapUtils.mouseoutTitleEvent(titleTooltip, heatmapTitleDiv);
    });

    var redCellZoomed = false;
    heatmapTitleDiv.addEventListener("click", (e) => {
      redCellZoomed = heatmapUtils.clickTitleEvent(
        e,
        redCellInstances,
        redMesh,
        redCellZoomed
      );
    });

    // add event listeners for y-axis labels
    const yAxisLabelDivs = document.querySelectorAll(".yAxisLabel");
    yAxisLabelDivs.forEach((label) => {
      label.addEventListener("mouseenter", (e) => {
        heatmapUtils.mouseenterYAxisLabelEvent(
          e,
          label,
          samplePassCounts,
          yAxisTooltip,
          dimsObject
        );
      });

      label.addEventListener("mouseout", () => {
        heatmapUtils.mouseoutYAxisLabelEvent(null, label, yAxisTooltip);
      });
    });

    // now add event listeners for the cells. First set some needed variables
    var greenCheck = "&#x2705;";
    var redX = "&#x274c";

    let startX, startY, zoomBoxGeometry, zoomBox, line;
    let cachedZoomBox = null;
    let zoomed = false;
    let cachedOrbitControl = {
      x: orbitControls.target.x,
      y: orbitControls.target.y,
      z: 0,
    };

    const raycaster = new THREE.Raycaster(); // for detecting on-hovers for heatmap cells
    const mousePos = new THREE.Vector2(); // keep track of the mouse position

    canvas.addEventListener("mousedown", (e) => {
      [startX, startY, zoomBox, zoomBoxGeometry] =
        heatmapUtils.mousedownCellEvent(
          e,
          startX,
          startY,
          zoomBox,
          zoomBoxGeometry,
          zoomed
        );
    });

    canvas.addEventListener("mousemove", (e) => {
      heatmapUtils.mousemoveCellEvent(
        e,
        renderer,
        heatmapGroup,
        redMesh,
        whiteMesh,
        greyMesh,
        mousePos,
        raycaster,
        cvDataFlat,
        tooltip,
        zoomBox,
        startX,
        startY,
        zoomBoxGeometry,
        zoomBoxMaterial,
        line,
        scene,
        camera,
        cameraDefaults,
        redX,
        greenCheck
      );
    });

    canvas.addEventListener("mouseup", (e) => {
      [zoomBox, cachedZoomBox, zoomed, redCellZoomed] =
        heatmapUtils.mouseupCellEvent(
          e,
          scene,
          zoomBox,
          camera,
          cameraDefaults,
          orbitControls,
          cachedZoomBox,
          graphMesh,
          redMesh,
          zoomed,
          redCellZoomed,
          redCellInstances,
          vertLineObjects,
          vertLineLimit,
          dimsObject
        );
    });

    // add event listener to toggle back and forth between last zoom
    document.addEventListener("keydown", async (e) => {
      [zoomed, redCellZoomed] = await heatmapUtils.keydownDocEvent(
        e,
        scene,
        camera,
        cameraDefaults,
        zoomed,
        cachedZoomBox,
        orbitControls,
        graphMesh,
        vertLineObjects,
        vertLineLimit,
        dimsObject,
        cachedOrbitControl,
        redMesh,
        redCellInstances,
        redCellZoomed
      );
    });

    // update orbitControls to only allow panning when zoomed

    orbitControls.addEventListener("start", () => {
      if (!zoomed) {
        orbitControls.enablePan = false;
      }
    });

    canvas.addEventListener("mousemove", () => {
      if (zoomed) {
        orbitControls.enablePan = true;
        orbitControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
        orbitControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        orbitControls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
        cachedOrbitControl = {
          x: orbitControls.target.x,
          y: orbitControls.target.y,
          z: 0,
        };
      } else {
        orbitControls.enablePan = false;
      }
    });

    // animate function for rendering scene/animating
    function animate() {
      requestAnimationFrame(animate);
      TWEEN.update();
      orbitControls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }

    function createControls() {
      const canvasRect = canvas.getBoundingClientRect();
      const controls = document.createElement("div");
      controls.id = "controls";
      controls.style.padding = "10px";
      controls.style.border = "1px solid black";
      controls.style.borderRadius = "4px";
      controls.style.display = "block";
      controls.style.position = "absolute";
      controls.style.marginTop = "0px";
      controls.style.top =
        canvasRect.top +
        height +
        window.scrollY -
        paddingHeight * 1.65 -
        10 +
        "px";
      controls.style.left =
        canvasRect.left + canvasRect.width + window.scrollX + 10 + "px";
      controls.style.width = "305px";

      const sliders = [
        {
          id: "replicateSampleThreshold",
          label: "Sample Replicate Threshold",
          min: 0,
          max: 100,
          step: 0.1,
          value: minReplicateHitsPercent,
        },
        {
          id: "replicateBlankThreshold",
          label: "Blank Replicate Threshold",
          min: 0,
          max: 100,
          step: 0.1,
          value: minReplicateBlankHitPercent,
        },
        {
          id: "cvThreshold",
          label: "CV Threshold",
          min: 0,
          max: 3,
          step: 0.01,
          value: maxReplicateCvValue,
        },
        {
          id: "mrlMultiplier",
          label: "MRL Multiplier",
          min: 0,
          max: 10,
          step: 1,
          value: MrlMult,
        },
      ];

      sliders.forEach((slider) => {
        const sliderContainer = document.createElement("div");
        sliderContainer.style.margin = "10px auto";

        const label = document.createElement("label");
        label.innerHTML = slider.label;
        label.style.display = "inline-block";
        label.style.width = "200px";

        const input = document.createElement("input");
        input.type = "range";
        input.id = slider.id;
        input.min = slider.min;
        input.max = slider.max;
        input.step = slider.step;
        input.value = slider.value;
        input.style.width = "200px";

        const inputBox = document.createElement("input");
        inputBox.type = "number";
        inputBox.id = slider.id + "Box";
        inputBox.min = slider.min;
        inputBox.max = slider.max;
        inputBox.step = slider.step;
        inputBox.value = slider.value;
        inputBox.style.width = "75px";
        inputBox.style.marginLeft = "10px";
        inputBox.style.borderRadius = "3px";

        if (inputBox.id === "mrlMultiplierBox") {
          inputBox.readOnly = true;
        }

        input.addEventListener("input", () => {
          if (input.id === "mrlMultiplier") {
            if (input.value < 4) {
              input.value = 3;
            } else if (input.value < 7.5) {
              input.value = 5;
            } else {
              input.value = 10;
            }
          }
          inputBox.value = input.value;
        });
        inputBox.addEventListener("input", () => {
          if (inputBox.value > slider.max) {
            inputBox.value = slider.max;
          } else if (inputBox.value < slider.min) {
            inputBox.value = slider.min;
          }
          input.value = inputBox.value;
        });
        input.addEventListener("mouseup", () => {
          const minReplicateHitsPercent = parseFloat(
            document.getElementById("replicateSampleThreshold").value
          );
          const minReplicateBlankHitPercent = parseFloat(
            document.getElementById("replicateBlankThreshold").value
          );
          const maxReplicateCvValue = parseFloat(
            document.getElementById("cvThreshold").value
          );
          const mrlMult = parseFloat(
            document.getElementById("mrlMultiplier").value
          );

          const children = Array.from(
            document.getElementById("heatmap-container").children
          );

          children.forEach((child) => {
            if (
              child.id !== "loadDataBtn" &&
              child.id !== "controls" &&
              child.tagName.toLowerCase() !== "script"
            ) {
              child.remove();
            }
          });

          createOccurrenceHeatmap(
            csvPathOccurrence,
            csvPathParameters,
            data,
            minReplicateHitsPercent,
            minReplicateBlankHitPercent,
            maxReplicateCvValue,
            mrlMult
          );
        });
        inputBox.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            const minReplicateHitsPercent = parseFloat(
              document.getElementById("replicateSampleThreshold").value
            );
            const minReplicateBlankHitPercent = parseFloat(
              document.getElementById("replicateBlankThreshold").value
            );
            const maxReplicateCvValue = parseFloat(
              document.getElementById("cvThreshold").value
            );
            const mrlMult = parseFloat(
              document.getElementById("mrlMultiplier").value
            );

            const children = Array.from(
              document.getElementById("heatmap-container").children
            );

            children.forEach((child) => {
              if (
                child.id !== "loadDataBtn" &&
                child.id !== "controls" &&
                child.tagName.toLowerCase() !== "script"
              ) {
                child.remove();
              }
            });

            createOccurrenceHeatmap(
              csvPathOccurrence,
              csvPathParameters,
              data,
              minReplicateHitsPercent,
              minReplicateBlankHitPercent,
              maxReplicateCvValue,
              mrlMult
            );
          }
        });

        sliderContainer.appendChild(label);
        sliderContainer.appendChild(input);
        sliderContainer.appendChild(inputBox);
        controls.appendChild(sliderContainer);
      });

      document.body.appendChild(controls);
    }

    const sliderCheck = document.getElementById("replicateSampleThreshold");
    if (sliderCheck === null) {
      createControls();
    }
  }
}

// function loadHeatmap() {
//   fetch('/data/Example_nta_NTA_WebApp_results.xlsx')
//   .then(response => response.arrayBuffer()) // read file as array buffer
//   .then(data => {
//     const workbook = XLSX.read(data, { type: 'array' });

//     // call the main function that cleans data and draws heatmap
//     createOccurrenceHeatmap(workbook);
//   });
// }

// // Use the global XLSX object provided by the CDN
// function loadHeatmap() {
//   fetch("./data/Example_nta_NTA_WebApp_results.xlsx")
//     .then((response) => response.arrayBuffer()) // read file as array buffer
//     .then((data) => {
//       const workbook = XLSX.read(data, { type: "array" });

//       // call the main function that cleans data and draws heatmap
//       createOccurrenceHeatmap(workbook);
//     });
// }

function loadHeatmap() {
  // const csvPathOccurrence = "./data/20250709_test_file_run/Example_NTA_for_QAQC_visuals.csv";
  // const csvPathParameters = "./data/20250709_test_file_run/Analysis_parameters.csv";
  const csvPathOccurrence = "./data/20250709_NTAW807/Method_1_-_HLB_for_QAQC_visuals.csv";
  const csvPathParameters = "./data/20250709_NTAW807/Analysis_parameters.csv";
  createOccurrenceHeatmap(csvPathOccurrence, csvPathParameters);
}

loadHeatmap();

///// uncomment these lines and the button in index.html to create heatmap on button click
// document.getElementById("loadDataBtn").addEventListener('click', () => {
//   loadHeatmap();
// });
