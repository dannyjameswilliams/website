---
title: "Late Chunking: Contextual Chunk Embeddings using Long-Context Embedding Models"
authors: [Michael Gunther, Isabelle Mohr, Daniel James Williams, Bo Wang, Han Xiao]
venue: Robust IR @ SIGIR
date: 2025-07-01
mark: latechunking
skills: [NLP, Vector Databases, Embedding Models]
links:
    Paper: https://arxiv.org/pdf/2409.04701
---

Instead of performing the embedding step of a chunk of a document _after_ the chunks get calculated, record all token-level embeddings of a document and chunk post-embedding. In essence, you pool the token embeddings of the document according to the chunk structure, and this means you don't lose contextual level information from chunk to chunk.