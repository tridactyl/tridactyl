const extractor = await tri.pipeline('feature-extraction', 'Supabase/gte-small')  
// const extractor = await tri.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')  
const sentences = ['This is an example sentence', 'Each sentence is converted']
const output = await extractor(sentences, { pooling: 'mean', normalize: true })

let probe = 'sample'
let outputProbe = await extractor([probe], { pooling: 'mean', normalize: true })

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

let sims = cosineSimilarity(outputProbe, output)

Array.from(sentences.entries()).sort((l, r) => sims[l[0]] < sims[r[0]])

const funcs = tri.metadata.everything.getFile("src/excmds.ts").getFunctions().filter(f => !f[1].hidden && f[1].doc.length > 0)

const docEmbeds = await extractor(funcs.map(f => f[0] + ": " + f[1].doc.slice(0, 512)), { pooling: 'mean', normalize: true }) // need to check max length. takes a few seconds

probe = 'easter egg'
outputProbe = await extractor([probe], { pooling: 'mean', normalize: true })
sims = cosineSimilarity(outputProbe, docEmbeds)
Array.from(funcs.map(f=>f[0]).entries()).sort((l, r) => sims[l[0]] < sims[r[0]]).map(x=>x[1])
