import * as dataUtils from "./dataUtils.js";
import * as heatmapUtils from "./heatmapUtils.js";

import * as THREE from "three";

async function createIntensityHeatmap(csvPathIntensity, data = null) {
  // read in and parse data from csv file
  try {
    // Use the variables declared outside the block for destructuring
    data = await dataUtils.getIntensityData(csvPathIntensity);
  } catch (error) {
    console.error("Error loading data:", error);
  }

  // get unique sample headers from the csv.
  const sampleGroups = dataUtils.getUniqueSampleHeaders(data);

  const sampleHeaders = data.columns.filter((col) => col !== "Feature ID");

  // replace null intensity values with 0
  var transformedData = dataUtils.GetTransformedData(data);

  // Get the log transformed data
  transformedData = heatmapUtils.addLog10Data(transformedData, sampleHeaders);

  // For each feature ID, add a column contining number of samples with detections
  // and add a column containing sum of all sample solumns
  const dataWithCounts = dataUtils.addDetectionCountAndSum(
    transformedData,
    sampleHeaders
  );

  const sortedData = dataUtils.sortFeatures(dataWithCounts);
  // flatten data for generating three.js heatmap. Each entry is a cell in the heatmap.
  let dataFlat;
  dataFlat = dataUtils.getFlattenedData(
    // dataWithCounts,
    sortedData,
    sampleHeaders,
    sampleGroups
  );
  console.log(dataFlat);

  const nFeatures = data.length;
  const sampleCounts = dataUtils.getSampleCounts(dataFlat);

  // we need counts for how many cells are red, grey and white
  let [redCount, greyCount, whiteCount] = dataUtils.getColorCounts(dataFlat);

  // draw heatmap
  drawHeatMap();

  function drawHeatMap() {
    // await new Promise(r => setTimeout(r, 3000));
    // determine number of rows and columns
    const nRows = sampleGroups.length; // number of unique samples including blank
    const nCols = transformedData.length; // number of features
    const nCells = nRows * nCols; // number of total cells, equal to length of dataFlat

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
      dataFlat,
      dimsObject,
      greyMesh,
      redMesh,
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

    // build on-hover tooltips for cells, y-axis labels
    const yAxisTooltip = heatmapUtils.buildYAxisTooltip();
    const tooltip = heatmapUtils.buildTooltip();

    // add event listeners for title (show tooltip on-hover; highlight red cells on click)
    const heatmapTitleDiv = document.querySelector(".title");

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
          sampleCounts,
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
  }
}

function loadHeatmap() {
  const csvPathIntensity = "./data/intensity_data.csv";
  createIntensityHeatmap(csvPathIntensity);
}

document.addEventListener("DOMContentLoaded", () => {
  // Call your function here
  loadHeatmap();
});
