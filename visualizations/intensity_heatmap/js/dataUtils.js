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
  Object.keys(dataArr[0]).forEach((key) => {
    // only need to check the first row
    // iterate over column headers
    if (!uniqueHeaders.includes(key)) {
      // let strippedKey = key.replace("BlankSub Mean ", "").slice(0, -1); // remove the underscore at the end
      let strippedKey = key.replace("BlankSub Mean ", ""); // Remove 'BlankSub Mean' prefix from the sample name
      uniqueHeaders.push(strippedKey); // Add each sample name to the list of unique headers.
    }
  });

  return uniqueHeaders;
}

/**
 * Returns the unique sample header columns from dataArr.
 * This isolates the sample columns from the Feature ID column.
 *
 * @param {object[]} dataArr The array of object who each represent one row of data.
 * @returns {string[]} An array of the unique sample header column names.
 */
export function getUniqueSampleHeaders(dataArr) {
  // get all headers
  let allHeaders = getUniqueHeaders(dataArr);

  // clean headers to only have the sample names
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
 * @param {object[]} data The full data structure imported from the webapp output, containing all columns
 * @returns {object[]} The transformed data structure after replacing null values with 0,
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
 *
 * @param {object[]} data Data structure containing all sample and metadata columns
 * @returns {object[]} The data structure sorted in order of features occurring in least to most number of samples.
 */
export function sortFeatures(data) {
  // const sortedData = data.sort((a, b) => a.featureSum - b.featureSum); // sort data by total feature abundance in all samples.
  const sortedData = data.sort((a, b) => a.num_detections - b.num_detections); // sort data by number of detects present
  return sortedData;
}

/**
 * This is the final step in data processing before generating the heatmap itself. Returns a flattened form of our
 * preprocessed data in the form of [{featureIndex: x, sampleIndex: y, value: z}, ...] with length nFeatures*nSamples.
 *
 * @param {object[]} data The cleaned and sorted data structure , containing all columns.
 * @returns {object[]} An array of object containing the feature index, sample index and intensity value for
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
          color: intensityValue > 0 ? "colored" : "white",
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

/**
 *
 * @param {object[]} dataFlat The flattened data structure of heatmap cells
 * @returns {object[]} An array of object containing the number of features present in each sample.
 */
export function getFeatureCounts(dataFlat) {
  let featureCounts = {};
  dataFlat.forEach((item, index) => {
    // ensure sample name is present
    const sampleName = item["sampleName"];
    if (!Object.keys(featureCounts).includes(sampleName)) {
      featureCounts[sampleName] = {
        nPresent: 0,
      };
    }

    // count the number cells for the current sample for which intensity value is greater than 0
    const detected = item["value"] > 0 ? true : false;
    if (detected) {
      featureCounts[sampleName]["nPresent"]++;
    }
  });

  return featureCounts;
}

/**
 * Get the number of detected (colored) and non-detected (white) occurrences
 *
 * @param {object[]} dataFlat Our cleaned data structure array with one object for each occurrence.
 * @returns {number[]} The number of occurrences that have an intensity value (colored) and are not present (white).
 */
export function getColorCounts(dataFlat) {
  let coloredCount = 0;
  let whiteCount = 0;
  dataFlat.forEach((instance, index) => {
    if (instance.color === "colored") {
      coloredCount++;
    } else if (instance.color === "white") {
      whiteCount++;
    }
  });

  return [coloredCount, whiteCount];
}

/**
 *
 * @param {object[]} data Cleaned and sorted (but unflattened) dataset
 * @param {object[]} sampleHeaders List of raw sample headers
 * @returns {object[]} Returns the data structure with metadata columns added
 */
export function addDetectionCountAndSum(data, sampleHeaders) {
  return data.map((row) => ({
    ...row,
    // Add a column containing the number of samples in which each feature occurrs.
    num_detections: sampleHeaders.filter(
      (col) => row[col] !== null && row[col] !== 0
    ).length,
    // Add a column containing the total summed abundance accross all samples for each feature.
    featureSum: sampleHeaders.reduce((acc, col) => acc + (row[col] || 0), 0),
  }));
}
