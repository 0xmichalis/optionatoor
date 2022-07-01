import { utils, BigNumber } from 'ethers'

export interface IOption {
    market: string
    link: string
    optionType: 'CALL' | 'PUT'
    isBuy: boolean
    asset: string
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
    const m = new Date(o.maturity)
    return o.optionType + '-' 
        + o.asset + '-' + 
        utils.formatUnits(o.strike).replace('.0', '') + '-' 
        + `${m.getDate()}-${m.getMonth()+1}-${m.getFullYear()}`
}
