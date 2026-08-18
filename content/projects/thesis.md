---
title: Using Score-based Methods for Unnormalisable Probability Density Estimation
summary: My PhD Thesis. Truncated Density Estimation and Parameter Derivative Estimation
tags:
- Density Estimation
- Score Matching
- Stein Discrepancies
- Unnormalisable Density Estimation
- Parameter Derivative Estimation
date: 2023-04-01

mark: thesis
image: /assets/img/projects/thesistitle.png
links:
  Thesis: /assets/pdf/thesis.pdf
  Presentation: /assets/pdf/thesispres.pdf
---
Classical statistical modelling such as maximum likelihood estimation relies on knowledge of the normalising constant of a probability density model. Under certain cases, for example where data are observed on a generic truncated domain, the normalising constant is intractable. Whilst conventional methods usually approximate this term via numerical integration, methods such as score matching and minimum Stein discrepancy estimators bypass its evaluation entirely.

This thesis is the culmination of the work during my PhD. It starts with an extension of score matching for unnormalisable density estimation, where I assisted my supervisor to finish a paper. Then I build my own extensions. Starting with truncated score matching on a manifold, then a new implementation of density estimation using Stein discrepancies, and finally parameter derivative estimation using score matching for changepoint detection.