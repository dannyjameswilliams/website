---
title: Gaussian Process Classification
summary: Learning, detailing and experimenting with using Gaussian processes for classification. Exploring how to use approximations to avoid unnecessary computational slowdowns with an MCMC sampler.
tags:
- Bayesian
- Gaussian Process
- Simulated Data
- MCMC
date: 2020-06-27

mark: graph
image: /assets/img/projects/gpc.png
links:
  Paper: /assets/pdf/gpc.pdf
  Package: https://github.com/dannyjameswilliams/gpc
---

The second group project I worked on at COMPASS mainly involved learning how Gaussian process classification worked, as it is a complicated procedure, and not as straight forward as Gaussian process regression.

Our work involved a number of aspects that have improved on Gaussian process classification in recent literatures:
 
 - **Pseudo-Marginal Likelihood:** An importance sampling procedure to approximate the marginal likelihood in MCMC sampling.
 - **Subset Selection**: An entropy based measure that chooses a subset of a full dataset that maximises information across the dataset, referred to as the *Information Vector Machine (IVM)*.
 - **Laplace Approximation:** An approximation of the posterior of the latent variables.
 
Together, these approximations makes Gaussian process classification feasibile. Without approximations such as these, the procedure would have an incredible runtime.

Finally, we compared the results on an e-mail spam dataset, and had a higher prediction accuracy than a JAGS implementation of logistic regression. We combined our code, written in Rcpp, into an R package, available [here](https://github.com/dannyjameswilliams/gpc).
