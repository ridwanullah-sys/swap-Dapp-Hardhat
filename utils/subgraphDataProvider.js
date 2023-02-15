const fetch2 = require("node-fetch")

let queryWithLinear
const getQuery = async (token1Address, token2Address) => {
    queryWithLinear = `
    {
      pool0: pools(
        first: 1000,
        where: { swapEnabled: true, totalShares_gt: "0.000000000001", tokensList_contains: ["${token1Address}", "${token2Address}"] },
        orderBy: totalLiquidity,
        orderDirection: desc
      ) {
        id
        address
        poolType
        swapFee
        totalShares
        tokens {
          address
          balance
          decimals
          weight
          priceRate
        }
        tokensList
        totalWeight
        amp
        expiryTime
        unitSeconds
        principalToken
        baseToken
        swapEnabled
        wrappedIndex
        mainIndex
        lowerTarget
        upperTarget
        sqrtAlpha
        sqrtBeta
        root3Alpha
        alpha
        beta
        c
        s
        lambda
        tauAlphaX
        tauAlphaY
        tauBetaX
        tauBetaY
        u
        v
        w
        z
        dSq
      }
      pool1000: pools(
        first: 1000,
        skip: 1000,
        where: { swapEnabled: true, totalShares_gt: "0.000000000001", tokensList_contains: ["${token1Address}", "${token2Address}"]  },
        orderBy: totalLiquidity,
        orderDirection: desc
      ) {
        id
        address
        poolType
        swapFee
        totalShares
        tokens {
          address
          balance
          decimals
          weight
          priceRate
        }
        tokensList
        totalWeight
        amp
        expiryTime
        unitSeconds
        principalToken
        baseToken
        swapEnabled
        wrappedIndex
        mainIndex
        lowerTarget
        upperTarget
        sqrtAlpha
        sqrtBeta
        root3Alpha
        alpha
        beta
        c
        s
        lambda
        tauAlphaX
        tauAlphaY
        tauBetaX
        tauBetaY
        u
        v
        w
        z
        dSq
      }
    }
  `
}
const query = queryWithLinear
class SubgraphPoolDataService {
    constructor(config) {
        this.config = config
    }
    async getPools() {
        const response = await fetch2(this.config.subgraphUrl, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: queryWithLinear }),
        })
        const { data } = await response.json()
        const pools = [...data.pool0, ...data.pool1000]

        pools.forEach((pool, index) => {
            if (pool.poolType == "HighAmpComposableStable" || pool.poolType == "FX") {
                pools.splice(index, 1)
            }
        })
        return pools !== null && pools !== void 0 ? pools : []
    }
}
async function getPools(url) {
    const response = await fetch2(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryWithLinear }),
    })
    const { data } = await response.json()
    const pools = [...data.pool0, ...data.pool1000]

    //return pools !== null && pools !== void 0 ? pools : []
    console.log(`length before ${pools.length}`)
    pools.forEach((pool, index) => {
        if (pool.poolType == "HighAmpComposableStable" || pool.poolType == "FX") {
            pools.splice(index, 1)
        }
    })
    console.log(`length after ${pools.length}`)
    // const poolsWithUnknownPoolTypes = pools.find((pool) => {
    //     console.log(pool.poolType)
    // })
    // console.log(poolsWithUnknownPoolTypes)
    // console.log(pools[0].poolType)
}
module.exports = {
    SubgraphPoolDataService,
    getPools,
    query,
    getQuery,
}
