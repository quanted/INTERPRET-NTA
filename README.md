# INTERPRET NTA Decision Tree

**Author:** E. Tyler Carr

## Dependencies

This project requires the following libraries:

- [D3.js](https://d3js.org/) (version 7)
- [SheetJS (xlsx)](https://sheetjs.com/) (version 0.17.0)

## Description

The decision tree is a visualization to aid in a NTA QA/QC workflow by showing how many occurrences or features pass each quality check.

1. Replicate threshold: samples should be ran in replicate, this check ensures that an occurrence wasn't just an anomaly. For example, if you ran a sample 3 times and set the replicate threshold to 66.7%, an occurrence would only pass this step if it was seen at least 2 out of 3 times.
2. CV threshold: we want the occurrences to be below a certain coefficient of variation (CV) value.
3. MRL multiplier: the MRL compares the mean abundance of an occurrence against $\text{Blank\_Mean\_Abundance} + \text{std}(\text{mrlMult})$. If the abundance is greater than or equal to this value, it passes.

## Functionality

By default, the decision tree shows the occurrence values at each step using the user provided threshold parameters in plot A, which may be compared to the same data being filtered on a different set of threshold parameters in plot B. The threshold parameters for each plot may be changed using the threshold sliders and input boxes below them.

Certain counts of particular interest may be viewed in the table in between the two sets of sliders.

![static tree](./resources/static_tree.png)

### Feature Level View and Icicle Plots

The occurrence level and feature level views may be toggled by clicking the microscope button in the top left.

The ice cube button below the microscope may be clicked to toggle between the decision tree and the icicle plots. The icicle plots contain the same information as the tree, but each step gives a visual representation of what proportion of your initial data made it into each bin and includes an on-hover tooltip with some additional information.

![static icicle](./resources/static_icicle.png)

### Downloading PNGs

The buttons below the icicle plot toggle may be clicked to download whatever is currently being shown in plot A and plot B, respectively.

## Licensing

### Code

The code in this repository is licensed under the [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](./LICENSE_CODE).

### Data

The dataset used in this project is licensed under a custom proprietary license. Please refer to the [data license file](./LICENSE_DATA) for more details.
