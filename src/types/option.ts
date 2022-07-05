import { utils, BigNumber } from 'ethers';

export interface IOption {
    market: string;
    link: string;
    optionType: 'C' | 'P';
    isBuy: boolean;
    asset: string;
    // Unix timestamp of maturity
    maturity: number;
    // Strike in USD
    strike: BigNumber;
    // Contract size
    contractSize: string;
    // Premium in USD
    premium: BigNumber;
}

export const oKey = (o: IOption): string => {
    const m = new Date(o.maturity);
    // Follows the Deribit format: BTC-31MAR23-26000-C
    return (
        o.asset +
        '-' +
        `${m.getUTCDate()}${m.toLocaleString("default", { month: "short" }).toUpperCase()}${m.getFullYear()-2000}` +
        '-' +
        utils.formatUnits(o.strike).replace('.0', '') +
        '-' +
        o.optionType
    );
};
