export const getOptionsQuery = (now: number) => `
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
