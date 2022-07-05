export const getOptionsQuery = (now: number) => `
{
  options(first: 100, where: {maturity_gt: ${now}}) {
    pairName
    optionType
    maturity
    strike64x64
  }
}
`;
