---
title: Chicago Crime Classification
summary: Modelling crimes in Chicago, using a public dataset. Logistic regression was used to predict whether an arrest would be successful or not, based on a number of predictors.
tags:
- Classification
- Spatial Statistics
- Real Data
- Big Data
date: 2019-11-22
mark: city
image: /assets/img/projects/chicago.png
links:
  Package: https://github.com/jakespiteri/chicagocrime
---

A group project as part of the first term of the COMPASS CDT involved modelling different aspects of a large data set detailing crimes in Chicago. Pictured is a kernel density estimate of both the location of crimes in the city as well as the population.

My input to this project was to use logistic regression methods to classify whether an arrest would be successful or not, given other covariates in the crime set; detailing the location, the area, the type of crime type, amongst others. This involved feature engineering and using LASSO coefficient paths to judge the most 'important' covariates.

The package that was created for this project can be found as a Github repository [here](https://github.com/jakespiteri/chicagocrime).
