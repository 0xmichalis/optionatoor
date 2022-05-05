import { BigNumber } from "@ethersproject/bignumber";

export interface IOption {
    optionType: 'CALL' | 'PUT';
    pairName: string;
    // Unix timestamp of maturity
    maturity: number
    // Strike in USD
    strike: BigNumber
    // Contract size
    contractSize: string
    // Premium in USD
    premium: BigNumber
}
