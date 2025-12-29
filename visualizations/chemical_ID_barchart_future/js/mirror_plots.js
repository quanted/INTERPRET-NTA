// Flags peaks in the two spectra that are within a specified mass range of each other, for the purpose of coloring them later.
function flagSpectra(
  spectrum1,
  spectrum2,
  mass_window = 0, // peaks within this specified mass range of each other will be flagged as m/z match
  window_type = "da",
  peak_threshold = 0
) {
  var new_spectrum1 = spectrum1.map((peak) => [peak[0], peak[1], false]);
  var new_spectrum2 = spectrum2.map((peak) => [peak[0], peak[1], false]);
  const l1 = new_spectrum1.length;
  const l2 = new_spectrum2.length;
  var idx1 = 0;
  var idx2 = 0;
  var window_size = 0;
  while ((idx1 < l1) & (idx2 < l2)) {
    var mz1 = new_spectrum1[idx1][0];
    var intensity1 = new_spectrum1[idx1][1];
    var mz2 = new_spectrum2[idx2][0];
    var intensity2 = new_spectrum2[idx2][1];
    if (window_type == "ppm") {
      window_size = (mz1 * mass_window) / 1e6;
    } else {
      window_size = mass_window;
    }

    if (
      (Math.abs(mz1 - mz2) <= window_size) &
      (intensity1 > peak_threshold) &
      (intensity2 > peak_threshold)
    ) {
      new_spectrum1[idx1][2] = true;
      new_spectrum2[idx2][2] = true;
    }

    if (idx1 + 1 == l1) {
      idx2 += 1;
    } else if (idx2 + 1 == l2) {
      idx1 += 1;
    } else if (mz1 + window_size <= mz2) {
      idx1 += 1;
    } else {
      idx2 += 1;
    }
  }

  return [new_spectrum1, new_spectrum2];
}

function createDualMassSpectrumPlot(DTXCID, feature, CFMID_spec, exp_spec) {
  var svg = d3.select("#msplot");
  var width = svg.attr("width");
  var height = svg.attr("height");
  const margins = { right: 40, left: 40, top: 60, bottom: 40 };
  const cursor_proximity = 2; // how close a cursor should be to a peak for a highlighting circle to show up
  const peak_threshold = this.peak_threshold;

  const [spectrum1, spectrum2] = this.flagSpectra(
    exp_spec,
    CFMID_spec,
    this.window_size,
    this.window_type,
    peak_threshold
  );
  const spectrum1_name = `Feature ${feature}`;
  const spectrum2_name = DTXCID;

  // clear the plot (for when new data is supplied to this component)
  svg.selectAll("*").remove();

  // Check if spectral data exists
  const has_exp_spec = exp_spec.length != 0;
  const has_CFMID_spec = CFMID_spec.length != 0;

  // Add message to indicate missing experimental spectra data
  if (!has_exp_spec) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2 - 20)
      .attr("text-anchor", "middle")
      .text("ERROR: No experimental spectral data found.");
  }

  // Add message to indicate missing CFMID spectra data
  if (!has_CFMID_spec) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2 + 50)
      .attr("text-anchor", "middle")
      .text("ERROR: No CFMID spectral data found.");
  }

  // construct the scales for the axes
  const mz_domain = d3.extent(spectrum1.concat(spectrum2), (d) => d[0]);

  // Find the maximum intensity to set the y-axis range of the mirrior plots.
  const specs = exp_spec.concat(CFMID_spec);
  const maxIntensity = specs.length ? Math.max(...specs.map((a) => a[1])) : 0;
  let range = 100;
  maxIntensity > 100
    ? (range = Math.ceil(maxIntensity / 10) * 10)
    : (range = 100);

  const middle_height = (height - margins.bottom + margins.top) / 2;

  var mz_scale = d3
    .scaleLinear()
    .domain([mz_domain[0] - 0.5, mz_domain[1] + 0.5])
    .range([margins.left, width - margins.right]);
  let mz_rescale = mz_scale.copy();
  var intensity_scale1 = d3
    .scaleLinear()
    .domain([0, range])
    .range([middle_height, margins.top])
    .nice();
  var intensity_scale2 = d3
    .scaleLinear()
    .domain([0, range])
    .range([middle_height, height - margins.bottom])
    .nice();
  // make the axes
  var mz_axis = d3.axisBottom(mz_rescale);
  var mz_axis_g = svg
    .append("g")
    .call(mz_axis)
    .attr("transform", `translate(0, ${middle_height})`);
  svg
    .append("g")
    .call(d3.axisLeft(intensity_scale1))
    .attr("transform", `translate(${margins.left},0)`);
  svg
    .append("g")
    .call(d3.axisLeft(intensity_scale2))
    .attr("transform", `translate(${margins.left},0)`);
  // make the axis labels, and label the two halves of the plot
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - margins.bottom / 4)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("m/z");
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", margins.left / 3)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .text("Relative Intensity");
  svg
    .append("text")
    .attr("transform", "rotate(90)")
    .attr("x", (1 * height) / 2)
    .attr("y", margins.left / 3 - width)
    .attr("text-anchor", "end")
    .attr("fill", "currentColor")
    .text(spectrum1_name);
  svg
    .append("text")
    .attr("transform", "rotate(90)")
    .attr("x", (1.1 * height) / 2)
    .attr("y", margins.left / 3 - width)
    .attr("text-anchor", "start")
    .attr("fill", "currentColor")
    .text(spectrum2_name);

  // plots peaks as circles; may be useful for visual debugging
  //svg.append("g").selectAll("circle").data(this.spectrum).join("circle").attr("cx", d => mz_rescale(d[0])).attr("cy", d => intensity_scale(d[1])).attr("r", 3)

  // add the clipping rectangle, to only show data in a specified part of the plot
  const clippingRect = svg
    .append("clipPath")
    .attr("id", "clippy")
    .append("rect")
    .attr("width", width - margins.left - margins.right)
    .attr("height", height - margins.top - margins.bottom)
    .attr("transform", `translate(${margins.left}, ${margins.top})`)
    .attr("fill", "none");

  // add per-point vertical lines
  if (has_exp_spec) {
    svg
      .append("g")
      .selectAll("line")
      .data(spectrum1)
      .join("line")
      .attr("x1", (peak) => mz_rescale(peak[0]))
      .attr("x2", (peak) => mz_rescale(peak[0]))
      .attr("y1", intensity_scale1(0))
      .attr("y2", (peak) => intensity_scale1(peak[1]))
      .attr("class", (peak) => {
        if (peak[1] < peak_threshold) {
          return "ms-peak-line-below-threshold";
        } else if (peak[2] == true) {
          return "ms-peak-line-match";
        } else {
          return "ms-peak-line";
        }
      })
      .attr("clip-path", "url(#clippy)");
  }
  if (has_CFMID_spec) {
    svg
      .append("g")
      .selectAll("line")
      .data(spectrum2)
      .join("line")
      .attr("x1", (peak) => mz_rescale(peak[0]))
      .attr("x2", (peak) => mz_rescale(peak[0]))
      .attr("y1", intensity_scale2(0))
      .attr("y2", (peak) => intensity_scale2(peak[1]))
      .attr("class", (peak) => {
        if (peak[1] < peak_threshold) {
          return "ms-peak-line-below-threshold";
        } else if (peak[2] == true) {
          return "ms-peak-line-match";
        } else {
          return "ms-peak-line-secondary";
        }
      })
      .attr("clip-path", "url(#clippy)");
  }

  // make it zoom
  const extent = [
    [margins.left, margins.top],
    [width - margins.right, height - margins.bottom],
  ];
  const zoom = d3
    .zoom()
    .scaleExtent([1, 100])
    .extent(extent)
    .translateExtent(extent)
    .on("zoom", function (event) {
      mz_rescale = event.transform.rescaleX(mz_scale);
      mz_axis_g.call(mz_axis.scale(mz_rescale));
      svg
        .selectAll("line")
        .attr("x1", (peak) => mz_rescale(peak[0]))
        .attr("x2", (peak) => mz_rescale(peak[0]));
    });
  svg.call(zoom);

  // make circles to add to the plot to highlight points
  var focus = svg.append("g").style("display", "none");
  focus
    .append("circle")
    .attr("id", "circle1")
    .attr("class", "mouseover-highlight-circle")
    .attr("r", 3);
  focus
    .append("circle")
    .attr("id", "circle2")
    .attr("class", "mouseover-highlight-circle-secondary")
    .attr("r", 3);
  // add description text to the plot
  focus
    .append("text")
    .attr("id", "text1")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", margins.top / 2);
  focus
    .append("text")
    .attr("id", "text2")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", margins.top / 2)
    .attr("dy", "1em");
  // the rect is the selection area for the cursor, while the rest of this block is implementing the mouseover functionality
  svg
    .append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", function () {
      focus.style("display", null);
    })
    .on("mouseout", function () {
      focus.style("display", "none");
    })
    .on("mousemove", function (event) {
      var pt = d3.pointer(event, svg.node());
      var cursor_x = mz_rescale.invert(pt[0]);
      const x1_index = d3.bisectCenter(
        spectrum1.map((d) => d[0]),
        cursor_x
      );
      const x2_index = d3.bisectCenter(
        spectrum2.map((d) => d[0]),
        cursor_x
      );
      const show_spectrum1_hover = has_exp_spec
        ? Math.abs(cursor_x - spectrum1[x1_index][0]) < cursor_proximity
        : false;
      const show_spectrum2_hover = has_CFMID_spec
        ? Math.abs(cursor_x - spectrum2[x2_index][0]) < cursor_proximity
        : false;
      if (show_spectrum1_hover) {
        focus
          .select("#circle1")
          .attr("class", () => {
            if (spectrum1[x1_index][1] < peak_threshold) {
              return "mouseover-highlight-circle-below-threshold";
            } else if (spectrum1[x1_index][2] == true) {
              return "mouseover-highlight-circle-match";
            } else {
              return "mouseover-highlight-circle";
            }
          })
          .attr("display", null);
        focus.select("#text1").attr("display", null);
        focus
          .select("#circle1")
          .attr(
            "transform",
            `translate(${mz_rescale(
              spectrum1[x1_index][0]
            )}, ${intensity_scale1(spectrum1[x1_index][1])})`
          );
        focus
          .select("#text1")
          .text(
            `${spectrum1_name} - m/z: ${spectrum1[x1_index][0].toFixed(
              4
            )}; Intensity: ${spectrum1[x1_index][1].toFixed(3)}`
          );
      } else {
        focus.select("#circle1").attr("display", "none");
        focus.select("#text1").attr("display", "none");
      }
      if (show_spectrum2_hover) {
        focus
          .select("#circle2")
          .attr("class", () => {
            if (spectrum2[x2_index][1] < peak_threshold) {
              return "mouseover-highlight-below-threshold";
            } else if (spectrum2[x2_index][2] == true) {
              return "mouseover-highlight-circle-match";
            } else {
              return "mouseover-highlight-circle-secondary";
            }
          })
          .attr("display", null);
        focus.select("#text2").attr("display", null);
        focus
          .select("#circle2")
          .attr(
            "transform",
            `translate(${mz_rescale(
              spectrum2[x2_index][0]
            )}, ${intensity_scale2(spectrum2[x2_index][1])})`
          );
        focus
          .select("#text2")
          .text(
            `${spectrum2_name} - m/z: ${spectrum2[x2_index][0].toFixed(
              4
            )}; Intensity: ${spectrum2[x2_index][1].toFixed(3)}`
          );
      } else {
        focus.select("#circle2").attr("display", "none");
        focus.select("#text2").attr("display", "none");
      }
    });

  // Handler for 'Reset Zoom' button
  d3.select("#zoomReset").on("click", function () {
    svg.call(zoom.transform, d3.zoomIdentity);
  });
}

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function parseJsonArray(value) {
  // Returns an empty list if value is an empty string, undefined, or invalid JSON
  try {
    return value && value.trim() !== "" ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const DTXCID = getQueryParam("dtxcid");
  const feature = getQueryParam("feature");

  // Get spectral data, sets variable to empty list if spectral data does not exist.
  const CFMID_10 = parseJsonArray(getQueryParam("CFMID_10"));
  const CFMID_20 = parseJsonArray(getQueryParam("CFMID_20"));
  const CFMID_40 = parseJsonArray(getQueryParam("CFMID_40"));
  const exp_spec = parseJsonArray(getQueryParam("exp_spec"));

  createDualMassSpectrumPlot(DTXCID, feature, CFMID_10, exp_spec);

  const CFMID_10button = document.getElementById("CFMID_10button");
  const CFMID_20button = document.getElementById("CFMID_20button");
  const CFMID_40button = document.getElementById("CFMID_40button");

  CFMID_10button.disabled = true;

  CFMID_10button.addEventListener("click", function () {
    CFMID_20button.disabled = false;
    CFMID_10button.disabled = true;
    CFMID_40button.disabled = false;
    createDualMassSpectrumPlot(DTXCID, feature, CFMID_10, exp_spec);
  });

  CFMID_20button.addEventListener("click", function () {
    CFMID_20button.disabled = true;
    CFMID_10button.disabled = false;
    CFMID_40button.disabled = false;
    createDualMassSpectrumPlot(DTXCID, feature, CFMID_20, exp_spec);
  });

  CFMID_40button.addEventListener("click", function () {
    CFMID_20button.disabled = false;
    CFMID_10button.disabled = false;
    CFMID_40button.disabled = true;
    createDualMassSpectrumPlot(DTXCID, feature, CFMID_40, exp_spec);
  });
});
