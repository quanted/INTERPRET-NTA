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
    far
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
    dimsObject.height
  );
  const cellGeometry = new THREE.PlaneGeometry(
    dimsObject.apparentCellWidth,
    dimsObject.cellHeight
  );
  const horzLineGeo = new THREE.PlaneGeometry(dimsObject.width, 0.5);
  const vertLineGeo = new THREE.PlaneGeometry(
    dimsObject.cellWidth / 10,
    dimsObject.height
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
  zoomBoxColor = 0x000000
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

/**
 * Creates a THREE.Color object on the yellow to orange gradient corresponding to intensity value
 *
 * @param {number} value The inensity value of the cell
 * @param {number} minValue The smallest non-zero intensity value accross all occurrences in the data
 * @param {number} maxValue The largest intensity value accross all occurrences in the data
 * @returns {THREE.Color}
 */
export function valueToColor(value, minValue, maxValue, Color) {
  // Normalize value to 0-1 range
  const normalized = (value - minValue) / (maxValue - minValue);

  // set the lightest and darkest colors on the gradient
  const lightYellow = {
    r: Color[0][0] / 255,
    g: Color[0][1] / 255,
    b: Color[0][2] / 255,
  };
  const darkOrange = {
    r: Color[1][0] / 255,
    g: Color[1][1] / 255,
    b: Color[1][2] / 255,
  };

  // Interpolate between colors
  const r = lightYellow.r + (darkOrange.r - lightYellow.r) * normalized;
  const g = lightYellow.g + (darkOrange.g - lightYellow.g) * normalized;
  const b = lightYellow.b + (darkOrange.b - lightYellow.b) * normalized;

  return new THREE.Color(r, g, b);
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
  Color
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

      // Set the color for this instance
      const color = valueToColor(cell.value, minValue, maxValue, Color);

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
  hasTrailingUnderscores
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
  blackMaterial
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
 * Handles the click event for title. If ctrl is held, will cause colored cells to spin one full rotation.
 * If ctrl is not held, it will toggle between "zooming" the colored cells (increasing their width by some factor).
 *
 * @param {MouseEvent} event The mouse event object invoked by the click event.
 * @param {object[]} coloredCellInstances An object with index and location data for the colored cells.
 * @param {THREE.InstancedMesh} coloredMesh The colored mesh containing occurrence cells with intensity > 0.
 * @param {boolean} coloredCellZoomed True if colored cells are "zoomed", otherwise false.
 * @returns {boolean} Generally !coloredCellZoomed -- whether or not the colored cells are now "zoomed".
 */
export function clickTitleEvent(
  event,
  coloredCellInstances,
  coloredMesh,
  coloredCellZoomed
) {
  let dummy = new THREE.Object3D();

  // if ctrl is held, spinny animation
  if (event.ctrlKey) {
    // iterate over each coloredCell instance and apply tween individually
    coloredCellInstances.forEach((instance) => {
      // first half of rotation while getting big
      const coloredCellTweenIn = new TWEEN.Tween({
        scaleX: instance.scaleX,
        scaleY: instance.scaleY,
        rotX: 0,
      })
        .to(
          {
            scaleX: instance.scaleX * 30,
            scaleY: instance.scaleY * 2,
            rotX: Math.PI,
          },
          800
        )
        .onUpdate((updated) => {
          dummy.position.set(instance.x, instance.y, 0);
          dummy.scale.set(updated.scaleX, updated.scaleY, 1);
          dummy.rotation.set(0, 0, updated.rotX);
          dummy.updateMatrix();
          coloredMesh.setMatrixAt(instance.index, dummy.matrix);
          coloredMesh.instanceMatrix.needsUpdate = true;
        });

      // last half of rotation while going back to original size
      const coloredCellTweenOut = new TWEEN.Tween({
        scaleX: instance.scaleX * 30,
        scaleY: instance.scaleY * 2,
        rotX: Math.PI,
      })
        .to(
          {
            scaleX: instance.scaleX,
            scaleY: instance.scaleY,
            rotX: 2 * Math.PI,
          },
          800
        )
        .onUpdate((updated) => {
          dummy.position.set(instance.x, instance.y, 0);
          dummy.scale.set(updated.scaleX, updated.scaleY, 1);
          dummy.rotation.set(0, 0, updated.rotX);
          dummy.updateMatrix();
          coloredMesh.setMatrixAt(instance.index, dummy.matrix);
          coloredMesh.instanceMatrix.needsUpdate = true;
        });

      // chain the tweens together and run
      coloredCellTweenIn.chain(coloredCellTweenOut);
      coloredCellTweenIn.start();

      // if we were zoomed in, set to zoomed out.
      if (coloredCellZoomed) {
        coloredCellZoomed = !coloredCellZoomed;
      }
    });
  } else {
    // if ctrl not held, toggle colored cell width increase
    if (!coloredCellZoomed) {
      // "zoom" into red cells
      coloredCellInstances.forEach((instance) => {
        const coloredCellTween = new TWEEN.Tween({
          scaleX: instance.scaleX,
          scaleY: instance.scaleY,
          rotX: 0,
        })
          .to(
            { scaleX: instance.scaleX * 22, scaleY: instance.scaleY, rotX: 0 },
            400
          )
          .onUpdate((updated) => {
            dummy.position.set(instance.x, instance.y, 0);
            dummy.scale.set(updated.scaleX, updated.scaleY, 1);
            dummy.rotation.set(0, 0, updated.rotX);
            dummy.updateMatrix();
            coloredMesh.setMatrixAt(instance.index, dummy.matrix);
            coloredMesh.instanceMatrix.needsUpdate = true;
          })
          .start();
      });
      coloredCellZoomed = !coloredCellZoomed;
    } else {
      // "zoom" out of colored cells
      coloredCellInstances.forEach((instance) => {
        const coloredCellTween = new TWEEN.Tween({
          scaleX: instance.scaleX * 22,
          scaleY: instance.scaleY,
          rotX: 0,
        })
          .to(
            { scaleX: instance.scaleX, scaleY: instance.scaleY, rotX: 0 },
            400
          )
          .onUpdate((updated) => {
            dummy.position.set(instance.x, instance.y, 0);
            dummy.scale.set(updated.scaleX, updated.scaleY, 1);
            dummy.rotation.set(0, 0, updated.rotX);
            dummy.updateMatrix();
            coloredMesh.setMatrixAt(instance.index, dummy.matrix);
            coloredMesh.instanceMatrix.needsUpdate = true;
          })
          .start();
      });
      coloredCellZoomed = !coloredCellZoomed;
    }
  }

  return coloredCellZoomed;
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
  hasTrailingUnderscores
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
  zoomed
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
  hasTrailingUnderscores
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
        (cell, i) => cell.color === "colored" && cell.meshIndex === instanceId
      );
    } else if (intersectedObject === whiteMesh) {
      cellData = dataFlat.find(
        (cell, i) => cell.color === "white" && cell.meshIndex === instanceId
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
      }\n<b>Sample Name</b>: ${sampleName}\n<b>Intensity</b>: <span style="color: black; padding: ${
        cellData.color === "white" ? "1px 8px" : "1px"
      }; border-radius: 3px; margin-top: 4px;">${cellData.value.toFixed(
        2
      )}</span></div>This feature occurs in \n${
        cellData["num_detections"]
      } sample(s)`;
      tooltip.style.left = heatmapLeft + "px";
      tooltip.style.top = heatmapTop + "px";
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
      new THREE.BufferAttribute(vertices, 3)
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
  coloredCellZoomed,
  coloredCellInstances,
  vertLineObjects,
  vertLineLimit,
  dimsObject
) {
  const zoomBoxObject = scene.getObjectByName("zoomBox");
  if (zoomBoxObject) {
    // update camera
    let targetBounds = getTargetBoundsFromZoomBox(
      zoomBox,
      camera,
      cameraDefaults
    );

    zoomTween(
      scene,
      camera,
      targetBounds,
      orbitControls,
      vertLineObjects,
      vertLineLimit,
      dimsObject,
      null
    );

    // remove zoomBox
    zoomBoxObject.parent.remove(zoomBoxObject);
    cachedZoomBox = zoomBox;
    zoomBox = null;
    zoomed = true;

    graphMesh.visible = false;

    if (coloredCellZoomed) {
      let dummy = new THREE.Object3D();
      coloredCellInstances.forEach((instance) => {
        const coloredCellTween = new TWEEN.Tween({
          scaleX: instance.scaleX * 22,
          scaleY: instance.scaleY,
          rotX: 0,
        })
          .to(
            { scaleX: instance.scaleX, scaleY: instance.scaleY, rotX: 0 },
            100
          )
          .onUpdate((updated) => {
            dummy.position.set(instance.x, instance.y, 0);
            dummy.scale.set(updated.scaleX, updated.scaleY, 1);
            dummy.rotation.set(0, 0, updated.rotX);
            dummy.updateMatrix();
            coloredMesh.setMatrixAt(instance.index, dummy.matrix);
            coloredMesh.instanceMatrix.needsUpdate = true;
          })
          .start();
      });
      coloredCellZoomed = !coloredCellZoomed;
    }
  }

  return [zoomBox, cachedZoomBox, zoomed, coloredCellZoomed];
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
  coloredCellZoomed
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
        true
      );
      zoomed = !zoomed;
      graphMesh.visible = true;
    } else if (cachedZoomBox) {
      // unzoom colored cells if zoomed
      if (coloredCellZoomed) {
        let dummy = new THREE.Object3D();
        coloredCellInstances.forEach((instance) => {
          const coloredCellTween = new TWEEN.Tween({
            scaleX: instance.scaleX * 22,
            scaleY: instance.scaleY,
            rotX: 0,
          })
            .to(
              { scaleX: instance.scaleX, scaleY: instance.scaleY, rotX: 0 },
              100
            )
            .onUpdate((updated) => {
              dummy.position.set(instance.x, instance.y, 0);
              dummy.scale.set(updated.scaleX, updated.scaleY, 1);
              dummy.rotation.set(0, 0, updated.rotX);
              dummy.updateMatrix();
              coloredMesh.setMatrixAt(instance.index, dummy.matrix);
              coloredMesh.instanceMatrix.needsUpdate = true;
            })
            .start();
        });
        coloredCellZoomed = !coloredCellZoomed;
      }

      // unzoom camera
      let targetBounds = getTargetBoundsFromZoomBox(
        cachedZoomBox,
        camera,
        cameraDefaults
      );
      await zoomTween(
        scene,
        camera,
        targetBounds,
        orbitControls,
        vertLineObjects,
        vertLineLimit,
        dimsObject,
        cachedOrbitControl
      );
      zoomed = !zoomed;
      graphMesh.visible = false;
    }
  }

  return [zoomed, coloredCellZoomed];
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
  duration = 500
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
 * converts raw intensity values to log10 intensity values.
 *
 * @param {object[]} data data scructure containing raw intensity values
 * @param {string[]} sampleHeaders list of raw sample headers
 * @returns {object[]} data structure with raw intensity values conterted to log10 values
 */
export function Log10Data(data, sampleHeaders) {
  return data.map((row) => {
    const newRow = { ...row };

    sampleHeaders.forEach((header) => {
      const value = row[header];
      newRow[header] = value != null && value > 0 ? Math.log10(value) : 0;
    });
    return newRow;
  });
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
  Color
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
  gradientBar.style.background = `linear-gradient(to right, rgb(${Color[0][0]}, ${Color[0][1]}, ${Color[0][2]}), rgb(${Color[1][0]}, ${Color[1][1]}, ${Color[1][2]})`;
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
  const maxLabel = document.createElement("span");
  maxLabel.textContent = maxValue.toFixed(2);
  maxLabel.className = "maxLabel";
  labelsDiv.appendChild(minLabel);
  labelsDiv.appendChild(maxLabel);
  // Add title
  const titleSpan = document.createElement("div");
  titleSpan.className = "legendTitle";
  titleSpan.textContent = `${dataView} Intensity`;
  titleSpan.style.fontWeight = "bold";
  titleSpan.style.marginBottom = "5px";

  legendDiv.appendChild(titleSpan);
  legendDiv.appendChild(gradientBar);
  legendDiv.appendChild(labelsDiv);

  const canvRect = canvas.getBoundingClientRect();
  let legendX =
    -(dimsObject.actualWidth / 2) + canvRect.left + dimsObject.paddingWidth;
  legendX += dimsObject.width + 210;
  // Position to the right of the graph
  let legendY = dimsObject.actualHeight / 2 - dimsObject.paddingHeight;
  legendY -= dimsObject.height / 2 - 700;
  // Center vertically
  const legendLabel = new CSS2DObject(legendDiv);
  legendLabel.position.set(legendX, legendY, 0);
  graphMesh.add(legendLabel);
  legendLabel.layers.set(0);
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
  const menu = document.createElement("select");
  menu.appendChild(new Option("Log10 Intensity", "Log10"));
  menu.appendChild(new Option("Raw Intenstity", "Raw"));
  menu.appendChild(
    new Option("Imputed Log10 z-score norm Intensity", "Imputed")
  );

  let selectedValue = null;
  function handleTransformationChange(event) {
    selectedValue = event.target.value;
    if (selectedValue) {
      onSelect(selectedValue);
    }
  }

  menu.addEventListener("change", handleTransformationChange);

  dropdownDiv.appendChild(menu);

  const canvRect = canvas.getBoundingClientRect();
  let dropdownX =
    -(dimsObject.actualWidth / 2) + canvRect.left + dimsObject.paddingWidth;
  dropdownX += dimsObject.width + 210;
  // Position to the right of the graph
  let dropdownY = dimsObject.actualHeight / 2 - dimsObject.paddingHeight;
  dropdownY -= dimsObject.height / 2 - 635;
  // Center vertically
  const dropdownLabel = new CSS2DObject(dropdownDiv);
  dropdownLabel.position.set(dropdownX, dropdownY, 0);
  graphMesh.add(dropdownLabel);
  dropdownLabel.layers.set(0);
}

/**
 * Updates the color gradient legend with new min and max values depending on whether raw or log10 data is used
 *
 * @param {number} minValue The smallest non-zero intensity value accross all occurrences in the data
 * @param {number} maxValue The largest intensity value accross all occurrences in the data
 * @param {boolean} isLog10 true if heatmap is currently showing log10 values.
 */
export function updateColorLegend(minValue, maxValue, dataType) {
  const legendDiv = document.getElementById("intensityLegend");

  if (legendDiv) {
    // Update title
    const titleSpan = legendDiv.querySelector(".legendTitle");
    if (titleSpan) {
      titleSpan.textContent = `${dataType} Intensity`;
    }

    // Update min Label
    const minLabel = legendDiv.querySelector(".minLabel");
    minLabel.textContent = minValue.toFixed(2);

    // Update min Label
    const maxLabel = legendDiv.querySelector(".maxLabel");
    maxLabel.textContent = maxValue.toFixed(2);
  }
}
