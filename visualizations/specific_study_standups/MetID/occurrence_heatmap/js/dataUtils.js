/**
 * Returns the analysis parameters from paramsPath (the "Analysis Parameters.csv" file).
 *
 * @param {reader.WorkBook} file WorkBook object with data from analysis parameters sheet of results spreadsheet.
 * @returns {[number, number, number, number]} The number values for Min replicate hits (%), Min replicate hits in
 * blanks (%), Max replicate CV, and MRL standard deviation multiplier -- in that order.
 */
export function getAnalysisParameters(file) {
  // read in and parse the csv file
  const analysisParamsSheetName = "Analysis Parameters";
  const paramsObj = XLSX.utils.sheet_to_json(
    file.Sheets[analysisParamsSheetName]
  );

  // Iterate over data for the parameters we want (min replicate %, min blanks, max CV, and mrl multiplier)
  let min_replicate_hits = null,
    min_replicate_hits_blanks = null,
    max_replicate_cv = null,
    mrl_std_multiplier = null;
  for (let rowObj of paramsObj) {
    if (rowObj["Parameter"] === "Min replicate hits (%)") {
      min_replicate_hits = Number(rowObj["Value"]);
    } else if (rowObj["Parameter"] === "Min replicate hits in blanks (%)") {
      min_replicate_hits_blanks = Number(rowObj["Value"]);
    } else if (rowObj["Parameter"] === "Max replicate CV") {
      max_replicate_cv = Number(rowObj["Value"]);
    } else if (rowObj["Parameter"] === "MRL standard deviation multiplier") {
      mrl_std_multiplier = Number(rowObj["Value"]);
    }
  }

  return [
    min_replicate_hits,
    min_replicate_hits_blanks,
    max_replicate_cv,
    mrl_std_multiplier,
  ];
}

/**
 * Returns a data structure containing the occurrence data from the WebApp results spreadsheet.
 *
 * @param {reader.WorkBook} file WorkBook for WebApp Results spreadsheet that contains "All Detection Statistics (Pos)"
 * , and "All Detection Statistics (Neg)" sheets.
 * @returns {object[]} An array of objects. Each object represent one row from the spreadsheet. If "Pos" and "Neg"
 * sheets both exist, the "Pos" rows will be first, followed by the "Neg" rows. The keys  of each object are
 * the column header names.
 */
export function getOccurrenceData(file) {
  // now store the data from the "All Detection Statistics (X)" sheets
  const sheetNames = [
    "All Detection Statistics (Pos)",
    "All Detection Statistics (Neg)",
  ];
  let data = [];
  for (let i = 0; i < sheetNames.length; i++) {
    // Does not matter if sheetName is missing
    const temp = XLSX.utils.sheet_to_json(
      file.Sheets[sheetNames[i]],
      { defval: "" } // If missing value, set to empty string
    );

    temp.forEach((res) => {
      data.push(res);
    });
  }

  return data;
}

/**
 * Returns the Pos and Neg data as an array of objects which each represent a row of data, and
 * the analysis parameter values (e.g., min replicate percent).
 *
 * @param {string} xlsxPath Path to the WebApp Results spreadsheet that contains "All Detection Statistics (Pos)"
 * , and "All Detection Statistics (Neg)" sheets.
 * @returns {[object[], number, number, number, number]} The first element is an array of data from the "All Detection
 * Statistics (Pos/Neg)" sheets. No issues if either sheet is missing, if both sheets exist, the Pos data will be the
 * first elements in the array, followed by the Neg data. Each element within this array is an object that represents
 * one row from the spreadsheets and whose keys represent the column headers; The second returned element is the Min
 * Replicate Hits (%) parameter; the third is Min Replicate Hits Blanks (%); the fourth is Max Replicate CV; the fifth
 * is the MRL Standard Deviation Multiplier.
 */
export function getOccurrenceAndParameterData(xlsxPath) {
  // // get the file using 'xlsx' package
  // const file = XLSX.readFile(xlsxPath);

  let file = xlsxPath;

  let [
    min_replicate_hits_percent,
    min_replicate_blank_hit_percent,
    max_replicate_cv_value,
    MRL_mult,
  ] = getAnalysisParameters(file);
  let data = getOccurrenceData(file);

  return [
    data,
    min_replicate_hits_percent,
    min_replicate_blank_hit_percent,
    max_replicate_cv_value,
    MRL_mult,
  ];
}

/**
 * Returns a list of unique headers. Note that these are not just the sample headers.
 *
 * @param {object[]} dataArr The array of objects that each represent one row of the data.
 * @returns {string[]} A list of the unique headers from dataArr.
 */
export function getUniqueHeaders(dataArr) {
  // iterate over all keys and store unique keys
  let uniqueHeaders = [];
  let data = [dataArr[0], dataArr[dataArr.length - 1]]; // only need to check the first and last rows (when pos + neg present)
  for (let rowObj of data) {
    // iterate over rows
    Object.keys(rowObj).forEach((key) => {
      // iterate over column headers
      if (!uniqueHeaders.includes(key)) {
        uniqueHeaders.push(key);
      }
    });
  }

  return uniqueHeaders;
}

/**
 * Returns the number of characters that differ between two strings.
 *
 * @param {string} s1
 * @param {string} s2
 * @returns {number} The number of characters that differ between s1 and s2.
 */
export function differences(s1, s2) {
  // remove parenthesis and their contents
  let regex = /\([^)]*\)/g;
  s1 = s1.replace(regex, "");
  s2 = s2.replace(regex, "");

  let count = 0;

  // iterate through the characters of each string
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] !== s2[i]) {
      count++;
    }
  }

  // add the absolute difference in string lengths
  count += Math.abs(s1.length - s2.length);

  return count;
}

/**
 * A function to group the dataframe's column headers into sets of similar names which represent replicates.
 * The output of this function will NOT contain the first column header.
 *
 * @param {object[]} dataArr The array of data whose elements are objects that represent a row.
 * @returns {string[][]}
 */
export function parseHeaders(dataArr) {
  // get the unique column headers and iterate over them
  const headers = getUniqueHeaders(dataArr);
  let countS = 0;
  let countD = 0;
  let newHeaders = [];
  for (let s = 0; s < headers.length - 1; s++) {
    const diff = differences(String(headers[s]), String(headers[s + 1]));
    if (diff < 2) {
      // 3 is more common
      countS++;
    } else {
      countD++;
      countS++;
    }
    if (!String(headers[s]).includes("_Flags")) {
      newHeaders.push([headers[countS], countD]);
    }
  }
  // sort by the countD value
  newHeaders.sort((a, b) => a[1] - b[1]);

  // group data by countD value
  const groups = newHeaders.reduce((acc, item) => {
    const key = item[1];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  // transform groups into desired format
  const new_headers_list = Object.values(groups).map((group) =>
    group.map((item) => item[0])
  );

  return new_headers_list;
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
  let allHeaders = parseHeaders(dataArr);

  // clean headers to only have the header names
  const non_samples = ["MRL"];
  let samHeaders = [];
  for (let sublist of allHeaders) {
    if (
      sublist.length > 1 &&
      !non_samples.some((x) => sublist[0].includes(x))
    ) {
      samHeaders.push(sublist[0].slice(0, sublist[0].length - 1));
    }
  }

  // isolate the sample groups from the stats columns
  const prefixes = [
    "Mean ",
    "Median ",
    "CV ",
    "STD ",
    "Detection Count ",
    "Detection Percentage ",
  ];
  const sampleGroups = samHeaders.filter(
    (item) => !prefixes.some((prefix) => item.includes(prefix))
  );

  // order our samples. Blank should be last, pooled 2nd last, and anything in form <number><unit> should be chronological (not alphabetical)
  const blankStrings = [
    "MB",
    "Mb",
    "mb",
    "BLANK",
    "Blank",
    "blank",
    "BLK",
    "Blk",
  ];
  sampleGroups.sort((a, b) => {
    const isBlankA = blankStrings.includes(a);
    const isBlankB = blankStrings.includes(b);

    const isPooledA = a === "Pooled";
    const isPooledB = b === "Pooled;";

    const matchA = a.match(/^(\d+)([a-zA-Z]+)/);
    const matchB = b.match(/^(\d+)([a-zA-Z]+)/);

    // move blank strings to end
    if (isBlankA && !isBlankB) return 1;
    if (!isBlankA && isBlankB) return -1;

    // move pooled to second to last if present
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
 * Returns the blank header names for "Mean X", "STD X" and "Detection Percentage X".
 *
 * @param {string[]} sampleGroups The unique sample headers.
 * @returns {[string, string, string]} An array of the blank headers "Mean X", "STD X" and "Detection Percentage X".
 */
export function getBlankHeaders(sampleGroups) {
  // many potential blank header prefixes
  const blankStrings = [
    "MB",
    "Mb",
    "mb",
    "BLANK",
    "Blank",
    "blank",
    "BLK",
    "Blk",
  ];
  const blankCol = sampleGroups.filter((item) =>
    blankStrings.some((x) => item.includes(x))
  )[0];

  // construct all desired blank headers
  const blankMeanHeader = "Mean " + blankCol;
  const blankStdHeader = "STD " + blankCol;
  const blankRepPerHeader = "Detection Percentage " + blankCol;

  const arr = [blankMeanHeader, blankStdHeader, blankRepPerHeader];

  return arr;
}

/**
 * Returns arrays of the meanColHeaders, cvColHeaders and meanColHeaders.
 *
 * @param {string[]} sampleGroups The unique sample headers.
 * @returns {[string[], string[], string[]]} meanColHeaders, cvColHeaders, meanColHeaders.
 */
export function getRepCvMeanHeaders(sampleGroups) {
  const repColHeaders = sampleGroups.map((sampleHeader) => {
    return "Detection Percentage " + sampleHeader;
  });
  const cvColHeaders = sampleGroups.map((sampleHeader) => {
    return "CV " + sampleHeader;
  });
  const meanColHeaders = sampleGroups.map((sampleHeader) => {
    return "Mean " + sampleHeader;
  });

  const arr = [repColHeaders, cvColHeaders, meanColHeaders];

  return arr;
}

/**
 * Returns an updated dataArr with MRL values set.
 *
 * @param {object[]} dataArr The data array whose elements are objects that represent rows.
 * @param {string} blankMeanHeader The header for blank mean value.
 * @param {string} blankStdHeader The header for blank STD value.
 * @param {string} blankRepPerHeader The header for blank replicate percent.
 * @param {number} MrlMul The MRL multiplier.
 * @param {number} minReplicateBlankHitPercent The minimum replicate blank hit percent.
 * @returns {object[]} dataArr after filling in the MRL keys.
 */
export function calcMRL(
  dataArr,
  blankMeanHeader,
  blankStdHeader,
  blankRepPerHeader,
  MrlMult,
  minReplicateBlankHitPercent
) {
  // calculate MRLs
  dataArr.forEach((row) => {
    row["MRL"] = row[blankMeanHeader] + MrlMult * row[blankStdHeader];
  });
  dataArr.forEach((row) => {
    if (row["MRL"] === null || row["MRL"] === "") {
      if (row[blankMeanHeader] === null || row[blankMeanHeader] === "") {
        row["MRL"] = 0;
      } else {
        row["MRL"] = null;
      }
    }
  });

  // If blank replicate percentage column fails, zero out MRL
  dataArr.forEach((row) => {
    if (row[blankRepPerHeader] < minReplicateBlankHitPercent) {
      row["MRL"] = 0;
    }
  });

  return dataArr;
}

/**
 * Returns the subset of our data with only the CV columns.
 *
 * @param {object[]} dataArr The data array whose elements are objects that represent rows.
 * @param {string[]} cvColHeaders An array of the cv column header names.
 * @returns {object[]} The subset of dataArr with only CV columns, with a FeatureID key. Each element is 1 feature.
 */
export function getCvSubset(dataArr, cvColHeaders) {
  let cvData = [];
  for (let row of dataArr) {
    let temp = {};
    for (let key in row) {
      if (cvColHeaders.includes(key)) {
        temp[key] = row[key];
      }
    }

    // add feature ID
    temp["FeatureID"] = row["Feature ID"];

    cvData.push(temp);
  }

  return cvData;
}

/**
 * Cleans, sorts and prepares the cvData for generating the heatmap. I chose to write this function in a way that
 * maximizes performance at the cost of readability. It would be more readable if we were to iterate over the data
 * multiple times (similar to how the python code is written), but it is more efficient to handle as many tasks as
 * possible within a single iteration of the data. Here, we iterate through 3 times. The first iteration sets failed
 * n_abun and MRL samples to null. The second iteration checks if we pass the CV threshold, if so it adds to a
 * "belowCount" key for sorting on features with the most detects, AND goes ahead and sets the -1 (failed replicat/MRL),
 * 0 (pass all) and 1 (failed cv). The third iteration, is to remove the "belowCount" key.
 *
 * @param {object[]} cvData The cvData structure containing the CV values for each row.
 * @param {object[]} data The full data structure imported from the webapp output, containing all columns & MRL values.
 * @param {number} minReplicateBlankHitPercent The min replicate blank percent parameter.
 * @param {number} minReplicateHitsPercent The min replicate blank percent parameter.
 * @param {number} maxReplicateCvValue The max CV value parameter.
 * @param {string[]} repColHeaders A list of replicate percent column names.
 * @param {string[]} cvColHeaders A list of cv column names.
 * @param {string[]} meanColHeaders A list of mean column names.
 * @param {string} blankRepPerHeader The header name used for blank replicate percentage.
 * @returns {object[]} The transformed cvData data structure after sorting by # of passed samples,
 * and setting the CV to -1 for failing replicate/MRL, 0 for passing all, and 1 for failing CV.
 */
export function cleanCvDataAndGetDiscretizedData(
  cvData,
  data,
  minReplicateBlankHitPercent,
  minReplicateHitsPercent,
  maxReplicateCvValue,
  repColHeaders,
  cvColHeaders,
  meanColHeaders,
  blankRepPerHeader
) {
  // first filter on n_abun and MRL cutoffs
  for (let i = 0; i < cvColHeaders.length; i++) {
    let x = cvColHeaders[i];
    let y = repColHeaders[i];
    let z = meanColHeaders[i];
    const sampleName = x.slice(3, x.length);

    // replace cvData values with null for n_abun and MRL cutoffs
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      data[rowIndex][`passSampleReplicate${sampleName}`] = true;
      data[rowIndex][`passCV${sampleName}`] = true;
      data[rowIndex][`passMRL${sampleName}`] = true;
      if (y === blankRepPerHeader) {
        if (data[rowIndex][y] < minReplicateBlankHitPercent) {
          cvData[rowIndex][x] = null;
          data[rowIndex][`passSampleReplicate${sampleName}`] = false;
          continue;
        }
      } else if (data[rowIndex][y] < minReplicateHitsPercent) {
        cvData[rowIndex][x] = null;
        data[rowIndex][`passSampleReplicate${sampleName}`] = false;
        continue;
      }
      // added condition for a meanValue of "" to fail the MRL
      if (data[rowIndex][z] < data[rowIndex]["MRL"]) {
        cvData[rowIndex][x] = null;
        data[rowIndex][`passMRL${sampleName}`] = false;
      }
    }
  }

  // add sum of trues for cv cutoff for each row, and set all values to -1, 0, 1 for heatmap coloring
  for (let rowIndex = 0; rowIndex < cvData.length; rowIndex++) {
    cvData[rowIndex]["belowCount"] = 0;
    for (let colHeader of cvColHeaders) {
      if (cvData[rowIndex][colHeader] !== null) {
        if (cvData[rowIndex][colHeader] <= maxReplicateCvValue) {
          cvData[rowIndex]["belowCount"] += 1;
          cvData[rowIndex][colHeader] = 0; // pass cv
        } else {
          cvData[rowIndex][colHeader] = 1; // fail cv
          data[rowIndex][
            `passCV${colHeader.slice(3, colHeader.length)}`
          ] = false;
        }
      } else {
        cvData[rowIndex][colHeader] = -1; // failed replicate or MRL
      }
    }
  }

  // sort values by number of detects present
  cvData.sort((a, b) => a.belowCount - b.belowCount);

  // remove belowCount key
  cvData.forEach((obj) => {
    delete obj.belowCount;
  });

  return cvData;
}

/**
 * This is the final step in data processing before generating the heatmap itself. Returns a flattened form of our
 * preprocessed data in the form of [{featureIndex: x, sampleIndex: y, value: z}, ...] with length nFeatures*nSamples.
 *
 * @param {object[]} cvDataDiscrete The discretized cv data - e.g., the returned value from
 * cleanCvDataAndGetDiscretizedData().
 * @param {object[]} data The full data structure imported from the webapp output, containing all columns & MRL values.
 * @returns {object[]} An array of object containing the feature index, sample index and value (-1, 0, 1) for
 * each sample to be plotted on the heatmap.
 */
export function getFlattenedCvData(cvDataDiscrete, data, sampleGroups) {
  let cvDataFlat = [];
  cvDataDiscrete.forEach((feature, featureIndex) => {
    const featureID = feature["FeatureID"];
    const featureData = data.find((obj) => obj["Feature ID"] === featureID);
    Object.entries(feature).forEach(([sample, value], k) => {
      if (sample.startsWith("CV MD")) {
        console.log(sample);
      }
      // skip over featureID keys
      if (!sample.endsWith("tureID")) {
        const sampleIndex = sampleGroups.indexOf(
          sample.slice(3, sample.length)
        );
        const mrl = Number(featureData["MRL"].toFixed(1));
        const repPercentage =
          featureData[`Detection Percentage ${sample.slice(3, sample.length)}`];
        const repCount =
          featureData[`Detection Count ${sample.slice(3, sample.length)}`];
        const meanValue = featureData[`Mean ${sample.slice(3, sample.length)}`];
        let mrlQuotient =
          featureData[`MRL`] !== 0 ? meanValue / featureData[`MRL`] : "&#8734;";
        if (Number.isNaN(mrlQuotient)) {
          mrlQuotient = 0;
        }
        // if (mrlQuotient < 1) {
        //   featureData[`passMRL${sample.slice(3, sample.length)}`] = false;
        // }
        let cv = featureData[`CV ${sample.slice(3, sample.length)}`];
        // if (cv === "") {
        //   cv = "NA";
        //   mrlQuotient = "NA";
        // } else {
        //   cv = Number(cv.toFixed(3));
        // }
        // AC - update code to handle undefined values
        if (cv === "" || cv === undefined || isNaN(cv)) {
          cv = "NA";
          mrlQuotient = "NA";
        } else {
          cv = Number(cv).toFixed(3);
        }

        let s_name = null;
        if (sample.endsWith("_")) {
          s_name = sample.slice(3, sample.length - 1);
        } else {
          s_name = sample.slice(3, sample.length);
        }
        const passFail =
          value === 1 ? "Fail" : value === 0 ? "Pass" : "Non-Detect";
        cvDataFlat.push({
          featureIndex: featureIndex,
          sampleIndex: sampleIndex,
          value: value,
          color:
            passFail === "Pass"
              ? "white"
              : passFail === "Fail"
              ? "red"
              : "grey",
          sampleName: s_name,
          featureId: feature["FeatureID"],
          repDetectionValue: repCount,
          repPercentValue: repPercentage,
          cvValue: cv,
          mrlQuotient:
            mrlQuotient === 0 || typeof mrlQuotient === "string"
              ? mrlQuotient
              : mrlQuotient.toFixed(3),
          mrl: mrl,
          decision: passFail,
          passSampleReplicate:
            featureData[`passSampleReplicate${sample.slice(3, sample.length)}`],
          passCV:
            cv === "NA"
              ? false
              : featureData[`passCV${sample.slice(3, sample.length)}`],
          passMRL: featureData[`passMRL${sample.slice(3, sample.length)}`],
          meanValue: meanValue,
        });
      }
    });
  });

  return [cvDataFlat, data];
}

/**
 * Get meta-data on total number of features, samples, occurrences, passes, fails and non-detects.
 *
 * @param {object[]} cvDataFlat The array of objects containing data on each occurrence.
 * @param {number} nFeatures The integer number of features in the data.
 * @returns {object} An object containing metadata on the total number of pass/fails/non-detects, etc.
 */
export function getSamplePassCounts(cvDataFlat, nFeatures) {
  let samplePassCounts = {
    total: {
      nFeatures: nFeatures,
      nSamples: 0,
      nOccurrences: 0,
      nPass: 0,
      nFail: 0,
      nNonDetect: 0,
    },
  };
  cvDataFlat.forEach((item, index) => {
    // ensure sample name is present
    const sampleName = item["sampleName"];
    if (!Object.keys(samplePassCounts).includes(sampleName)) {
      samplePassCounts[sampleName] = {
        nPass: 0,
        nFail: 0,
        nNonDetect: 0,
      };
      samplePassCounts["total"]["nSamples"]++;
    }

    // add counts
    const color =
      item["value"] === 1 ? "red" : item["value"] === 0 ? "white" : "grey";
    if (color === "white") {
      samplePassCounts[sampleName]["nPass"]++;
      samplePassCounts["total"]["nPass"]++;
    } else if (color === "red") {
      samplePassCounts[sampleName]["nFail"]++;
      samplePassCounts["total"]["nFail"]++;
    } else {
      samplePassCounts[sampleName]["nNonDetect"]++;
      samplePassCounts["total"]["nNonDetect"]++;
    }
  });

  samplePassCounts["total"]["nOccurrences"] =
    samplePassCounts["total"]["nFeatures"] *
    samplePassCounts["total"]["nSamples"];

  return samplePassCounts;
}

/**
 * Get the occurrence counts for pass, fail and non-detects.
 *
 * @param {object[]} cvDataFlat Our cleaned data structure array with one object for each occurrence.
 * @returns {number[]} The number of occurrences who failed (red), are non-detects (grey), and passed (white).
 */
export function getColorCounts(cvDataFlat) {
  let redCount = 0;
  let greyCount = 0;
  let whiteCount = 0;
  cvDataFlat.forEach((instance, index) => {
    if (instance.value === 1) {
      redCount++;
    } else if (instance.value === -1) {
      greyCount++;
    } else {
      whiteCount++;
    }
  });

  return [redCount, greyCount, whiteCount];
}
