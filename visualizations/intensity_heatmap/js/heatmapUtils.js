import * as THREE from "three";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Returns the width and height of a given div element.
 *
 * @param {HTMLDivElement} div The div element you want the width and height of.
 * @returns {number[]} The width and height of the div.
 */
function getDivDims(div) {
  document.body.appendChild(div);
  const labelWidth = div.getBoundingClientRect().width;
  const labelHeight = div.getBoundingClientRect().height;
  document.body.removeChild(div);

  return [labelWidth, labelHeight];
}

// TODO: add jsDocstring
function getTargetBoundsFromZoomBox(zoomBox, camera, cameraDefaults) {
  // We need normalized device coordinates (NDC)
  const ndcX0 =
    (zoomBox.x0 / Math.abs(cameraDefaults.left - cameraDefaults.right)) * 2 - 1;
  const ndcY0 =
    (zoomBox.y0 / Math.abs(cameraDefaults.top - cameraDefaults.bottom)) * 2 + 1;
  const ndcX1 =
    (zoomBox.x1 / Math.abs(cameraDefaults.left - cameraDefaults.right)) * 2 - 1;
  const ndcY1 =
    (zoomBox.y1 / Math.abs(cameraDefaults.top - cameraDefaults.bottom)) * 2 + 1;

  // Map NDC coordinates to world coordinates
  const worldCoords0 = new THREE.Vector3(ndcX0, ndcY0, 0).unproject(camera);
  const worldCoords1 = new THREE.Vector3(ndcX1, ndcY1, 0).unproject(camera);

  const targetBounds = {
    left: Math.min(worldCoords0.x, worldCoords1.x),
    right: Math.max(worldCoords0.x, worldCoords1.x),
    top: Math.max(worldCoords0.y, worldCoords1.y),
    bottom: Math.min(worldCoords0.y, worldCoords1.y),
  };

  return targetBounds;
}

/**
 * Initial setup for the THREE.js scene. Generates camera, renderers, etc.
 *
 * @param {string} canvasId The ID for the canvas being used to hold the heatmap.
 * @param {object} dimsObject An object containing data about the graph dimensions.
 * @returns {[HTMLCanvasElement,
 * THREE.WebGLRenderer,
 * CSS2DRenderer,
 * THREE.OrthographicCamera,
 * object,
 * OrbitControls,
 * THREE.Scene]} Returns the canvas element, the webGL renderer, the CSS2D renderer, the camera, and object containing
 * the default state of the camera, orbitControls object and the scene itself.
 */
export function setTheScene(canvasId, dimsObject) {
  // setup canvas and WebGL renderer
  let canvas = document.querySelector(`#${canvasId}`);
  const heatmapContainer = document.getElementById("heatmap-container");
  if (canvas === null) {
    canvas = document.createElement("canvas");
    canvas.id = canvasId;
    heatmapContainer.appendChild(canvas);
  }
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    precision: "highp",
  });
  renderer.setSize(dimsObject.actualWidth, dimsObject.actualHeight);
  heatmapContainer.appendChild(renderer.domElement);

  // setup CSS2DRenderer (for axis labels)
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(dimsObject.actualWidth, dimsObject.actualHeight);
  heatmapContainer.appendChild(labelRenderer.domElement);

  // setup camera
  const left = -dimsObject.actualWidth / 2;
  const right = dimsObject.actualWidth / 2;
  const top = dimsObject.actualHeight / 2;
  const bottom = -dimsObject.actualHeight / 2;
  const near = -1;
  const far = 1;
  const camera = new THREE.OrthographicCamera(
    left,
    right,
    top,
    bottom,
    near,
    far,
  );
  camera.zoom = 1;

  const cameraDefaults = {
    left,
    top,
    right,
    bottom,
    near,
    far,
  };

  // setup orbit controls for zooming / panning
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableZoom = false;
  orbitControls.enablePan = true;
  orbitControls.enableRotate = false;
  orbitControls.screenSpacePanning = true;
  orbitControls.keyPanSpeed = 10;
  orbitControls.update();

  // set the scene
  const scene = new THREE.Scene();

  return [
    canvas,
    renderer,
    labelRenderer,
    camera,
    cameraDefaults,
    orbitControls,
    scene,
  ];
}

/**
 * Generates the geometry objects needed for visualization.
 *
 * @param {object} dimsObject Object containing width/height data for graph and cells.
 * @returns {THREE.PlaneGeometry[]} An array of PlaneGeometry objects for the graph, cells, horizontal lines that
 * separate rows, and vertical lines that separate columns.
 */
export function getGeometries(dimsObject) {
  const graphGeometry = new THREE.PlaneGeometry(
    dimsObject.width,
    dimsObject.height,
  );
  const cellGeometry = new THREE.PlaneGeometry(
    dimsObject.apparentCellWidth,
    dimsObject.cellHeight,
  );
  const horzLineGeo = new THREE.PlaneGeometry(dimsObject.width, 0.5);
  const vertLineGeo = new THREE.PlaneGeometry(
    dimsObject.cellWidth / 10,
    dimsObject.height,
  );

  return [graphGeometry, cellGeometry, horzLineGeo, vertLineGeo];
}

/**
 * Create the Material objects needed for the heatmap.
 *
 * @returns {[THREE.MeshBasicMaterial,
 * THREE.MeshBasicMaterial,
 * THREE.MeshBasicMaterial,
 * THREE.MeshBasicMaterial,
 * THREE.MeshBasicMaterial,
 * THREE.LineBasicMaterial]} An array of Material objects for the different cells, the graph and lines.
 */
export function getMaterials(
  minIntensityC = 0xffffff,
  zoomBoxColor = 0x000000,
) {
  const coloredMaterial = new THREE.MeshBasicMaterial({
    // color: maxIntensityC,
    // opacity: 0.5,
    // transparent: true,
    color: 0xffffff, // Set to white so instance colors show through
    // vertexColors: true, // Enable per-instance coloring
  });
  const whiteMaterial = new THREE.MeshBasicMaterial({
    color: minIntensityC,
  });
  const clearMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0,
    transparent: true,
  });
  const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const zoomBoxMaterial = new THREE.LineBasicMaterial({ color: zoomBoxColor }); // 0x00ffff

  return [
    coloredMaterial,
    whiteMaterial,
    clearMaterial,
    zoomBoxMaterial,
    blackMaterial,
  ];
}

/**
 * Creates a THREE.InstancedMesh object with the given geometry and material.
 *
 * @param {THREE.PlaneGeometry} geometry The geometry used for the mesh (probably the cellGeometry).
 * @param {THREE.MeshBasicMaterial} material The material used for the mesh.
 * @param {number} n The number of instances that will be used in the mesh.
 * @returns {THREE.InstancedMesh}
 */
export function createInstancedMesh(geometry, material, n) {
  return new THREE.InstancedMesh(geometry, material, n);
}

export function valueToColor(value, minValue, maxValue, Color, dataToShow) {
  if (dataToShow === "Relative Feature") {
    // five-color gradient
    // Normalize value to 0–1 and clamp
    const normalized = Math.min(
      Math.max((value - minValue) / (maxValue - minValue), 0),
      1,
    );

    // Colors
    const colors = [
      {
        r: Color[0][0] / 255,
        g: Color[0][1] / 255,
        b: Color[0][2] / 255,
      },
      {
        r: Color[1][0] / 255,
        g: Color[1][1] / 255,
        b: Color[1][2] / 255,
      },
      { r: 1, g: 1, b: 1 }, //white
      {
        r: Color[2][0] / 255,
        g: Color[2][1] / 255,
        b: Color[2][2] / 255,
      },
      {
        r: Color[3][0] / 255,
        g: Color[3][1] / 255,
        b: Color[3][2] / 255,
      },
    ];

    const numSegments = colors.length - 1;

    const segment = Math.min(
      Math.floor(normalized * numSegments),
      numSegments - 1,
    );
    const t = (normalized - segment / numSegments) * numSegments;
    const c1 = colors[segment];
    const c2 = colors[segment + 1];

    const r = c1.r + (c2.r - c1.r) * t;
    const g = c1.g + (c2.g - c1.g) * t;
    const b = c1.b + (c2.b - c1.b) * t;

    return new THREE.Color(r, g, b);
  } else {
    // End colors
    const colorLow = {
      r: Color[0][0] / 255,
      g: Color[0][1] / 255,
      b: Color[0][2] / 255,
    };

    const colorHigh = {
      r: Color[1][0] / 255,
      g: Color[1][1] / 255,
      b: Color[1][2] / 255,
    };

    // Normalize value to 0-1 range
    const normalized = (value - minValue) / (maxValue - minValue);

    // Interpolate between colors
    const r = colorLow.r + (colorHigh.r - colorLow.r) * normalized;
    const g = colorLow.g + (colorHigh.g - colorLow.g) * normalized;
    const b = colorLow.b + (colorHigh.b - colorLow.b) * normalized;

    return new THREE.Color(r, g, b);
  }
}

/**
 * Determines and sets the positions and colors for each occurrence (cell) and returns an array of objects
 * containing data about each colored cell to be used for animations later in code.
 *
 * @param {object[]} dataFlat Our cleaned data structure with one object per occurrence.
 * @param {object} dimsObject The object containing the widths/heights of graph and cells.
 * @param {THREE.InstancedMesh} coloredMesh Mesh for colored cells.
 * @param {THREE.InstancedMesh} whiteMesh Mesh for cells with 0 intensity.
 * @returns {object[]} An object with index and location data for the colored cells, to be used for animations.
 */
export function setCellColorAndPos(
  dataFlat,
  dimsObject,
  coloredMesh,
  whiteMesh,
  Color,
  dataToShow,
) {
  // Find min and max values for color scaling

  const coloredValues = dataFlat
    .filter((cell) => cell.color === "colored")
    .map((cell) => cell.value);

  const minValue = Math.min(...coloredValues);
  const maxValue = Math.max(...coloredValues);

  // setup needed variables
  let dummy = new THREE.Object3D();
  let coloredIndex = 0;
  let whiteIndex = 0;
  let coloredCellInstances = []; // for animating the colored cells later

  // iterate over data to calculate positions and colors for each cell
  dataFlat.forEach((cell, index) => {
    // calculate and set positions
    let x = -(dimsObject.actualWidth / 2) + dimsObject.paddingWidth; // shift to far left, account for padding
    x += cell.featureIndex * dimsObject.cellWidth + dimsObject.cellWidth / 2; // shift by colNumber and center to col

    let y = dimsObject.actualHeight / 2 - dimsObject.paddingHeight; // shift to top, account for padding
    y +=
      -(cell.sampleIndex * dimsObject.cellHeight) + dimsObject.cellHeight / 2; // shift by row and center to row

    dummy.position.set(x, y, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    // add cells to appropriate mesh based on color value, add needed data
    if (cell.color === "colored") {
      // if has intensity value > 0 (colored)
      coloredMesh.setMatrixAt(coloredIndex, dummy.matrix);

      if (dataToShow === "Relative Feature") {
        // Set the color for this instance
        var color = valueToColor(
          cell.value,
          cell.featureMin,
          cell.featureMax,
          Color,
          dataToShow,
        );
      } else {
        // Set the color for this instance
        var color = valueToColor(
          cell.value,
          minValue,
          maxValue,
          Color,
          dataToShow,
        );
      }

      coloredMesh.setColorAt(coloredIndex, color);

      cell.meshIndex = coloredIndex;
      coloredCellInstances.push({
        index: coloredIndex,
        scaleX: 1,
        scaleY: 1,
        x: x,
        y: y,
      }); // for animating colored cells
      coloredIndex++;
    } else if (cell.color === "white") {
      // if pass (white)
      whiteMesh.setMatrixAt(whiteIndex, dummy.matrix);
      cell.meshIndex = whiteIndex;
      whiteIndex++;
    }
  });

  // this line is needed to animate the colored cells
  coloredMesh.instanceMatrix.needsUpdate = true;
  coloredMesh.instanceColor.needsUpdate = true;

  return coloredCellInstances;
}

/**
 * Generates and adds title to the appropriate Mesh object.
 *
 * @param {HTMLCanvasElement} canvas The canvas element that holds the heatmap.
 * @param {object} thresholdData The object containing threshold parameters.
 * @param {object} dimsObject The object containing the widths/heights of graph and cells.
 * @param {THREE.Mesh} graphMesh The Mesh that is made to hold title and axes labels.
 */
export function addTitle(canvas, dimsObject, graphMesh) {
  const titleDiv = document.getElementById("heatmap-title");
  titleDiv.className = "title";

  // add the innerHTML
  titleDiv.innerHTML = `Occurrence Intensity Heatmap\n`;

  // set the position
  const canvRect = canvas.getBoundingClientRect();
}

/**
 * Generates and adds x-axis label to the appropriate Mesh object.
 *
 * @param {HTMLCanvasElement} canvas The canvas element that holds the heatmap.
 * @param {object} thresholdData The object containing threshold parameters.
 * @param {object} dimsObject The object containing the widths/heights of graph and cells.
 * @param {THREE.Mesh} graphMesh The Mesh that is made to hold title and axes labels.
 */
export function addXAxisLabel(canvas, dimsObject, graphMesh) {
  // create and style div
  const labelDiv = document.createElement("div");
  labelDiv.className = "xAxisLabel";
  labelDiv.style.color = "black";
  labelDiv.style.fontSize = "20px";
  labelDiv.style.backgroundColor = "transparent";
  labelDiv.style.width = "auto";
  labelDiv.style.display = "inline-block";

  // set text
  labelDiv.textContent = "Feature ID";

  // set position
  const canvRect = canvas.getBoundingClientRect();

  let labelX =
    -(dimsObject.actualWidth / 2) + canvRect.left + dimsObject.paddingWidth; // shift to left
  labelX += dimsObject.width / 2; // center to graph

  // value of 0 sets top to be `height` below graph?? shift up by this amount and account for padding
  let labelY = dimsObject.paddingHeight + dimsObject.actualHeight / 2;

  const xLabel = new CSS2DObject(labelDiv);
  xLabel.position.set(labelX, labelY, 0);

  // add to mesh
  graphMesh.add(xLabel);
  xLabel.layers.set(0);
}

/**
 * Adds the y-axis labels and horizontal lines that separate rows to the heatmap.
 *
 * @param {HTMLCanvasElement} canvas The canvas object that holds the heatmap.
 * @param {string[]} sampleGroups The array of sample names.
 * @param {object} dimsObject The object containing the graph/cell dims.
 * @param {THREE.PlaneGeometry} horzLineGeo Geometry for horizontal lines that separate rows.
 * @param {THREE.MeshBasicMaterial} blackMaterial Black material for horizontal lines
 * @param {THREE.Mesh} graphMesh The graph mesh used to hold titles, labels, etc.
 * @param {boolean} hasTrailingUnderscores boolean value indicating if the sample headers contain trailing underscores
 */
export function addYAxisLabelsAndHorzLines(
  canvas,
  sampleGroups,
  dimsObject,
  horzLineGeo,
  blackMaterial,
  graphMesh,
  scene,
  hasTrailingUnderscores,
) {
  // setup group for yAxis labels
  const yAxisGroup = new THREE.Group();

  // iterate over samples to create labels
  const canvRect = canvas.getBoundingClientRect();
  sampleGroups.forEach((header, index) => {
    // create div for label
    const labelDiv = document.createElement("div");
    labelDiv.className = "yAxisLabel";

    // clean sample names by removing underscore suffix
    if (hasTrailingUnderscores) {
      labelDiv.textContent = header.slice(0, header.length - 1);
    } else {
      labelDiv.textContent = header;
    }

    // style div
    labelDiv.style.color = "black";
    labelDiv.style.fontSize = "16px";
    labelDiv.style.backgroundColor = "transparent";
    labelDiv.style.width = "auto";
    labelDiv.style.display = "inline-block";

    // calculate width and height of label text
    const [labelWidth, labelHeight] = getDivDims(labelDiv);

    // calculate and set label positions
    let labelX =
      canvRect.left + dimsObject.paddingWidth - dimsObject.actualWidth / 2; // shift to left
    labelX += -(labelWidth / 2) - 16; // right-align labels and add padding

    let labelY = dimsObject.actualHeight / 2 + dimsObject.paddingHeight; // shift up
    labelY +=
      dimsObject.cellHeight * (sampleGroups.length - index + 1) -
      labelHeight / 2; // center to correct row

    const labelLabel = new CSS2DObject(labelDiv);
    labelLabel.position.set(labelX, labelY, 0);

    yAxisGroup.add(labelLabel);
    labelLabel.layers.set(0);

    // add horizontal line separating rows
    const lineStartX =
      dimsObject.paddingWidth +
      dimsObject.width / 2 -
      dimsObject.actualWidth / 2;
    const lineY =
      -(dimsObject.height / 2) + dimsObject.cellHeight * (index + 1);

    const horzLine = new THREE.Mesh(horzLineGeo, blackMaterial);
    horzLine.position.set(lineStartX, lineY, 0);

    horzLine.renderOrder = 999;
    scene.add(horzLine);
  });
  // add horizontal line on top
  const lineStartX =
    dimsObject.paddingWidth + dimsObject.width / 2 - dimsObject.actualWidth / 2;
  const lineY =
    -(dimsObject.height / 2) +
    dimsObject.cellHeight * (sampleGroups.length + 1);

  const horzLine = new THREE.Mesh(horzLineGeo, blackMaterial);
  horzLine.position.set(lineStartX, lineY, 0);

  horzLine.renderOrder = 999;
  scene.add(horzLine);
  graphMesh.add(yAxisGroup);
}

/**
 * Returns a list of vertical Mesh objects to be drawn on graph zoom.
 *
 * @param {object} dimsObject Object that contains the dims for the graph and cells.
 * @param {number} nFeatures Integer value of the number of features (cells).
 * @param {THREE.PlaneGeometry} vertLineGeo Geometry used for the vertical partitions between columns on zoom.
 * @param {THREE.MeshBasicMaterial} blackMaterial Black material used for vertical lines.
 * @returns {THREE.Mesh[]} An array containing one Mesh for each vertical partition that is to be drawn on zoom.
 */
export function getVertLines(
  dimsObject,
  nFeatures,
  vertLineGeo,
  blackMaterial,
) {
  // add vertline objects to array to display later after zooming
  let vertLineObjects = [];
  for (let i = 0; i < nFeatures; i++) {
    const lineStartX = dimsObject.cellWidth * i - dimsObject.width / 2;
    const lineY = dimsObject.cellHeight;

    const vertLine = new THREE.Mesh(vertLineGeo, blackMaterial);
    vertLine.renderOrder = 999;
    vertLine.position.set(lineStartX, lineY, 0);
    vertLineObjects.push(vertLine);
  }
  /// need to add final vertline on right side
  const lineStartX = dimsObject.cellWidth * nFeatures - dimsObject.width / 2;
  const lineY = dimsObject.cellHeight;

  const vertLine = new THREE.Mesh(vertLineGeo, blackMaterial);
  vertLine.renderOrder = 999;
  vertLine.position.set(lineStartX, lineY, 0);
  vertLineObjects.push(vertLine);

  return vertLineObjects;
}

/**
 * Creates and returns the tooltip div for y-axis labels on-hover.
 *
 * @returns {HTMLDivElement} The tooltip div element for y-axis labels on-hover.
 */
export function buildYAxisTooltip() {
  const yAxisTooltip = document.createElement("div");

  yAxisTooltip.style.position = "absolute";
  yAxisTooltip.style.background = "black";
  yAxisTooltip.style.color = "white";
  yAxisTooltip.style.padding = "8px";
  yAxisTooltip.style.borderRadius = "4px";
  yAxisTooltip.style.pointerEvents = "none";
  yAxisTooltip.style.display = "none";
  yAxisTooltip.style.whiteSpace = "pre";
  yAxisTooltip.className = "tooltip";

  document.body.appendChild(yAxisTooltip);

  return yAxisTooltip;
}

/**
 * Creates and returns the tooltip div for cell on-hover.
 *
 * @returns {HTMLDivElement} The tooltip div element for cell on-hover.
 */
export function buildTooltip() {
  const tooltip = document.createElement("div");

  tooltip.style.position = "absolute";
  tooltip.style.background = "black";
  tooltip.style.color = "white";
  tooltip.style.padding = "8px";
  tooltip.style.borderRadius = "4px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.display = "none";
  tooltip.style.whiteSpace = "pre";
  tooltip.className = "tooltip";
  tooltip.style.width = "250px";

  document.body.appendChild(tooltip);

  return tooltip;
}

/**
 * Handles mouseenter events for y-axis labels. Causes tooltip to appear and highlights label.
 *
 * @param {MouseEvent} event Mouse event object invoked by mouseenter event.
 * @param {HTMLDivElement} label Div element corresponding to a single y-axis label.
 * @param {object} samplePassCounts An object containing meta-data like total number of passes, fails, etc...
 * @param {HTMLDivElement} yAxisTooltip Dive element corresponding to y-axis labels on-hover tooltip.
 * @param {object} dimsObject Object containing dims data for graph and cells.
 * @param {boolean} hasTrailingUnderscores boolean indicating whether or not sample headers contain trailing underscores
 */
export function mouseenterYAxisLabelEvent(
  event,
  label,
  featureCounts,
  yAxisTooltip,
  dimsObject,
  hasTrailingUnderscores,
) {
  const sampleName = label.innerHTML;

  const sampleData = hasTrailingUnderscores
    ? featureCounts[sampleName + "_"]
    : featureCounts[sampleName];

  if (sampleData) {
    yAxisTooltip.innerHTML = `<div style="background-color: white; color: black; padding: 5px; border-radius: 3px; border: solid 1px white;"><b>Sample Name</b>: ${sampleName}</div><span>${sampleData["nPresent"]} features detected</span>`;

    yAxisTooltip.style.left = `${dimsObject.paddingWidth + 20}px`;
    yAxisTooltip.style.top = `${event.pageY - 25}px`;
    yAxisTooltip.style.display = "block";
    label.style.color = "white";
    label.style.backgroundColor = "black";
  }
}

/**
 * Handles the mouseout event for y-axis labels. Removes on-hover tooltip, unhighlights the label.
 *
 * @param {MouseEvent} event Mouse event object invoked by mouseout event. Can be null since not used.
 * @param {HTMLDivElement} label Div element corresponding to one y-axis label.
 * @param {HTMLDivElement} yAxisTooltip Div element corresponding to the y-axis label on-hover tooltip.
 */
export function mouseoutYAxisLabelEvent(event, label, yAxisTooltip) {
  yAxisTooltip.style.display = "none";
  label.style.color = "black";
  label.style.backgroundColor = "white";
}

export function mousedownCellEvent(
  event,
  startX,
  startY,
  zoomBox,
  zoomBoxGeometry,
  zoomed,
) {
  // now get zoomBox starting point
  if (!event.ctrlKey && !zoomed) {
    startX = event.offsetX;
    startY = -event.offsetY;

    zoomBox = { x0: startX, y0: startY, x1: null, y1: null };

    zoomBoxGeometry = new THREE.BufferGeometry();
  }

  return [startX, startY, zoomBox, zoomBoxGeometry];
}

export function mousemoveCellEvent(
  event,
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
  hasTrailingUnderscores,
) {
  // first handle on-hover tooltips, get mouse position
  const rect = renderer.domElement.getBoundingClientRect();
  mousePos.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mousePos.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  /// setup raycasting, first for cells
  raycaster.setFromCamera(mousePos, camera);
  const intersects = raycaster.intersectObjects(heatmapGroup.children, true);

  if (intersects.length > 0) {
    // find the intersection
    const instanceId = intersects[0].instanceId;
    const intersectedObject = intersects[0].object;

    // determine which mesh was intersected
    let cellData;
    if (intersectedObject === coloredMesh) {
      cellData = dataFlat.find(
        (cell, i) => cell.color === "colored" && cell.meshIndex === instanceId,
      );
    } else if (intersectedObject === whiteMesh) {
      cellData = dataFlat.find(
        (cell, i) => cell.color === "white" && cell.meshIndex === instanceId,
      );
    }

    // display info box
    if (cellData) {
      const sampleName = hasTrailingUnderscores
        ? cellData.sampleName.slice(0, -1)
        : cellData.sampleName;

      const heatmapElement = document.getElementById("heatmap");
      const heatmapRect = heatmapElement.getBoundingClientRect();
      const heatmapTop = heatmapRect.top + window.scrollY + 80;
      const heatmapLeft =
        heatmapRect.left + heatmapRect.width + window.scrollX + 5;
      tooltip.innerHTML = `<div style="background-color: white; color: black; padding: 5px; border-radius: 3px; border: solid 1px white; margin-bottom: 0px"><b>Feature ID</b>: ${
        cellData.featureId
      }\n<b>Sample Name</b>: ${sampleName}\n<b>Abundance</b>: <span style="color: black; padding: ${
        cellData.color === "white" ? "1px 8px" : "1px"
      }; border-radius: 3px; margin-top: 4px;">${cellData.value.toFixed(
        2,
      )}</span></div>This feature occurs in \n${
        cellData["num_detections"]
      } sample(s)`;
      tooltip.style.left = heatmapLeft + "px";
      tooltip.style.top = heatmapTop + 20 + "px";
      tooltip.style.display = "block";
    } else {
      tooltip.style.display = "none";
    }
  } else {
    tooltip.style.display = "none";
  }

  // now zoombox
  if (zoomBox) {
    // if zoomBox is already drawn, we need to remove it to prevent overcrowding of scene children
    const zoomBoxObject = scene.getObjectByName("zoomBox");
    if (zoomBoxObject) {
      zoomBoxObject.parent.remove(zoomBoxObject);
    }

    const currentX = event.offsetX;
    const currentY = -event.offsetY;

    const boundingBox = {
      x0: startX,
      y0: startY,
      x1: currentX,
      y1: currentY,
    };
    const box = getTargetBoundsFromZoomBox(boundingBox, camera, cameraDefaults);

    zoomBox.x0 = box.left;
    zoomBox.y0 = box.top;
    zoomBox.x1 = box.right;
    zoomBox.y1 = box.bottom;

    const v0 = [box.left, box.top, 0];
    const v1 = [box.right, box.top, 0];
    const v2 = [box.right, box.bottom, 0];
    const v3 = [box.left, box.bottom, 0];

    const vertices = new Float32Array([
      v0[0],
      v0[1],
      v0[2], // top-left
      v1[0],
      v1[1],
      v1[2], // top-right
      v2[0],
      v2[1],
      v2[2], // bottom-right
      v3[0],
      v3[1],
      v3[2], // bottom-left
      v0[0],
      v0[1],
      v0[2], // top-left (close)
    ]);

    zoomBoxGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices, 3),
    );
    line = new THREE.Line(zoomBoxGeometry, zoomBoxMaterial);
    line.renderOrder = 999;
    line.name = "zoomBox";

    scene.add(line);
  }
}

export function mouseupCellEvent(
  event,
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
) {
  const zoomBoxObject = scene.getObjectByName("zoomBox");
  if (zoomBoxObject) {
    // update camera
    let targetBounds = getTargetBoundsFromZoomBox(
      zoomBox,
      camera,
      cameraDefaults,
    );

    zoomTween(
      scene,
      camera,
      targetBounds,
      orbitControls,
      vertLineObjects,
      vertLineLimit,
      dimsObject,
      null,
    );

    // remove zoomBox
    zoomBoxObject.parent.remove(zoomBoxObject);
    cachedZoomBox = zoomBox;
    zoomBox = null;
    zoomed = true;

    graphMesh.visible = false;
  }

  return [zoomBox, cachedZoomBox, zoomed];
}

export async function keydownDocEvent(
  event,
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
) {
  // reset zoom functionality
  if (event.ctrlKey && event.code === "Space") {
    if (zoomed) {
      let targetBounds = {
        left: cameraDefaults.left,
        right: cameraDefaults.right,
        top: cameraDefaults.top,
        bottom: cameraDefaults.bottom,
      };
      await zoomTween(
        scene,
        camera,
        targetBounds,
        orbitControls,
        vertLineObjects,
        vertLineLimit,
        dimsObject,
        null,
        true,
      );
      zoomed = !zoomed;
      graphMesh.visible = true;
    } else if (cachedZoomBox) {
      // unzoom camera
      let targetBounds = getTargetBoundsFromZoomBox(
        cachedZoomBox,
        camera,
        cameraDefaults,
      );
      await zoomTween(
        scene,
        camera,
        targetBounds,
        orbitControls,
        vertLineObjects,
        vertLineLimit,
        dimsObject,
        cachedOrbitControl,
      );
      zoomed = !zoomed;
      graphMesh.visible = false;
    }
  }

  return [zoomed];
}

export async function zoomTween(
  scene,
  camera,
  targetBounds,
  controls,
  vertLineObjects,
  vertLineLimit,
  dimsObject,
  cachedOrbitControl,
  skipTransformation = false,
  duration = 500,
) {
  const initialBounds = {
    left: camera.left,
    right: camera.right,
    top: camera.top,
    bottom: camera.bottom,
  };

  if (!skipTransformation) {
    targetBounds.left += dimsObject.actualWidth / 2;
    targetBounds.right += dimsObject.actualWidth / 2;
    targetBounds.top -= dimsObject.actualHeight / 2;
    targetBounds.bottom -= dimsObject.actualHeight / 2;
  }

  if (cachedOrbitControl !== null) {
    targetBounds.left += cachedOrbitControl.x;
    targetBounds.right += cachedOrbitControl.x;
    targetBounds.top += cachedOrbitControl.y;
    targetBounds.bottom += cachedOrbitControl.y;
  }

  const tween = new TWEEN.Tween(initialBounds)
    .to(targetBounds, duration)
    .easing(TWEEN.Easing.Sinusoidal.InOut)
    .onUpdate((updated) => {
      camera.left = updated.left;
      camera.top = updated.top;
      camera.right = updated.right;
      camera.bottom = updated.bottom;

      camera.updateProjectionMatrix();
    })
    .start();

  // when zooming out, reset controls
  if (skipTransformation) {
    controls.reset();
  }

  if (targetBounds.right - targetBounds.left < vertLineLimit) {
    await new Promise((r) => setTimeout(r, duration));
    vertLineObjects.forEach((object) => {
      scene.add(object);
    });
  } else {
    vertLineObjects.forEach((object) => {
      scene.remove(object);
    });
  }
}

/**
 * Adds the color gradient legend to the canvas
 *
 * @param {HTMLCanvasElement} canvas The canvas object that holds the heatmap.
 * @param {object} dimsObject The object containing the graph/cell dims.
 * @param {THREE.Mesh} graphMesh The graph mesh used to hold titles, labels, etc.
 * @param {number} minValue The smallest non-zero intensity value accross all occurrences in the data
 * @param {number} maxValue The largest intensity value accross all occurrences in the data
 * @param {boolean} dataView Data Type displayed in the visualization.
 * @param {object[]} Color list of lowest and highest rgb values for the gradient legend
 */
export function addColorLegend(
  canvas,
  dimsObject,
  graphMesh,
  minValue,
  maxValue,
  dataView,
  Color,
) {
  const legendDiv = document.createElement("div");
  legendDiv.className = "colorLegend";
  legendDiv.id = "intensityLegend";
  legendDiv.style.position = "absolute";
  legendDiv.style.color = "black";
  legendDiv.style.fontSize = "14px";
  legendDiv.style.backgroundColor = "white";
  legendDiv.style.padding = "10px";
  legendDiv.style.borderRadius = "4px";
  legendDiv.style.border = "1px solid #ccc";
  // Create gradient bar
  const gradientBar = document.createElement("div");
  gradientBar.id = "legendGradientBar";
  gradientBar.style.width = "200px";
  gradientBar.style.height = "20px";
  gradientBar.style.background = `linear-gradient(to right, 
    rgb(${Color[0][0]}, ${Color[0][1]}, ${Color[0][2]}), 
    rgb(${Color[1][0]}, ${Color[1][1]}, ${Color[1][2]})`;
  gradientBar.style.marginTop = "5px";
  gradientBar.style.marginBottom = "5px";
  gradientBar.style.border = "1px solid #999";
  // Create labels container
  const labelsDiv = document.createElement("div");
  labelsDiv.style.display = "flex";
  labelsDiv.style.justifyContent = "space-between";
  labelsDiv.style.fontSize = "12px";
  const minLabel = document.createElement("span");
  minLabel.textContent = minValue.toFixed(2);
  minLabel.className = "minLabel";
  const midLabel = document.createElement("span");
  midLabel.textContent = ((minValue + maxValue) / 2).toFixed(2);
  midLabel.className = "midLabel";
  const maxLabel = document.createElement("span");
  maxLabel.textContent = maxValue.toFixed(2);
  maxLabel.className = "maxLabel";
  labelsDiv.appendChild(minLabel);
  labelsDiv.appendChild(midLabel);
  labelsDiv.appendChild(maxLabel);
  // Add title
  const titleSpan = document.createElement("div");
  titleSpan.className = "legendTitle";
  titleSpan.textContent = `${dataView} Abundance`;
  titleSpan.style.fontWeight = "bold";
  titleSpan.style.marginBottom = "5px";

  legendDiv.appendChild(titleSpan);
  legendDiv.appendChild(gradientBar);
  legendDiv.appendChild(labelsDiv);

  const heatmapElement = document.getElementById("heatmap");
  const heatmapRect = heatmapElement.getBoundingClientRect();
  const heatmapTop = heatmapRect.top + window.scrollY + 80;
  const heatmapLeft = heatmapRect.left + heatmapRect.width + window.scrollX + 5;

  legendDiv.style.left = heatmapLeft + "px";
  legendDiv.style.top = heatmapTop + 159 + "px";
  legendDiv.style.display = "block";

  document.body.appendChild(legendDiv);
}

/**
 * Adds a dropdown menu to select data transformation type to display in the heatmap
 *
 * @param {THREE.Mesh} graphMesh The graph mesh used to hold titles, labels, etc.
 * @param {HTMLCanvasElement} canvas The canvas object that holds the heatmap.
 * @param {object} dimsObject The object containing the graph/cell dims.
 * @param {object} onSelect Function to perform on selection from the
 */
export function addDropdown(graphMesh, canvas, dimsObject, onSelect) {
  const dropdownDiv = document.createElement("div");
  dropdownDiv.id = "dropdown";
  dropdownDiv.style.position = "absolute";
  dropdownDiv.style.zIndex = "1000";
  dropdownDiv.style.alignItems = "center";

  const menu = document.createElement("select");
  menu.style.height = "30px";
  menu.style.border = "1px solid rgb(204, 204, 204)";
  menu.style.borderRadius = "5px";

  menu.appendChild(new Option("Raw Abundance", "Raw"));
  menu.appendChild(new Option("Log10 Abundance", "Log10"));
  menu.appendChild(
    new Option("Relative Feature Abundance", "Relative Feature"),
  );

  // Set the default selected value.
  menu.value = "Log10";

  let selectedValue = null;
  function handleTransformationChange(event) {
    selectedValue = event.target.value;
    if (selectedValue) {
      onSelect(selectedValue);
    }
  }

  menu.addEventListener("change", handleTransformationChange);

  dropdownDiv.appendChild(menu);

  const heatmapElement = document.getElementById("heatmap");
  const heatmapRect = heatmapElement.getBoundingClientRect();
  const heatmapTop = heatmapRect.top + window.scrollY + 80;
  const heatmapLeft = heatmapRect.left + heatmapRect.width + window.scrollX + 5;

  dropdownDiv.style.left = heatmapLeft + "px";
  dropdownDiv.style.top = heatmapTop + 250 + "px";
  dropdownDiv.style.display = "block";

  document.body.appendChild(dropdownDiv);
}

// Function to read the sample order from a CSV file
async function readSampleOrderFromCSV(file) {
  const text = await file.text();

  // Split the text into lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  const hasGroups =
    lines[0].split(",").length === 2
      ? true
      : lines[0].split(",").length === 1
        ? false
        : null;

  if (hasGroups) {
    console.log("Has grouping column. Need to add sample grouping capability");
  } else {
    console.log("no groups found. Just sort the samples. ");
  }

  // // Split the first line to get the headers
  // const headers = lines[0].split(",").map((header) => header.trim());

  // // Find the index of the "Feature ID" column
  // const featureIDIndex = headers.indexOf("Feature ID");

  // if (featureIDIndex === -1) {
  //   throw new Error("Feature ID column not found");
  // }

  // // Extract the feature IDs from the subsequent lines
  // const featureIDs = lines
  //   .slice(1)
  //   .map((line) => {
  //     const values = line.split(",").map((value) => value.trim());
  //     return Number(values[featureIDIndex]);
  //   })
  //   .filter((id) => !isNaN(id));

  // return featureIDs;
}

// Function to read the feature ID order from a CSV file
async function readFeatureOrderFromCSV(file) {
  const text = await file.text();

  // Split the text into lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  const hasGroups =
    lines[0].split(",").length === 2
      ? true
      : lines[0].split(",").length === 1
        ? false
        : null;

  if (hasGroups) {
    console.log("Has grouping column. Need to add feature grouping capability");
  } else {
    console.log("no groups found. Just sort the features. ");
  }

  // // Split the first line to get the headers
  // const headers = lines[0].split(",").map((header) => header.trim());

  // // Find the index of the "Feature ID" column
  // const featureIDIndex = headers.indexOf("Feature ID");

  // if (featureIDIndex === -1) {
  //   throw new Error("Feature ID column not found");
  // }

  // // Extract the feature IDs from the subsequent lines
  // const featureIDs = lines
  //   .slice(1)
  //   .map((line) => {
  //     const values = line.split(",").map((value) => value.trim());
  //     return Number(values[featureIDIndex]);
  //   })
  //   .filter((id) => !isNaN(id));

  // return featureIDs;
}

/**
 * Adds a File Upload Button to select data transformation type to display in the heatmap
 *
 * @param {THREE.Mesh} graphMesh The graph mesh used to hold titles, labels, etc.
 * @param {HTMLCanvasElement} canvas The canvas object that holds the heatmap.
 * @param {object} dimsObject The object containing the graph/cell dims.
 * @param {object} onSelect Function to perform on selection from the
 */
export function UploadSampleOrderFile(graphMesh, canvas, dimsObject, onSelect) {
  // Create the container div
  const sampleOrderDiv = document.createElement("div");
  sampleOrderDiv.id = "sampleOrderDiv";
  sampleOrderDiv.style.position = "absolute";
  sampleOrderDiv.style.zIndex = "1000";
  sampleOrderDiv.style.alignItems = "center";

  // Create the upload container
  const uploadContainer = document.createElement("div");
  uploadContainer.style.display = "flex";
  uploadContainer.style.alignItems = "center";
  uploadContainer.style.gap = "10px";

  // Create the file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "sampleOrderFileInput";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (file) {
      const featureIDs = await readSampleOrderFromCSV(file);
      featureIDs.sort((a, b) => a - b); // Sort the feature IDs numerically
      populateFeatureNumberDatalist(featureIDs);
      filterScatterplotByFeatureIDs(featureIDs);
    }
  });

  // Create upload button
  const uploadButton = document.createElement("button");
  uploadButton.textContent = "Upload Sample Order CSV";
  uploadButton.className = "upload-button";
  uploadButton.style.height = "30px";
  uploadButton.style.border = "1px solid rgb(204, 204, 204)";
  uploadButton.style.borderRadius = "5px";
  uploadButton.addEventListener("click", function () {
    fileInput.click();
  });

  // Append elements
  uploadContainer.appendChild(fileInput);
  uploadContainer.appendChild(uploadButton);
  sampleOrderDiv.appendChild(uploadContainer);

  // Calculate position
  const canvRect = canvas.getBoundingClientRect();
  let X =
    -(dimsObject.actualWidth / 2) + canvRect.left + dimsObject.paddingWidth;
  X += dimsObject.width - 1320; // Position to the right of the graph

  let Y = dimsObject.actualHeight / 2 - dimsObject.paddingHeight;
  Y -= dimsObject.height / 2 - 1010; // Center vertically

  // Create CSS2DObject and add to scene
  const uploadLabel = new CSS2DObject(sampleOrderDiv);
  uploadLabel.position.set(X, Y, 0);
  graphMesh.add(uploadLabel);
  uploadLabel.layers.set(0);
}

/**
 * Adds a File Upload Button to select data transformation type to display in the heatmap
 *
 * @param {THREE.Mesh} graphMesh The graph mesh used to hold titles, labels, etc.
 * @param {HTMLCanvasElement} canvas The canvas object that holds the heatmap.
 * @param {object} dimsObject The object containing the graph/cell dims.
 * @param {object} onSelect Function to perform on selection from the
 */
export function UploadFeatureOrderFile(
  graphMesh,
  canvas,
  dimsObject,
  onSelect,
) {
  // Create the container div
  const featureOrderDiv = document.createElement("div");
  featureOrderDiv.id = "featureOrderDiv";
  featureOrderDiv.style.position = "absolute";
  featureOrderDiv.style.zIndex = "1000";
  featureOrderDiv.style.alignItems = "center";

  // Create the upload container
  const uploadContainer = document.createElement("div");
  uploadContainer.style.display = "flex";
  uploadContainer.style.alignItems = "center";
  uploadContainer.style.gap = "10px";

  // Create the file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.id = "featureOrderFileInput";
  fileInput.style.display = "none";
  fileInput.addEventListener("change", async function (event) {
    const file = event.target.files[0];
    if (file) {
      const featureIDs = await readFeatureOrderFromCSV(file);
      featureIDs.sort((a, b) => a - b); // Sort the feature IDs numerically
      populateFeatureNumberDatalist(featureIDs);
      filterScatterplotByFeatureIDs(featureIDs);
    }
  });

  // Create upload button
  const uploadButton = document.createElement("button");
  uploadButton.textContent = "Upload Feature Order CSV";
  uploadButton.className = "upload-button";
  uploadButton.style.height = "30px";
  uploadButton.style.border = "1px solid rgb(204, 204, 204)";
  uploadButton.style.borderRadius = "5px";
  uploadButton.addEventListener("click", function () {
    fileInput.click();
  });

  // Append elements
  uploadContainer.appendChild(fileInput);
  uploadContainer.appendChild(uploadButton);
  featureOrderDiv.appendChild(uploadContainer);

  // Calculate position
  const canvRect = canvas.getBoundingClientRect();
  let X =
    -(dimsObject.actualWidth / 2) + canvRect.left + dimsObject.paddingWidth;
  X += dimsObject.width - 652; // Position to the right of the graph

  let Y = dimsObject.actualHeight / 2 - dimsObject.paddingHeight;
  Y -= dimsObject.height / 2 - 330; // Center vertically

  // Create CSS2DObject and add to scene
  const uploadLabel = new CSS2DObject(featureOrderDiv);
  uploadLabel.position.set(X, Y, 0);
  graphMesh.add(uploadLabel);
  uploadLabel.layers.set(0);
}

/**
 * Updates the color gradient legend with new min and max values depending on whether raw or log10 data is used
 *
 * @param {number} minValue The smallest non-zero intensity value accross all occurrences in the data
 * @param {number} maxValue The largest intensity value accross all occurrences in the data
 * @param {boolean} dataType true if heatmap is currently showing log10 values.
 */
export function updateColorLegend(minValue, maxValue, dataType) {
  const legendDiv = document.getElementById("intensityLegend");
  if (legendDiv) {
    // Update title
    const titleSpan = legendDiv.querySelector(".legendTitle");
    if (titleSpan) {
      titleSpan.textContent = `${dataType} Abundance`;
    }

    // Update labels
    const minLabel = legendDiv.querySelector(".minLabel");
    const midLabel = legendDiv.querySelector(".midLabel");
    const maxLabel = legendDiv.querySelector(".maxLabel");

    if (dataType === "Relative Feature") {
      minLabel.textContent = "-SD";
      midLabel.textContent = "0";
      maxLabel.textContent = "+SD";
    } else {
      minLabel.textContent = minValue.toFixed(2);
      midLabel.textContent = ((minValue + maxValue) / 2).toFixed(2);
      maxLabel.textContent = maxValue.toFixed(2);
    }
  }
}
