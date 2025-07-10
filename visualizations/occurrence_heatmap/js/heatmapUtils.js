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
  failC = 0xff0000,
  nonDetectC = 0xc7c8c9,
  passC = 0xffffff,
  zoomBoxColor = 0x000000
) {
  const redMaterial = new THREE.MeshBasicMaterial({ color: failC });
  const greyMaterial = new THREE.MeshBasicMaterial({ color: nonDetectC });
  const whiteMaterial = new THREE.MeshBasicMaterial({ color: passC });
  const clearMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0,
    transparent: true,
  });
  const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const zoomBoxMaterial = new THREE.LineBasicMaterial({ color: zoomBoxColor }); // 0x00ffff

  return [
    redMaterial,
    greyMaterial,
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
 * Determines and sets the positions and colors for each occurrence (cell) and returns an array of objects
 * containing data about each red cell to be used for animations later in code.
 *
 * @param {object[]} cvDataFlat Our cleaned data structure with one object per occurrence.
 * @param {object} dimsObject The object containing the widths/heights of graph and cells.
 * @param {THREE.InstancedMesh} greyMesh Mesh for non-detects.
 * @param {THREE.InstancedMesh} redMesh Mesh for fails.
 * @param {THREE.InstancedMesh} whiteMesh Mesh for passes.
 * @returns {object[]} An object with index and location data for the red cells, to be used for animations.
 */
export function setCellColorAndPos(
  cvDataFlat,
  dimsObject,
  greyMesh,
  redMesh,
  whiteMesh
) {
  // setup needed variables
  let dummy = new THREE.Object3D();
  let redIndex = 0;
  let greyIndex = 0;
  let whiteIndex = 0;
  let redCellInstances = []; // for animating the red cells later

  // iterate over data to calculate positions and colors for each cell
  cvDataFlat.forEach((cell, index) => {
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
    if (cell.value === -1) {
      // if non-detect (grey)
      greyMesh.setMatrixAt(greyIndex, dummy.matrix);
      cell.meshIndex = greyIndex;
      cell.cvIndex = index;
      greyIndex++;
    } else if (cell.value === 1) {
      // if fail (red)
      redMesh.setMatrixAt(redIndex, dummy.matrix);
      cell.meshIndex = redIndex;
      cell.cvIndex = index;
      redCellInstances.push({
        index: redIndex,
        scaleX: 1,
        scaleY: 1,
        x: x,
        y: y,
      }); // for animating red cells
      redIndex++;
    } else if (cell.value === 0) {
      // if pass (white)
      whiteMesh.setMatrixAt(whiteIndex, dummy.matrix);
      cell.meshIndex = whiteIndex;
      cell.cvIndex = index;
      whiteIndex++;
    }
  });

  // this line is needed to animate the red cells
  redMesh.instanceMatrix.needsUpdate = true;

  return redCellInstances;
}

/**
 * Generates and adds title to the appropriate Mesh object.
 *
 * @param {HTMLCanvasElement} canvas The canvas element that holds the heatmap.
 * @param {object} thresholdData The object containing threshold parameters.
 * @param {object} dimsObject The object containing the widths/heights of graph and cells.
 * @param {THREE.Mesh} graphMesh The Mesh that is made to hold title and axes labels.
 */
export function addTitle(canvas, thresholdData, dimsObject, graphMesh) {
  // create and style div
  const titleDiv = document.createElement("div");
  titleDiv.style.whiteSpace = "pre";
  titleDiv.className = "title";
  titleDiv.style.color = "black";
  titleDiv.style.fontSize = "30px";
  titleDiv.style.backgroundColor = "transparent";
  titleDiv.style.width = "auto";
  titleDiv.style.display = "inline-block";

  // add the innerHTML
  titleDiv.innerHTML = `Occurrence Heatmap\n`;
  titleDiv.innerHTML += `<span class="subTitle">Sample Rep. Threshold: ${thresholdData.minReplicateHitsPercent}%&emsp; `;
  titleDiv.innerHTML += `<span class="subTitle">Blank Rep. Threshold: ${thresholdData.minReplicateBlankHitPercent}%&emsp; `;
  titleDiv.innerHTML += `<span class="subTitle">CV Threshold: ${thresholdData.maxReplicateCvValue}&emsp; `;
  titleDiv.innerHTML += `<span class="subTitle">MRL Multiplier: ${thresholdData.MrlMult}</span>`;

  // set the position
  const canvRect = canvas.getBoundingClientRect();

  let titleX =
    -(dimsObject.actualWidth / 2) + canvRect.left + dimsObject.paddingWidth; // shift to left of graph
  titleX += dimsObject.width / 2; // center to the actual graph

  let titleY = dimsObject.actualHeight; // value of 0 sets top to be `height` below graph?? shift up by this amount
  titleY += dimsObject.height / 2 + dimsObject.paddingHeight * 0.8; // shift to top of graph, account for padding

  // // Add an additional offset to move the title further up
  // const additionalOffset = 100; // Adjust this value as needed
  // titleY += additionalOffset;




  const titleLabel = new CSS2DObject(titleDiv);
  titleLabel.position.set(titleX, titleY, 0);

  // add to mesh
  graphMesh.add(titleLabel);
  titleLabel.layers.set(0);
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
 */
export function addYAxisLabelsAndHorzLines(
  canvas,
  sampleGroups,
  dimsObject,
  horzLineGeo,
  blackMaterial,
  graphMesh,
  scene
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
    if (header[header.length - 1] === "_") {
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
 * Creates and returns the tooltip div for title on-hover.
 *
 * @returns {HTMLDivElement} The tooltip div element for title on-hover.
 */
export function buildTitleTooltip() {
  const titleTooltip = document.createElement("div");

  titleTooltip.style.position = "absolute";
  titleTooltip.style.background = "black";
  titleTooltip.style.color = "white";
  titleTooltip.style.padding = "8px";
  titleTooltip.style.borderRadius = "4px";
  titleTooltip.style.pointerEvents = "none";
  titleTooltip.style.display = "none";
  titleTooltip.style.whiteSpace = "pre";
  titleTooltip.className = "tooltip";
  titleTooltip.id = "heatmapTitle";

  document.body.appendChild(titleTooltip);

  return titleTooltip;
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
 * Displays on-hover tooltip for title for mouseenter event.
 *
 * @param {MouseEvent} e The mouse event invoked by 'mouseenter'.
 * @param {object} samplePassCounts An object containing meta-data like total number of passes, fails, etc...
 * @param {HTMLDivElement} titleTooltip Div element for title tooltip.
 * @param {HTMLDivElement} heatmapTitleDiv Div element for title div.
 * @param {object} dimsObject Object containing dims for graph and cells.
 */
export function mouseenterTitleEvent(
  e,
  samplePassCounts,
  titleTooltip,
  heatmapTitleDiv,
  dimsObject
) {
  const data = samplePassCounts["total"];
  if (data) {
    // set innerHTML, could clean this up
    titleTooltip.innerHTML = `<div style="background-color: white; color: black; padding: 5px; border-radius: 3px; border: solid 1px white;"><b>Features</b>: ${data[
      "nFeatures"
    ].toLocaleString()}\n<b>Samples</b>: ${data[
      "nSamples"
    ].toLocaleString()}\n<b>Occurrences</b>: ${data[
      "nOccurrences"
    ].toLocaleString()}</div>\n<b>Pass</b>: ${data[
      "nPass"
    ].toLocaleString()}\n<b>Fail</b>: <span style="color: rgb(255, 160, 160)">${data[
      "nFail"
    ].toLocaleString()}</span>\n<b>Non-Detect</b>: <span style="color: rgb(200,200,200)">${data[
      "nNonDetect"
    ].toLocaleString()}</span>`;

    // set position to just right of the title, same height that mouse enters
    const heatmapElement = document.getElementById("heatmap");
    const heatmapRect = heatmapElement.getBoundingClientRect();
    const heatmapTop = heatmapRect.top + window.scrollY - 14;
    titleTooltip.style.left =
      dimsObject.paddingWidth +
      dimsObject.width / 2 +
      heatmapTitleDiv.offsetWidth * 0.55 +
      "px";
    titleTooltip.style.top = heatmapTop + "px";
    titleTooltip.style.display = "block";
    heatmapTitleDiv.style.color = "white";
    heatmapTitleDiv.style.backgroundColor = "black";
  }
}

/**
 * Makes the title on-hover tooltip disappear on mouseout event.
 *
 * @param {HTMLDivElement} titleTooltip Div element for title tooltip.
 * @param {HTMLDivElement} heatmapTitleDiv Div element for title div.
 */
export function mouseoutTitleEvent(titleTooltip, heatmapTitleDiv) {
  titleTooltip.style.display = "none";
  heatmapTitleDiv.style.color = "black";
  heatmapTitleDiv.style.backgroundColor = "white";
}

/**
 * Handles the click event for title. If ctrl is held, will cause red cells to spin one full rotation.
 * If ctrl is not held, it will toggle between "zooming" the red cells (increasing their width by some factor).
 *
 * @param {MouseEvent} event The mouse event object invoked by the click event.
 * @param {object[]} redCellInstances An object with index and location data for the red cells.
 * @param {THREE.InstancedMesh} redMesh The red mesh containing failed occurrence cells.
 * @param {boolean} redCellZoomed True if red cells are "zoomed", otherwise false.
 * @returns {boolean} Generally !redCellZoomed -- whether or not the red cells are now "zoomed".
 */
export function clickTitleEvent(
  event,
  redCellInstances,
  redMesh,
  redCellZoomed
) {
  let dummy = new THREE.Object3D();

  // if ctrl is held, spinny animation
  if (event.ctrlKey) {
    // iterate over each redCell instance and apply tween individually
    redCellInstances.forEach((instance) => {
      // first half of rotation while getting big
      const redCellTweenIn = new TWEEN.Tween({
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
          redMesh.setMatrixAt(instance.index, dummy.matrix);
          redMesh.instanceMatrix.needsUpdate = true;
        });

      // last half of rotation while going back to original size
      const redCellTweenOut = new TWEEN.Tween({
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
          redMesh.setMatrixAt(instance.index, dummy.matrix);
          redMesh.instanceMatrix.needsUpdate = true;
        });

      // chain the tweens together and run
      redCellTweenIn.chain(redCellTweenOut);
      redCellTweenIn.start();

      // if we were zoomed in, set to zoomed out.
      if (redCellZoomed) {
        redCellZoomed = !redCellZoomed;
      }
    });
  } else {
    // if ctrl not held, toggle red cell width increase
    if (!redCellZoomed) {
      // "zoom" into red cells
      redCellInstances.forEach((instance) => {
        const redCellTween = new TWEEN.Tween({
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
            redMesh.setMatrixAt(instance.index, dummy.matrix);
            redMesh.instanceMatrix.needsUpdate = true;
          })
          .start();
      });
      redCellZoomed = !redCellZoomed;
    } else {
      // "zoom" out of red cells
      redCellInstances.forEach((instance) => {
        const redCellTween = new TWEEN.Tween({
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
            redMesh.setMatrixAt(instance.index, dummy.matrix);
            redMesh.instanceMatrix.needsUpdate = true;
          })
          .start();
      });
      redCellZoomed = !redCellZoomed;
    }
  }

  return redCellZoomed;
}

/**
 * Handles mouseenter events for y-axis labels. Causes tooltip to appear and highlights label.
 *
 * @param {MouseEvent} event Mouse event object invoked by mouseenter event.
 * @param {HTMLDivElement} label Div element corresponding to a single y-axis label.
 * @param {object} samplePassCounts An object containing meta-data like total number of passes, fails, etc...
 * @param {HTMLDivElement} yAxisTooltip Dive element corresponding to y-axis labels on-hover tooltip.
 * @param {object} dimsObject Object containing dims data for graph and cells.
 */
export function mouseenterYAxisLabelEvent(
  event,
  label,
  samplePassCounts,
  yAxisTooltip,
  dimsObject
) {
  const sampleName = label.innerHTML;
  const sampleData = samplePassCounts[sampleName];

  if (sampleData) {
    yAxisTooltip.innerHTML = `<div style="background-color: white; color: black; padding: 5px; border-radius: 3px; border: solid 1px white;"><b>Sample Name</b>: ${sampleName}</div>\n<div style="margin-top: -5px"><b>Pass</b>: ${sampleData[
      "nPass"
    ].toLocaleString()}\n<b>Fail</b>: <span style="color: rgb(255, 160, 160);">${sampleData[
      "nFail"
    ].toLocaleString()}</span>\n<b>Non-Detect</b>: <span style="color: rgb(200,200,200)">${sampleData[
      "nNonDetect"
    ].toLocaleString()}</span></div>`;

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
    if (intersectedObject === redMesh) {
      cellData = cvDataFlat.find(
        (cell, i) => cell.color === "red" && cell.meshIndex === instanceId
      );
    } else if (intersectedObject === whiteMesh) {
      cellData = cvDataFlat.find(
        (cell, i) => cell.color === "white" && cell.meshIndex === instanceId
      );
    } else if (intersectedObject === greyMesh) {
      cellData = cvDataFlat.find(
        (cell, i) => cell.color === "grey" && cell.meshIndex === instanceId
      );
    }

    // display info box
    if (cellData) {
      const heatmapElement = document.getElementById("heatmap");
      const heatmapRect = heatmapElement.getBoundingClientRect();
      const heatmapTop = heatmapRect.top + window.scrollY + 80;
      const heatmapLeft =
        heatmapRect.left + heatmapRect.width + window.scrollX + 5;
      tooltip.innerHTML = `<div style="background-color: white; color: black; padding: 5px; border-radius: 3px; border: solid 1px white; margin-bottom: 0px"><b>Feature ID</b>: ${
        cellData.featureId
      }\n<b>Sample Name</b>: ${
        cellData.sampleName
      }\n<b>Decision</b>: <span style="color: ${
        cellData.color === "grey" ? "rgb(100,100,100)" : cellData.color
      }; background-color: ${
        cellData.color === "white" ? "black" : "none"
      }; padding: ${
        cellData.color === "white" ? "1px 8px" : "1px"
      }; border-radius: 3px; margin-top: 4px;">${
        cellData["decision"]
      }</span></div>\n${
        cellData.passSampleReplicate === true ? greenCheck : redX
      }<b>Replicate Percentage</b>: ${cellData["repPercentValue"]}%\n${
        cellData.passCV ? greenCheck : redX
      }<b>CV</b>: ${cellData["cvValue"]}\n${
        cellData.mrlQuotient === "NA" || !cellData.passMRL ? redX : greenCheck
      }<b>Sample Mean / MRL</b>: ${cellData["mrlQuotient"]}`;
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
  redMesh,
  zoomed,
  redCellZoomed,
  redCellInstances,
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

    if (redCellZoomed) {
      let dummy = new THREE.Object3D();
      redCellInstances.forEach((instance) => {
        const redCellTween = new TWEEN.Tween({
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
            redMesh.setMatrixAt(instance.index, dummy.matrix);
            redMesh.instanceMatrix.needsUpdate = true;
          })
          .start();
      });
      redCellZoomed = !redCellZoomed;
    }
  }

  return [zoomBox, cachedZoomBox, zoomed, redCellZoomed];
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
  redMesh,
  redCellInstances,
  redCellZoomed
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
      // unzoom red cells if zoomed
      if (redCellZoomed) {
        let dummy = new THREE.Object3D();
        redCellInstances.forEach((instance) => {
          const redCellTween = new TWEEN.Tween({
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
              redMesh.setMatrixAt(instance.index, dummy.matrix);
              redMesh.instanceMatrix.needsUpdate = true;
            })
            .start();
        });
        redCellZoomed = !redCellZoomed;
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

  return [zoomed, redCellZoomed];
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
