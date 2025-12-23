export async function getIntensityData(fileUrl) {
  try {
    // Load and parse the CSV file
    const data = await d3.csv(fileUrl, d3.autoType);

    // d3.csv automatically parses the CSV into an array of objects
    // where each object represents a row with keys as column headers

    return data;
  } catch (error) {
    console.error("Error loading CSV:", error);
    throw error;
  }
}

/**
 * Returns a list of unique headers. Note that these are not just the sample headers.
 *
 * @param {object[]} dataArr The array of objects that each represent one row of the data.
 * @returns {string[]} A list of the unique headers from dataArr.
 */
export function getUniqueHeaders(dataArr) {
  // iterate over all keys and store unique keys
  let uniqueHeaders = ["Feature ID"];
  let data = [dataArr[0]]; // only need to check the first row
  Object.keys(dataArr[0]).forEach((key) => {
    // iterate over column headers
    if (!uniqueHeaders.includes(key)) {
      // let strippedKey = key.replace("BlankSub Mean ", "").slice(0, -1); // remove the underscore at the end
      let strippedKey = key.replace("BlankSub Mean ", "");
      uniqueHeaders.push(strippedKey);
    }
  });

  return uniqueHeaders;
}

/**
 * Returns the unique sample header columns from dataArr.
 * This isolates the sample columns from the statistics columns.
 *
 * @param {object[]} dataArr The array of object who each represent one row of data.
 * @returns {string[]} An array of the unique sample header column names.
 */
export function getUniqueSampleHeaders(dataArr) {
  // get all headers grouped together by similarity

  let allHeaders = getUniqueHeaders(dataArr);

  // clean headers to only have the header names
  let sampleGroups = allHeaders.filter((item) => item != "Feature ID");

  // order our samples. pooled last, and anything in form <number><unit> should be chronological (not alphabetical)
  // sampleGroups = ["Feature ID", "2h", "30m", "Control", "10min", "Pooled"];

  sampleGroups.sort((a, b) => {
    const isPooledA = a === "Pooled";
    const isPooledB = b === "Pooled";

    const matchA = a.match(/^(\d+)([a-zA-Z]+)/);
    const matchB = b.match(/^(\d+)([a-zA-Z]+)/);

    // move pooled to last if present
    if (isPooledA && !isPooledB) return 1;
    if (!isPooledA && isPooledB) return -1;

    // sort values in {number}{unit} format
    if (matchA && matchB) {
      const numA = parseInt(matchA[1], 10);
      const numB = parseInt(matchB[1], 10);
      return numA - numB;
    }

    // else keep in original order
    return 0;
  });

  return sampleGroups;
}

/**
 *
 * @param {object[]} data The full data structure imported from the webapp output, containing all columns & MRL values.
 * @returns {object[]} The transformed data structure after sorting by # of passed samples,
 */
export function GetTransformedData(data) {
  const transformedData = data.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        key !== "Feature ID" && value === null ? 0 : value,
      ])
    )
  );

  return transformedData;
}

/**
 * This is the final step in data processing before generating the heatmap itself. Returns a flattened form of our
 * preprocessed data in the form of [{featureIndex: x, sampleIndex: y, value: z}, ...] with length nFeatures*nSamples.
 *
 * @param {object[]} data The full data structure imported from the webapp output, containing all columns & MRL values.
 * @returns {object[]} An array of object containing the feature index, sample index and value (-1, 0, 1) for
 * each sample to be plotted on the heatmap.
 */
export function getFlattenedData(data, sampleHeaders, sampleGroups) {
  let dataFlat = [];
  data.forEach((feature, featureIndex) => {
    Object.entries(feature).forEach(([sample, value], k) => {
      // skip over featureID keys
      if (sampleHeaders.includes(sample)) {
        const s_name = sample.replace("BlankSub Mean ", "");
        const sampleIndex = sampleGroups.indexOf(s_name);

        const intensityValue = feature[sample];

        dataFlat.push({
          featureIndex: featureIndex,
          sampleIndex: sampleIndex,
          value: intensityValue,
          color: intensityValue > 0 ? "red" : "white",
          sampleName: s_name,
          featureId: feature["Feature ID"],
          featureSum: feature["featureSum"],
          num_detections: feature["num_detections"],
        });
      }
    });
  });

  return dataFlat;
}

export function getSampleCounts(dataFlat) {
  let sampleCounts = {};
  dataFlat.forEach((item, index) => {
    // ensure sample name is present
    const sampleName = item["sampleName"];
    if (!Object.keys(sampleCounts).includes(sampleName)) {
      sampleCounts[sampleName] = {
        nPresent: 0,
      };
    }

    // add counts
    const detected = item["value"] > 1 ? true : false;
    if (detected) {
      sampleCounts[sampleName]["nPresent"]++;
    }
  });

  return sampleCounts;
}

/**
 * Get the occurrence counts for pass, fail and non-detects.
 *
 * @param {object[]} dataFlat Our cleaned data structure array with one object for each occurrence.
 * @returns {number[]} The number of occurrences who failed (red), are non-detects (grey), and passed (white).
 */
export function getColorCounts(dataFlat) {
  let redCount = 0;
  let greyCount = 0;
  let whiteCount = 0;
  dataFlat.forEach((instance, index) => {
    if (instance.color === "red") {
      redCount++;
    } else if (instance.color === "grey") {
      greyCount++;
    } else if (instance.color === "white") {
      whiteCount++;
    }
  });

  return [redCount, greyCount, whiteCount];
}

export function addDetectionCountAndSum(data, sampleHeaders) {
  return data.map((row) => ({
    ...row,
    num_detections: sampleHeaders.filter(
      (col) => row[col] !== null && row[col] !== 0
    ).length,
    featureSum: sampleHeaders.reduce((acc, col) => acc + (row[col] || 0), 0),
  }));
}
