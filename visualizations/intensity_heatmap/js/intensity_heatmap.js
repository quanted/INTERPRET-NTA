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
  let sampleGroups = dataUtils.getUniqueSampleHeaders(data);

  // replace null intensity values with 0
  const rawData = dataUtils.GetTransformedData(data);

  // Get the log transformed data
  const log10Data = dataUtils.Log10Data(rawData, sampleHeaders);

  // TODO get the Imputed Log10 z-score normalize intensity data
  const relativeData = dataUtils.imputedZdata(rawData, sampleHeaders);

  const dataDict = {
    Raw: rawData,
    Log10: log10Data,
    "Relative Feature": relativeData,
  };

  const colorDict = {
    Raw: [
      [245, 242, 38], //rgb(245, 242, 38)
      [255, 51, 0], //rgb(255, 51, 0)
    ],
    Log10: [
      [245, 242, 38], //rgb(245, 242, 38)
      [255, 51, 0], //rgb(255, 51, 0)
    ],
    "Relative Feature": [
      [21, 0, 207], //rgba(21, 0, 207, 1)
      [137, 129, 255], //rgba(137, 129, 255, 1)
      [253, 0, 0], //rgba(253, 0, 0, 1)
      [146, 0, 0], //rgba(146, 0, 0, 1)
    ],
  };

  var dataToShow = "Log10";

  // For each feature ID, add a column containing the number of samples with intensity values greater than 0
  // and add a column containing sum abundance of all sample columns
  const dataWithMeta = dataUtils.addDetectionCountSumMean(
    dataDict[dataToShow],
    sampleHeaders,
    dataDict["Raw"],
  );

  const sortedData = dataUtils.sortFeatures(dataWithMeta);

  // ======================================================================================================================

  // flatten data for generating three.js heatmap. Each entry is a cell in the heatmap.
  let dataFlat;
  dataFlat = dataUtils.getFlattenedData(
    sortedData,
    sampleHeaders,
    sampleGroups,
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
      coloredCount,
    );
    let whiteMesh = heatmapUtils.createInstancedMesh(
      cellGeometry,
      whiteMaterial,
      whiteCount,
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
      whiteMesh,
      // [lightest_color, darkest_color]
      colorDict[dataToShow],
      dataToShow,
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
    );

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
      dataToShow,
      colorDict[dataToShow],
    );

    // Add dropdown menu with proper mesh recreation
    heatmapUtils.addDropdown(graphMesh, canvas, dimsObject, (selection) => {
      // Recalculate data with appropriate transformation
      dataToShow =
        selection === "Log10"
          ? "Log10"
          : selection === "Raw"
            ? "Raw"
            : selection === "Relative Feature"
              ? "Relative Feature"
              : null;

      const dataToUse = dataDict[dataToShow];
      const dataWithMeta = dataUtils.addDetectionCountSumMean(
        dataToUse,
        sampleHeaders,
        dataDict["Raw"],
      );
      const sortedData = dataUtils.sortFeatures(dataWithMeta);
      const newDataFlat = dataUtils.getFlattenedData(
        sortedData,
        sampleHeaders,
        sampleGroups,
      );

      // Get new color counts for the selected data type
      const [newColoredCount, newWhiteCount] =
        dataUtils.getColorCounts(newDataFlat);
      // Remove old meshes from the scene
      heatmapGroup.remove(coloredMesh);
      heatmapGroup.remove(whiteMesh);
      // Dispose of old geometries and materials to free memory
      coloredMesh.dispose();
      whiteMesh.dispose();
      // Create new meshes with correct counts
      coloredMesh = heatmapUtils.createInstancedMesh(
        cellGeometry,
        coloredMaterial,
        newColoredCount,
      );

      whiteMesh = heatmapUtils.createInstancedMesh(
        cellGeometry,
        whiteMaterial,
        newWhiteCount,
      );

      coloredMesh.renderOrder = 998;
      // Add new meshes to the group
      heatmapGroup.add(coloredMesh);
      heatmapGroup.add(whiteMesh);
      // Set positions and colors for the new meshes

      const newColoredCellInstances = heatmapUtils.setCellColorAndPos(
        newDataFlat,
        dimsObject,
        coloredMesh,
        whiteMesh,
        colorDict[dataToShow],
        dataToShow,
      );

      // Update the global coloredCellInstances reference
      coloredCellInstances.length = 0;
      coloredCellInstances.push(...newColoredCellInstances);

      // Update the color of the intensity legend gradient bar
      const gradientBar = document.getElementById("legendGradientBar");

      if (dataToShow === "Relative Feature") {
        gradientBar.style.background = `linear-gradient(to right, 
          rgb(${colorDict[dataToShow][0][0]}, ${colorDict[dataToShow][0][1]}, ${colorDict[dataToShow][0][2]}), 
          rgb(${colorDict[dataToShow][1][0]}, ${colorDict[dataToShow][1][1]}, ${colorDict[dataToShow][1][2]}), 
        rgb(255, 255, 255),
          rgb(${colorDict[dataToShow][2][0]}, ${colorDict[dataToShow][2][1]}, ${colorDict[dataToShow][2][2]}),
          rgb(${colorDict[dataToShow][3][0]}, ${colorDict[dataToShow][3][1]}, ${colorDict[dataToShow][3][2]})`;
      } else {
        gradientBar.style.background = `linear-gradient(to right, 
          rgb(${colorDict[dataToShow][0][0]}, ${colorDict[dataToShow][0][1]}, ${colorDict[dataToShow][0][2]}), 
          rgb(${colorDict[dataToShow][1][0]}, ${colorDict[dataToShow][1][1]}, ${colorDict[dataToShow][1][2]})`;
      }

      const newColoredValues = newDataFlat
        .filter((cell) => cell.color === "colored")
        .map((cell) => cell.value);
      const newMinValue = Math.min(...newColoredValues);
      const newMaxValue = Math.max(...newColoredValues);
      heatmapUtils.updateColorLegend(newMinValue, newMaxValue, dataToShow);
      // Update dataFlat reference for tooltips
      dataFlat = newDataFlat;
    });

    heatmapUtils.UploadSampleOrderFile(
      graphMesh,
      canvas,
      dimsObject,
      (sampleOrder) => {
        sampleGroups = sampleOrder;
        // Remove existing horizontal lines from the scene
        const linesToRemove = [];
        scene.traverse((object) => {
          if (
            object instanceof THREE.Mesh &&
            object.geometry === horzLineGeo &&
            object.material === blackMaterial
          ) {
            linesToRemove.push(object);
          }
        });
        linesToRemove.forEach((line) => {
          scene.remove(line);
        });

        // Remove the existing YAxisGroup from graphMesh
        const groupsToRemove = [];
        graphMesh.traverse((object) => {
          if (
            object instanceof THREE.Group &&
            object.children.some(
              (child) =>
                child.element && child.element.className === "yAxisLabel",
            )
          ) {
            groupsToRemove.push(object);
          }
        });
        groupsToRemove.forEach((group) => {
          group.children.forEach((child) => {
            if (child.element && child.element.className === "yAxisLabel") {
              child.element.remove();
            }
          });
          graphMesh.remove(group);
        });

        // re-render Y-axis labels and horizontal lines with new sample order
        heatmapUtils.addYAxisLabelsAndHorzLines(
          canvas,
          sampleGroups,
          dimsObject,
          horzLineGeo,
          blackMaterial,
          graphMesh,
          scene,
        );

        // Recalculate data with appropriate transformation
        const dataToUse = dataDict[dataToShow];
        const dataWithMeta = dataUtils.addDetectionCountSumMean(
          dataToUse,
          sampleHeaders,
          dataDict["Raw"],
        );
        const sortedData = dataUtils.sortFeatures(dataWithMeta);
        const newDataFlat = dataUtils.getFlattenedData(
          sortedData,
          sampleHeaders,
          sampleGroups,
        );

        // Get new color counts for the selected data type
        const [newColoredCount, newWhiteCount] =
          dataUtils.getColorCounts(newDataFlat);
        // Remove old meshes from the scene
        heatmapGroup.remove(coloredMesh);
        heatmapGroup.remove(whiteMesh);
        // Dispose of old geometries and materials to free memory
        coloredMesh.dispose();
        whiteMesh.dispose();
        // Create new meshes with correct counts
        coloredMesh = heatmapUtils.createInstancedMesh(
          cellGeometry,
          coloredMaterial,
          newColoredCount,
        );

        whiteMesh = heatmapUtils.createInstancedMesh(
          cellGeometry,
          whiteMaterial,
          newWhiteCount,
        );

        coloredMesh.renderOrder = 998;
        // Add new meshes to the group
        heatmapGroup.add(coloredMesh);
        heatmapGroup.add(whiteMesh);
        // Set positions and colors for the new meshes

        const newColoredCellInstances = heatmapUtils.setCellColorAndPos(
          newDataFlat,
          dimsObject,
          coloredMesh,
          whiteMesh,
          colorDict[dataToShow],
          dataToShow,
        );

        // Update the global coloredCellInstances reference
        coloredCellInstances.length = 0;
        coloredCellInstances.push(...newColoredCellInstances);
        // Update dataFlat reference for tooltips
        dataFlat = newDataFlat;

        // ===================================================================================================================

        requestAnimationFrame(() => {
          // re-attach event listeners for the new y-axis labels
          const yAxisLabelDivs = document.querySelectorAll(".yAxisLabel");
          yAxisLabelDivs.forEach((label) => {
            label.addEventListener("mouseenter", (e) => {
              heatmapUtils.mouseenterYAxisLabelEvent(
                e,
                label,
                featureCounts,
                yAxisTooltip,
                dimsObject,
              );
            });

            label.addEventListener("mouseout", () => {
              heatmapUtils.mouseoutYAxisLabelEvent(null, label, yAxisTooltip);
            });
          });
        });
      },
    );

    heatmapUtils.UploadFeatureOrderFile(
      graphMesh,
      canvas,
      dimsObject,
      (featureOrder) => {
        console.log(featureOrder);
      },
    );

    let vertLineObjects = heatmapUtils.getVertLines(
      dimsObject,
      nFeatures,
      vertLineGeo,
      blackMaterial,
    );

    // set up rendering loop
    animate();

    // build on-hover tooltips for cells, y-axis labels
    const yAxisTooltip = heatmapUtils.buildYAxisTooltip();
    const tooltip = heatmapUtils.buildTooltip();

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
          zoomed,
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
      );
    });

    canvas.addEventListener("mouseup", (e) => {
      [zoomBox, cachedZoomBox, zoomed] = heatmapUtils.mouseupCellEvent(
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
        coloredCellInstances,
        vertLineObjects,
        vertLineLimit,
        dimsObject,
      );
    });

    // add event listener to toggle back and forth between last zoom
    document.addEventListener("keydown", async (e) => {
      [zoomed] = await heatmapUtils.keydownDocEvent(
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
