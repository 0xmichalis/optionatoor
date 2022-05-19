import { utils } from 'ethers'
import { BigNumber } from '@ethersproject/bignumber';

export interface IOption {
    optionType: 'CALL' | 'PUT';
    asset: string;
    // Unix timestamp of maturity
    maturity: number
    // Strike in USD
    strike: BigNumber
    // Contract size
    contractSize: string
    // Premium in USD
    premium: BigNumber
}

export const oKey = (o: IOption): string => {
    return o.optionType + '-' 
        + o.asset + '-' + 
        utils.formatUnits(o.strike).replace('.0', '') + '-' 
        + new Date(o.maturity).toDateString()
}
