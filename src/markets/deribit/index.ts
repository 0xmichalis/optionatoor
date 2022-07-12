import axios, { AxiosError } from 'axios';
import { utils } from 'ethers';

import { config } from '../../config';
import { IOption } from '../../types/option';

interface DeribitOrderbook {
    buys: IOption[];
    sells: IOption[];
}

class DeribitClient {
    private marketLink = 'https://www.deribit.com/options/';
    private apiBaseURL = 'https://deribit.com/api/v2/';

    // Contract sizes
    private btcContractSize: string;
    private ethContractSize: string;

    constructor() {
        console.log(`Initializing Deribit client...`);

        this.btcContractSize = config.get('CONTRACT_SIZE_BTC');
        this.ethContractSize = config.get('CONTRACT_SIZE_ETH');

        console.log(`Deribit client initialized.`);
    }

    private currencyFromAsset(asset: string): string {
        return asset.split('-', 2)[0];
    }

    private dateFromAsset(asset: string): string {
        return asset.split('-', 2)[1];
    }

    private size(asset: string): string {
        const currency = this.currencyFromAsset(asset);
        switch (currency) {
            case 'BTC':
                return this.btcContractSize;
            case 'ETH':
                return this.ethContractSize;
            default:
                throw new Error(`Unsupported currency: ${currency}`);
        }
    }

    private unifyOrderbookRequests(
        otherBuys: Map<string, IOption>,
        otherSells: Map<string, IOption>
    ): Map<string, { isBuy: boolean; isSell: boolean }> {
        const instruments = new Map<string, { isBuy: boolean; isSell: boolean }>();

        for (let [asset] of otherBuys) {
            instruments.set(asset, { isBuy: true, isSell: false });
        }

        for (let [asset] of otherSells) {
            let inst = instruments.get(asset);
            if (!inst) {
                inst = { isBuy: false, isSell: true };
            }
            inst.isSell = true;
            instruments.set(asset, inst);
        }

        return instruments;
    }

    async getOptions(
        otherBuys: Map<string, IOption>,
        otherSells: Map<string, IOption>
    ): Promise<DeribitOrderbook> {
        const buys: IOption[] = [];
        const sells: IOption[] = [];

        // Unify other buys and sells to minimize orderbook requests to Deribit
        const instruments = this.unifyOrderbookRequests(otherBuys, otherSells);

        // Fetch the orderbook only for provided offers from
        // the other side
        for (let [asset, { isBuy, isSell }] of instruments) {
            try {
                // Check whether there is an orderbook for the provided instrument
                // in Deribit and get its best ask/bid for the provided contract size.
                const url =
                    this.apiBaseURL + `/public/get_order_book?depth=5&instrument_name=${asset}`;
                const resp = await axios.get(url);

                const wantedSize = Number(this.size(asset));
                const buySize = Number(resp.data.result.best_ask_amount);
                const sellSize = Number(resp.data.result.best_bid_amount);
                const indexPrice = Number(resp.data.result.index_price);

                // In the future, may want to traverse the orderbook to get
                // the wanted size.
                if (isBuy && buySize >= wantedSize) {
                    const premium =
                        Number(resp.data.result.best_ask_price) * wantedSize * indexPrice;
                    const currency = this.currencyFromAsset(asset);
                    const date = this.dateFromAsset(asset);

                    buys.push({
                        asset,
                        market: 'Deribit',
                        link: this.marketLink + `${currency}/${currency}-${date}/${asset}`,
                        contractSize: this.size(asset),
                        premium: utils.parseUnits(String(premium.toFixed(18))),
                        isBuy: true,
                    });
                }

                if (isSell && sellSize >= wantedSize) {
                    const premium =
                        Number(resp.data.result.best_bid_price) * wantedSize * indexPrice;
                    const currency = this.currencyFromAsset(asset);
                    const date = this.dateFromAsset(asset);

                    sells.push({
                        asset,
                        market: 'Deribit',
                        link: this.marketLink + `${currency}/${currency}-${date}/${asset}`,
                        contractSize: this.size(asset),
                        premium: utils.parseUnits(String(premium.toFixed(18))),
                        isBuy: false,
                    });
                }
            } catch (e: unknown) {
                const err = e as AxiosError;
                // If it's a bad request then the provided instrument
                // does not exist in Deribit so we can ignore the error
                if (err.response?.status !== 400) throw e;
            }
        }

        return { buys, sells };
    }
}

export default DeribitClient;
