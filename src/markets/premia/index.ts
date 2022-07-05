import { BigNumber, providers, utils } from 'ethers';
import {
    Contract as MulticallContract,
    Provider as MulticallProvider,
} from 'ethers-multicall';

import GraphService from '../../services/graph';
import { config } from '../../config';
import { getOptionsQuery } from './queries';
import { IOption } from '../../types/option';

type SupportedNetwork = 'Arbitrum' | 'Fantom' | 'Mainnet';

class PremiaClient {
    // Whether the class is initialized
    private isInitialized: boolean = false;
    private marketLink = 'https://app.premia.finance';

    // RPC providers
    private network: SupportedNetwork;
    private provider: providers.StaticJsonRpcProvider;
    private multicallProvider: MulticallProvider;
    private graphClient: GraphService;

    private allowedPairs = ['WBTC/DAI', 'WETH/DAI'];

    // Contract sizes
    private wbtcContractSize: string;
    private wethContractSize: string;

    // Pools
    private wbtcPool: MulticallContract;
    private wethPool: MulticallContract;

    // Oracles
    private wbtcOracle: MulticallContract;
    private wethOracle: MulticallContract;

    // Decimals
    private wbtcDecimals = 8;
    private wethDecimals = 18;

    constructor(
        network: SupportedNetwork,
        providerURL: string,
        subgraphURL: string,
        btcPool: string,
        ethPool: string,
        btcOracle: string,
        ethOracle: string
    ) {
        console.log(`Initializing Premia ${network} client...`);
        this.network = network;
        this.provider = new providers.StaticJsonRpcProvider(providerURL);
        this.multicallProvider = new MulticallProvider(this.provider);
        this.graphClient = new GraphService(subgraphURL);

        this.wbtcContractSize = config.get('CONTRACT_SIZE_BTC');
        this.wethContractSize = config.get('CONTRACT_SIZE_ETH');

        const poolAbi = [
            'function getPoolSettings() external view returns ((address underlying, address base, address underlyingOracle, address baseOracle))',
            'function quote(address feePayer, uint64 maturity, int128 strike64x64, uint256 contractSize, bool isCall) external view returns (int128 baseCost64x64, int128 feeCost64x64, int128 cLevel64x64, int128 slippageCoefficient64x64)',
        ];
        this.wbtcPool = new MulticallContract(btcPool, poolAbi);
        this.wethPool = new MulticallContract(ethPool, poolAbi);

        const oracleAbi = [
            'function latestAnswer() external view returns (uint256)',
        ];
        this.wbtcOracle = new MulticallContract(btcOracle, oracleAbi);
        this.wethOracle = new MulticallContract(ethOracle, oracleAbi);
    }

    async init(): Promise<void> {
        await this.multicallProvider.init();
        this.isInitialized = true;
        console.log(`Premia ${this.network} client initialized.`);
    }

    private bn64x64ToBn(bn64x64: BigNumber, decimals = 18): BigNumber {
        return bn64x64.mul(BigNumber.from(10).pow(decimals)).shr(64);
    }

    private async getOptionsFromSubgraph(): Promise<any> {
        const tomorrow = Math.floor(Date.now() / 1000) + 86400;
        const resp = await this.graphClient.do(getOptionsQuery(tomorrow));
        return resp.data;
    }

    async getOptions(): Promise<IOption[]> {
        if (!this.isInitialized)
            throw Error('uninitialized: did you run init()?');

        // Fetch oracle prices to estimate premium size in USD
        // for calls as they are denominated in the underlying.
        const oracleCalls = [
            this.wbtcOracle.latestAnswer(),
            this.wethOracle.latestAnswer(),
        ];

        console.log(`Calling oracles`);
        const [wbtcPrice, wethPrice] = await this.multicallProvider.all(
            oracleCalls
        );

        console.log(`Getting options from subgraph`);
        const requests = [];
        const opts = await this.getOptionsFromSubgraph();

        for (let o of opts.data.options) {
            if (!this.allowedPairs.includes(o.pairName)) continue;

            let pool: MulticallContract;
            let contractSize: string;
            let decimals: number;

            switch (o.pairName) {
                case 'WBTC/DAI':
                    contractSize = this.wbtcContractSize;
                    decimals = this.wbtcDecimals;
                    pool = this.wbtcPool;
                    break;
                case 'WETH/DAI':
                    contractSize = this.wethContractSize;
                    decimals = this.wethDecimals;
                    pool = this.wethPool;
                    break;
                default:
                    throw Error(`unknown pair: ${o.pairName}`);
            }

            requests.push(
                pool.quote(
                    '0x0000000000000000000000000000000000000001',
                    o.maturity,
                    o.strike64x64,
                    utils.parseUnits(contractSize, decimals),
                    o.optionType == 'CALL'
                )
            );
        }

        console.log(`Getting quotes`);
        const premiums = await this.multicallProvider.all(requests);

        let i = 0;
        const options: IOption[] = [];
        for (let o of opts.data.options) {
            if (!this.allowedPairs.includes(o.pairName)) continue;

            let asset: string;
            let contractSize: string;
            let price: number;

            switch (o.pairName) {
                case 'WBTC/DAI':
                    asset = 'BTC';
                    contractSize = this.wbtcContractSize;
                    price = wbtcPrice;
                    break;
                case 'WETH/DAI':
                    asset = 'ETH';
                    contractSize = this.wethContractSize;
                    price = wethPrice;
                    break;
                default:
                    throw Error(`unknown pair: ${o.pairName}`);
            }

            const data = premiums[i];
            const [baseCost64x64, feeCost64x64] = data;

            let premium = this.bn64x64ToBn(BigNumber.from(baseCost64x64)).add(
                this.bn64x64ToBn(BigNumber.from(feeCost64x64))
            );

            // Put quotes are returned in DAI so no need to convert to USD
            // in that case. Call quotes are denominated in the underlying asset
            // so convert to USD here.
            if (o.optionType == 'CALL') {
                premium = premium.mul(price).div(1e8);
            }

            options.push({
                market: `Premia (${this.network})`,
                link: this.marketLink,
                optionType: o.optionType,
                isBuy: true,
                asset,
                maturity: o.maturity * 1000,
                strike: this.bn64x64ToBn(BigNumber.from(o.strike64x64)),
                contractSize,
                premium,
            });

            i++;
        }

        return options;
    }
}

export default PremiaClient;
