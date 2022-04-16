export const fetchTokensQuery = `
fragment Token on Token {
    id
    name
    symbol
    decimals
    address
    chainId
    priceOracle
    priceInUsd
  }
  query Token($first: Int = 100, $skip: Int = 0) {
    tokens(first: $first, skip: $skip) {
      ...Token
    }
  }
`

export const fetchPoolsQuery = `
fragment Token on Token {
    id
    name
    symbol
    decimals
    address
    chainId
    priceOracle
    priceInUsd
  }
  fragment TokenPair on TokenPair {
    id
    name
    base {
      ...Token
    }
    underlying {
      ...Token
    }
  }
  fragment Pool on Pool {
    id
    address
    chainId
    name
    pairName
    pair {
      ...TokenPair
    }
    base {
      ...Token
    }
    underlying {
      ...Token
    }
    optionType
    cLevel
    cLevel64x64
    minTokenAmount
    startBlock
    startTimestamp
    totalDeposited
    totalWithdrawn
    netDeposited
    totalLocked
    totalAvailable
    netSize
    netSizeInUsd
    utilizationRate
    averageReturn
    profitLossPercentage
    annualPercentageReturn
    totalVolume
    totalVolumeInUsd
    totalExercised
    totalExerciseLoss
    totalClosed
    totalSellLoss
    totalCloseLoss
    totalCharged
    totalFeesEarned
    totalPremiumsEarned
    totalPremiumsEarnedInUsd
    openInterest
    averageMaturity
    averageStrike
    claimedLiquidityRewards
  }
  query Pools($first: Int = 100, $skip: Int = 0) {
    pools(first: $first, skip: $skip) {
      ...Pool
    }
  }  
`

export const fetchOptionsQuery = (now: number) => `
{
  options(first: 100, where: {maturity_gt: ${now}}) {
    id
    pairName
    optionType
    maturity
    strike
    strike64x64
    strikeInUsd
    lastTradePrice
  }
}
`
