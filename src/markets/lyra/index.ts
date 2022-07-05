import Lyra from '@lyrafinance/lyra-js';
import { BigNumber, utils } from 'ethers';

import { config } from '../../config';
import { IOption, oKey } from '../../types/option';

class LyraClient {
    private lyra: Lyra;
    private marketLink = 'https://app.lyra.finance';

    // Contract sizes
    private btcContractSize: string;
    private ethContractSize: string;

    constructor() {
        console.log(`Initializing Lyra client...`);
        this.lyra = new Lyra();

        this.btcContractSize = config.get('CONTRACT_SIZE_BTC');
        this.ethContractSize = config.get('CONTRACT_SIZE_ETH');

        console.log(`Lyra client initialized.`);
    }

    fromBigNumber(number: BigNumber, decimals: number = 18): number {
        return parseFloat(utils.formatUnits(number.toString(), decimals));
    }

    // Set isBuy to true to get quotes for long options
    async getOptions(isBuy: boolean): Promise<IOption[]> {
        const options: IOption[] = [];

        // Fetch all markets
        const markets = await this.lyra.markets();
        for (let market of markets) {
            let contractSize: BigNumber;
            switch (market.name) {
                case 'BTC':
                    contractSize = utils.parseUnits(this.btcContractSize);
                    break;
                case 'ETH':
                    contractSize = utils.parseUnits(this.ethContractSize);
                    break;
                default:
                    throw new Error(`unknown market: ${market.name}`);
            }

            for (let board of market.liveBoards()) {
                for (let strike of board.strikes()) {
                    const call = await strike.quote(true, isBuy, contractSize);
                    if (this.fromBigNumber(call.premium) != 0) {
                        options.push({
                            asset: oKey(
                                market.name,
                                board.expiryTimestamp * 1000,
                                strike.strikePrice,
                                'C'
                            ),
                            market: 'Lyra',
                            link: this.marketLink,
                            isBuy,
                            contractSize: utils.formatUnits(call.size),
                            premium: call.premium, // Premium returned in sUSD
                        });
                    }

                    const put = await strike.quote(false, isBuy, contractSize);
                    if (this.fromBigNumber(put.premium) != 0) {
                        options.push({
                            asset: oKey(
                                market.name,
                                board.expiryTimestamp * 1000,
                                strike.strikePrice,
                                'P'
                            ),
                            market: 'Lyra',
                            link: this.marketLink,
                            isBuy,
                            contractSize: utils.formatUnits(put.size),
                            premium: put.premium, // Premium returned in sUSD
                        });
                    }
                }
            }
        }

        return options;
    }
}

export default LyraClient;
