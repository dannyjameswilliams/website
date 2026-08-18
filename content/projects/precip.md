---
title: Downscaling Extremes of Precipitation in the South West
summary: My Masters project, using extreme value theory to model maxima of precipitation across my home region. Comparing results from gridded model output and observations.
tags:
- Real Data
- Big Data
- Environment
- GAM
- Extreme Value Theory
date: 2018-07-11

mark: rain
image: /assets/img/projects/precip.png
links:
  Dissertation: /assets/pdf/mastersdiss.pdf
---
For my Masters dissertation project, I used extreme value theory to model the extremes of precipitation across the South West of the UK, and downscale sparse areas using a numerical weather model on a gridded scale. Pictured is the high resolution elevation levels across the South West, with a grid that samples the same elevation levels every 0.25 degrees in longitude and latitude. This highlights one of the problems with downscaling in such a scenario.

Extreme values of rainfall can be categorised by their maxima, and using a generalised extreme value (GEV) distribution, these maxima can be modelled. I modelled two sets of maxima separately; for the observations (point locations) and the model output (gridded locations). A separate downscaling generalised additive model (GAM) was used to compare predictions from both models, and link them together using various covariates. 

You can read more about this project in my final dissertation, which can be found [here](/assets/pdf/mastersdiss.pdf).
