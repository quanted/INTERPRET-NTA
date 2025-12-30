import * as dataUtils from "./dataUtils.js";
import * as heatmapUtils from "./heatmapUtils.js";
import * as THREE from "three";

async function createIntensityHeatmap(path, data = null) {
  // read in and parse data from input data file
  try {
    // Use the variables declared outside the block for destructuring
    data = await dataUtils.getIntensityData(path);
  } catch (error) {
    console.error("Error loading data:", error);
  }

  // get a list of the raw sample column headers from the csv
  const sampleHeaders = data.columns.filter((col) => col !== "Feature ID");

  // get a list of the sorted unique sample names from the csv.
  const sampleGroups = dataUtils.getUniqueSampleHeaders(data);

  // determine if sample names have training underscores
  const hasTrailingUnderscores =
    dataUtils.hasTrailingUnderscores(sampleHeaders);

  // replace null intensity values with 0
  var rawData = dataUtils.GetTransformedData(data);

  // Get the log transformed data
  const log10Data = heatmapUtils.Log10Data(rawData, sampleHeaders);
  var isLog10View = true;

  // For each feature ID, add a column containing the number of samples with intensity values greater than 0
  // and add a column containing sum abundance of all sample columns
  const dataWithMeta = dataUtils.addDetectionCountAndSum(
    log10Data,
    sampleHeaders
  );

  const sortedData = dataUtils.sortFeatures(dataWithMeta);
  // flatten data for generating three.js heatmap. Each entry is a cell in the heatmap.
  let dataFlat;
  dataFlat = dataUtils.getFlattenedData(
    sortedData,
    sampleHeaders,
    sampleGroups
  );

  const nFeatures = data.length; // number of unique features in the data
  const featureCounts = dataUtils.getFeatureCounts(dataFlat); // number of features detected in each sample

  // we need counts for how many cells are colored and white
  let [coloredCount, whiteCount] = dataUtils.getColorCounts(dataFlat);

  // draw heatmap
  drawHeatMap();

  function drawHeatMap() {
    // determine number of rows and columns
    const nRows = sampleGroups.length; // number of unique samples including blank
    const nCols = rawData.length; // number of features

    // setup graph and cell dims
    const margin = { top: 75, right: 0, bottom: 75, left: 0 };
    const width = 1300 - margin.left - margin.right;
    const height = 725 - margin.top - margin.bottom;
    const paddingHeight = 40; // padding between title and top
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

    // Set the width of #heatmap-title to match the width of #heatmap
    const heatmapTitle = document.getElementById("heatmap-title");
    heatmapTitle.style.width = canvas.offsetWidth + "px";

    // set renderer background color
    renderer.setClearColor(0xffffff, 1);

    // set dims and geometry for heatmap graph, and heatmap cells
    const [graphGeometry, cellGeometry, horzLineGeo, vertLineGeo] =
      heatmapUtils.getGeometries(dimsObject);

    const vertLineLimit = 60; // diff in x zoomed coords for showing vertical line separators

    // setup materials (the colors for graph background, cells and axes)
    const [
      coloredMaterial,
      whiteMaterial,
      clearMaterial,
      zoomBoxMaterial,
      blackMaterial,
    ] = heatmapUtils.getMaterials();

    // create instanced mesh objects, to prevent creating a new mesh for each cell of the heatmap
    let coloredMesh = heatmapUtils.createInstancedMesh(
      cellGeometry,
      coloredMaterial,
      coloredCount
    );
    let whiteMesh = heatmapUtils.createInstancedMesh(
      cellGeometry,
      whiteMaterial,
      whiteCount
    );

    coloredMesh.renderOrder = 998; // ensure coloredMesh is rendered on top

    // create a single group for the cell meshes and add to the scene
    const heatmapGroup = new THREE.Group();
    heatmapGroup.add(coloredMesh);
    heatmapGroup.add(whiteMesh);

    scene.add(heatmapGroup);

    // find cell positions and colors, get colored cell instances for animation later
    const coloredCellInstances = heatmapUtils.setCellColorAndPos(
      dataFlat,
      dimsObject,
      coloredMesh,
      whiteMesh
    );

    // add a transparent mesh to house the graph title/labels/partitions
    const graphMesh = new THREE.Mesh(graphGeometry, clearMaterial);
    scene.add(graphMesh);

    // add title, x-axis label, y-axis labels, horizontal and vertical partition lines
    heatmapUtils.addTitle(canvas, dimsObject, graphMesh);
    heatmapUtils.addXAxisLabel(canvas, dimsObject, graphMesh);
    heatmapUtils.addYAxisLabelsAndHorzLines(
      canvas,
      sampleGroups,
      dimsObject,
      horzLineGeo,
      blackMaterial,
      graphMesh,
      scene,
      hasTrailingUnderscores
    );

    // add color gradient legend
    const coloredValues = dataFlat
      .filter((cell) => cell.color === "colored")
      .map((cell) => cell.value);
    const minValue = Math.min(...coloredValues);
    const maxValue = Math.max(...coloredValues);
    heatmapUtils.addColorLegend(
      canvas,
      dimsObject,
      graphMesh,
      minValue,
      maxValue,
      isLog10View
    );

    function updateHeatmapColors(newDataFlat, coloredMesh, whiteMesh) {
      const newColoredValues = newDataFlat
        .filter((cell) => cell.color === "colored")
        .map((cell) => cell.value);
      const minValue = Math.min(...newColoredValues);
      const maxValue = Math.max(...newColoredValues);
      let dummy = new THREE.Object3D();
      let coloredIndex = 0;
      let whiteIndex = 0;
      newDataFlat.forEach((cell) => {
        let x = -(dimsObject.actualWidth / 2) + dimsObject.paddingWidth;
        x +=
          cell.featureIndex * dimsObject.cellWidth + dimsObject.cellWidth / 2;
        let y = dimsObject.actualHeight / 2 - dimsObject.paddingHeight;
        y +=
          -(cell.sampleIndex * dimsObject.cellHeight) +
          dimsObject.cellHeight / 2;
        dummy.position.set(x, y, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        if (cell.color === "colored") {
          coloredMesh.setMatrixAt(coloredIndex, dummy.matrix);
          const color = heatmapUtils.valueToColor(
            cell.value,
            minValue,
            maxValue
          );
          coloredMesh.setColorAt(coloredIndex, color);
          cell.meshIndex = coloredIndex;
          coloredIndex++;
        } else if (cell.color === "white") {
          whiteMesh.setMatrixAt(whiteIndex, dummy.matrix);
          cell.meshIndex = whiteIndex;
          whiteIndex++;
        }
      });
      coloredMesh.instanceMatrix.needsUpdate = true;
      coloredMesh.instanceColor.needsUpdate = true;
    }

    // Add toggle button
    heatmapUtils.addToggleButton(graphMesh, canvas, dimsObject, () => {
      isLog10View = !isLog10View;
      coloredCellZoomed = false;

      // Recalculate data with appropriate transformation
      const dataToUse = isLog10View ? log10Data : rawData;
      const dataWithMeta = dataUtils.addDetectionCountAndSum(
        dataToUse,
        sampleHeaders
      );
      const sortedData = dataUtils.sortFeatures(dataWithMeta);
      const newDataFlat = dataUtils.getFlattenedData(
        sortedData,
        sampleHeaders,
        sampleGroups
      );

      // Update colors and legend
      updateHeatmapColors(newDataFlat, coloredMesh, whiteMesh, dimsObject);

      const newColoredValues = newDataFlat
        .filter((cell) => cell.color === "colored")
        .map((cell) => cell.value);
      const newMinValue = Math.min(...newColoredValues);
      const newMaxValue = Math.max(...newColoredValues);
      heatmapUtils.updateColorLegend(newMinValue, newMaxValue, isLog10View);

      // Update dataFlat reference for tooltips
      dataFlat = newDataFlat;
    });

    let vertLineObjects = heatmapUtils.getVertLines(
      dimsObject,
      nFeatures,
      vertLineGeo,
      blackMaterial
    );

    // set up rendering loop
    animate();

    // build on-hover tooltips for cells, y-axis labels
    const yAxisTooltip = heatmapUtils.buildYAxisTooltip();
    const tooltip = heatmapUtils.buildTooltip();

    // add event listeners for title (show tooltip on-hover; highlight colored cells on click)
    const heatmapTitleDiv = document.querySelector(".title");

    var coloredCellZoomed = false;
    heatmapTitleDiv.addEventListener("click", (e) => {
      coloredCellZoomed = heatmapUtils.clickTitleEvent(
        e,
        coloredCellInstances,
        coloredMesh,
        coloredCellZoomed
      );
    });

    // add event listeners for y-axis labels
    const yAxisLabelDivs = document.querySelectorAll(".yAxisLabel");
    yAxisLabelDivs.forEach((label) => {
      label.addEventListener("mouseenter", (e) => {
        heatmapUtils.mouseenterYAxisLabelEvent(
          e,
          label,
          featureCounts,
          yAxisTooltip,
          dimsObject,
          hasTrailingUnderscores
        );
      });

      label.addEventListener("mouseout", () => {
        heatmapUtils.mouseoutYAxisLabelEvent(null, label, yAxisTooltip);
      });
    });

    // now add event listeners for the cells. First set some needed variables
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
        coloredMesh,
        whiteMesh,
        mousePos,
        raycaster,
        dataFlat,
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
        hasTrailingUnderscores
      );
    });

    canvas.addEventListener("mouseup", (e) => {
      [zoomBox, cachedZoomBox, zoomed, coloredCellZoomed] =
        heatmapUtils.mouseupCellEvent(
          e,
          scene,
          zoomBox,
          camera,
          cameraDefaults,
          orbitControls,
          cachedZoomBox,
          graphMesh,
          coloredMesh,
          zoomed,
          coloredCellZoomed,
          coloredCellInstances,
          vertLineObjects,
          vertLineLimit,
          dimsObject
        );
    });

    // add event listener to toggle back and forth between last zoom
    document.addEventListener("keydown", async (e) => {
      [zoomed, coloredCellZoomed] = await heatmapUtils.keydownDocEvent(
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
        coloredMesh,
        coloredCellInstances,
        coloredCellZoomed
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
  }
}

// ~~~~ UNCOMMENT BELOW WHEN USING CSV FILE ~~~~~~~~~
// function loadHeatmap() {
//   // const path = "./data/intensity_data.csv";
//   const path = "./data/pooled_blood_intensity.csv";
//   // const path = "./data/WW2DW_intensity.csv";
//   createIntensityHeatmap(path);
// }
// ~~~~ UNCOMMENT ABOVE WHEN USING CSV FILE ~~~~~~~~~

// ~~~~ UNCOMMENT BELOW WHEN USING XLSX FILE ~~~~~~~~~
// // Use the global XLSX object provided by the CDN
function loadHeatmap() {
  // fetch("./data/pooled_blood_INTERPRET_NTA_QAQC.xlsx")
  fetch("./data/WW2DW_INTERPRET_NTA_QAQC.xlsx")
    .then((response) => response.arrayBuffer()) // read file as array buffer
    .then((data) => {
      const workbook = XLSX.read(data, { type: "array" });

      // call the main function that cleans data and draws heatmap
      createIntensityHeatmap(workbook);
    });
}
// ~~~~ UNCOMMENT ABOVE WHEN USING XLSX FILE ~~~~~~~~~

document.addEventListener("DOMContentLoaded", () => {
  // Call your function here
  loadHeatmap();
});
