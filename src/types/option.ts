import { utils, BigNumber } from 'ethers';

export interface IOption {
    // Follows the Deribit format: BTC-31MAR23-26000-C
    asset: string;
    // Premia, Lyra, ...
    market: string;
    // Link to the market where the option can be sold or bought
    link: string;
    // Whether this is a buy or a sell
    isBuy: boolean;
    // Contract size
    contractSize: string;
    // Premium in USD
    premium: BigNumber;
}

export const oKey = (
    asset: string, // BTC, ETH, ...
    maturity: number, // Unix timestamp
    strike: BigNumber, // In USD terms
    optionType: 'C' | 'P'
): string => {
    const m = new Date(maturity);
    // Follows the Deribit format: BTC-31MAR23-26000-C
    return (
        asset +
        '-' +
        `${m.getUTCDate()}${m
            .toLocaleString('default', { month: 'short' })
            .toUpperCase()}${m.getFullYear() - 2000}` +
        '-' +
        utils.formatUnits(strike).replace('.0', '') +
        '-' +
        optionType
    );
};
