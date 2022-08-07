import { utils } from 'ethers';

import { IOption } from '../types/option';

export const sleep = async (seconds: number) => {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const arbitrageMessage = (buy: IOption, sell: IOption): string => {
    return `${stringifyOption(buy)}
${stringifyOptionWhereAndHowMuch(sell)}`;
};

export const stringifyOption = (o: IOption): string => {
    return `> Asset: **${o.asset}**
> Contract size: **${o.contractSize}**
${stringifyOptionWhereAndHowMuch(o)}`;
};

const stringifyOptionWhereAndHowMuch = (o: IOption): string => {
    const premium = utils.formatUnits(o.premium);
    return `> ${o.isBuy ? 'Buy' : 'Sell'} at **$${trimDecimals(premium)}** in ${o.market} (**${
        o.link
    }**)`;
};

const trimDecimals = (price: string): string => {
    return parseFloat(price).toFixed(2);
};
