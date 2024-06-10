// adapted from https://github.com/xenova/transformers.js/blob/da2688626d7812ad1ea47fd304c2072cc685051b/examples/semantic-image-search-client/src/app/worker.js#L46
function cosineSimilarity(query_embeds, database_embeds) {
    const numDB = database_embeds.dims[0]
    const EMBED_DIM = database_embeds.dims[1]
    const similarityScores = new Array(numDB)
    // nb: query_embeds must be a single query

    for (let i = 0; i < numDB; ++i) {
        const startOffset = i * EMBED_DIM
        const dbVector = database_embeds.data.slice(startOffset, startOffset + EMBED_DIM)

        let dotProduct = 0
        let normEmbeds = 0
        let normDB = 0

        for (let j = 0; j < EMBED_DIM; ++j) {
            const embedValue = query_embeds.data[j]
            const dbValue = dbVector[j]

            dotProduct += embedValue * dbValue
            normEmbeds += embedValue * embedValue
            normDB += dbValue * dbValue
        }

        similarityScores[i] = dotProduct / (Math.sqrt(normEmbeds) * Math.sqrt(normDB))
    }

    return similarityScores
}

async function measureTime(fn, ...args) {
  const start = performance.now()
  const result = await fn(...args)
  const end = performance.now()
  const executionTime = end - start
  return { result, executionTime }
}

function reshapeArray(flatArray, n, l) {
  const result = []
  for (let i = 0; i < flatArray.length; i += n) {
    result.push(flatArray.slice(i, i + n))
  }
  return result
}

// extractor = await tri.pipeline('feature-extraction', 'Supabase/gte-small')  
extractor = await tri.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')  

funcs = tri.metadata.everything.getFile("src/excmds.ts").getFunctions().filter(f => !f[1].hidden && f[1].doc.length > 0)

docEmbeds = await extractor(funcs.map(f => f[0] + ": " + f[1].doc.slice(0, 512)), { pooling: 'mean', normalize: true }) // need to check max length. takes a few seconds

unflat = reshapeArray(docEmbeds.data, docEmbeds.dims[1], docEmbeds.dims[0])

vectors = funcs.map(f=>f[0]).map((f, i) => {return {id: f, vector: unflat[i]}})
// vectors = funcs.map(f=>f[0]).map((f, i) => {return {id: f, vector: unflat[i]}})

// max neighbours, max nodes to visit during build, vector dimension, metric
hnsw = new tri.HNSW(10, 200, docEmbeds.dims[1], 'cosine')

await hnsw.buildIndex(vectors)

probe = 'easter egg'
outputProbe = await extractor([probe], { pooling: 'mean', normalize: true }) // approx 10 ms
sims = cosineSimilarity(outputProbe, docEmbeds) // approx 60 ms
Array.from(funcs.map(f=>f[0]).entries()).sort((l, r) => sims[l[0]] < sims[r[0]]).map(x=>x[1])

hnsw.searchKNN(outputProbe.data, 5)


await measureTime( async _ => await extractor(["melons"], { pooling: 'mean', normalize: true })) // 10 ms
await measureTime( async _ => cosineSimilarity(outputProbe, docEmbeds)) // 60 ms
await measureTime( async _ => hnsw.searchKNN(outputProbe.data, 5)) // 1536 ms lol
