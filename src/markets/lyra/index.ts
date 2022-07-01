import Lyra from '@lyrafinance/lyra-js';
import { BigNumber, utils } from 'ethers';

import { config } from '../../config';
import { IOption } from '../../types/option';

class LyraService {
    private lyra: Lyra;
    private dappLink = 'https://app.lyra.finance';

    // Contract sizes
    private btcContractSize: string;
    private ethContractSize: string;

    constructor() {
        this.lyra = new Lyra();

        this.btcContractSize = config.get('CONTRACT_SIZE_BTC');
        this.ethContractSize = config.get('CONTRACT_SIZE_ETH');

        console.log(`Lyra client initialized.`);
    }

    fromBigNumber(number: BigNumber, decimals: number = 18): number {
        return parseFloat(utils.formatUnits(number.toString(), decimals));
    }

    // Set isBuy to true to get quotes for long options
    async getOptions(isBuy = false): Promise<IOption[]> {
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
                            market: 'Lyra',
                            link: this.dappLink,
                            optionType: 'CALL',
                            isBuy,
                            asset: market.name,
                            maturity: board.expiryTimestamp * 1000,
                            strike: strike.strikePrice,
                            contractSize: utils.formatUnits(call.size),
                            premium: call.premium, // Premium returned in sUSD
                        });
                    }

                    const put = await strike.quote(false, isBuy, contractSize);
                    if (this.fromBigNumber(put.premium) != 0) {
                        options.push({
                            market: 'Lyra',
                            link: this.dappLink,
                            optionType: 'PUT',
                            isBuy,
                            asset: market.name,
                            maturity: board.expiryTimestamp * 1000,
                            strike: strike.strikePrice,
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

export default LyraService;
