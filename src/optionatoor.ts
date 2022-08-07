import { utils, BigNumber } from 'ethers';

import { config } from './config';
import DeribitClient from './markets/deribit';
import LyraClient from './markets/lyra';
import PremiaClient from './markets/premia';
import DiscordService from './services/discord';
import { IOption } from './types/option';
import { arbitrageMessage, sleep } from './utils/utils';

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false;

    // Market clients
    private deribit: DeribitClient;
    private lyra: LyraClient;
    private premiaArbitrum: PremiaClient;
    private premiaFantom: PremiaClient;
    private premiaMainnet: PremiaClient;
    private premiaOptimism: PremiaClient;

    // Additional fee to include in spread calculations as
    // a naive way to account for various fees (eg., gas fees)
    private additionalSpread: BigNumber;

    // Discord client
    private discordClient: DiscordService;

    constructor() {
        const additionalSpread = config.get<number>('ADDITIONAL_SPREAD_USD').toString();
        // Parsing to 18 decimals since it is used with 18-decimal premiums
        // to calculate whether an arbitrage exists
        this.additionalSpread = utils.parseUnits(additionalSpread);
        console.log(`Using $${additionalSpread} additional in spread checks.`);

        // Setup market clients
        this.deribit = new DeribitClient();
        this.lyra = new LyraClient();
        this.premiaArbitrum = new PremiaClient(
            'Arbitrum',
            config.get('ARBITRUM_NODE_API_URL'),
            config.get('PREMIA_ARBITRUM_SUBGRAPH_API_URL'),
            config.get('PREMIA_ARBITRUM_POOL_WBTC'),
            config.get('PREMIA_ARBITRUM_POOL_WETH'),
            config.get('ARBITRUM_ORACLE_WBTC'),
            config.get('ARBITRUM_ORACLE_WETH')
        );
        this.premiaFantom = new PremiaClient(
            'Fantom',
            config.get('FANTOM_NODE_API_URL'),
            config.get('PREMIA_FANTOM_SUBGRAPH_API_URL'),
            config.get('PREMIA_FANTOM_POOL_WBTC'),
            config.get('PREMIA_FANTOM_POOL_WETH'),
            config.get('FANTOM_ORACLE_WBTC'),
            config.get('FANTOM_ORACLE_WETH')
        );
        this.premiaMainnet = new PremiaClient(
            'Mainnet',
            config.get('MAINNET_NODE_API_URL'),
            config.get('PREMIA_MAINNET_SUBGRAPH_API_URL'),
            config.get('PREMIA_MAINNET_POOL_WBTC'),
            config.get('PREMIA_MAINNET_POOL_WETH'),
            config.get('MAINNET_ORACLE_WBTC'),
            config.get('MAINNET_ORACLE_WETH')
        );
        this.premiaOptimism = new PremiaClient(
            'Optimism',
            config.get('OPTIMISM_NODE_API_URL'),
            config.get('PREMIA_OPTIMISM_SUBGRAPH_API_URL'),
            config.get('PREMIA_OPTIMISM_POOL_WBTC'),
            config.get('PREMIA_OPTIMISM_POOL_WETH'),
            config.get('OPTIMISM_ORACLE_WBTC'),
            config.get('OPTIMISM_ORACLE_WETH')
        );

        // Setup Discord client
        this.discordClient = new DiscordService();
    }

    public async init(): Promise<void> {
        const discordToken = config.get<string>('DISCORD_BOT_TOKEN');
        if (!discordToken) {
            console.log('Discord client is disabled.');
        } else {
            const channelID = config.get<string>('DISCORD_CHANNEL_ID');
            await this.discordClient.init(discordToken, channelID);
        }

        await this.premiaArbitrum.init();
        await this.premiaFantom.init();
        await this.premiaMainnet.init();
        await this.premiaOptimism.init();
        this.isInitialized = true;
    }

    private potentiallySet(o: IOption, map: Map<string, IOption>, isBuy: boolean): void {
        const existing = map.get(o.asset);
        if (!existing) map.set(o.asset, o);
        else {
            // Replace if current offer is better than what's set.
            // For sells, we want the higher premium, for buys we
            // want the lower premium.
            if (
                (isBuy && o.premium.lt(existing.premium)) ||
                (!isBuy && o.premium.gt(existing.premium))
            ) {
                map.set(o.asset, o);
            }
        }
    }

    private async getSells(): Promise<Map<string, IOption>> {
        const sells = new Map<string, IOption>();
        const isBuy = false;

        console.log('\x1b[1mGetting Lyra sells...\x1b[0m');
        const lyraSellOptions = await this.lyra.getOptions(isBuy);
        for (let o of lyraSellOptions) {
            this.potentiallySet(o, sells, isBuy);
        }

        return sells;
    }

    private async getBuys(): Promise<Map<string, IOption>> {
        const buys = new Map<string, IOption>();
        const isBuy = true;

        console.log('\x1b[1mGetting Lyra buys...\x1b[0m');
        const lyraBuyOptions = await this.lyra.getOptions(isBuy);
        for (let o of lyraBuyOptions) {
            this.potentiallySet(o, buys, isBuy);
        }

        console.log('\x1b[1mGetting Premia (Mainnet) buys...\x1b[0m');
        const premiaMainnetOptions = await this.premiaMainnet.getOptions(isBuy);
        for (let o of premiaMainnetOptions) {
            this.potentiallySet(o, buys, isBuy);
        }

        try {
            console.log('\x1b[1mGetting Premia (Fantom) buys...\x1b[0m');
            const premiaFantomOptions = await this.premiaFantom.getOptions(isBuy);
            for (let o of premiaFantomOptions) {
                this.potentiallySet(o, buys, isBuy);
            }
        } catch (e) {
            console.log(`Failed to fetch options from Premia Fantom: ${e}`);
        }

        try {
            console.log('\x1b[1mGetting Premia (Optimism) buys...\x1b[0m');
            const premiaOptimismOptions = await this.premiaOptimism.getOptions(isBuy);
            for (let o of premiaOptimismOptions) {
                this.potentiallySet(o, buys, isBuy);
            }
        } catch (e) {
            console.log(`Failed to fetch options from Premia Optimism: ${e}`);
        }

        try {
            console.log('\x1b[1mGetting Premia (Arbitrum) buys...\x1b[0m');
            const premiaArbitrumOptions = await this.premiaArbitrum.getOptions(isBuy);
            for (let o of premiaArbitrumOptions) {
                this.potentiallySet(o, buys, isBuy);
            }
        } catch (e) {
            // Arbitrum has been a problematic RPC and there is no
            // reason not to do an arb check only with the rest of
            // the networks.
            console.log(`Failed to fetch options from Premia Arbitrum: ${e}`);
        }

        return buys;
    }

    private async getDeribitOptions(
        otherBuys: Map<string, IOption>,
        otherSells: Map<string, IOption>
    ): Promise<void> {
        console.log('\x1b[1mGetting Deribit options...\x1b[0m');
        const { buys, sells } = await this.deribit.getOptions(otherBuys, otherSells);
        for (let o of buys) {
            this.potentiallySet(o, otherBuys, false);
        }
        for (let o of sells) {
            this.potentiallySet(o, otherSells, false);
        }
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?');

        while (true) {
            try {
                console.log('Initiating a search...');
                const sells = await this.getSells();
                const buys = await this.getBuys();
                // Match the sells and buys we have fetched from all around
                // the place with Deribit
                await this.getDeribitOptions(buys, sells);

                // Look for arbitrage opportunities in the spreads
                for (const [asset, buy] of buys.entries()) {
                    const sell = sells.get(asset);
                    if (!sell) continue;

                    if (sell.premium.gt(buy.premium.add(this.additionalSpread))) {
                        const msg = arbitrageMessage(buy, sell);
                        console.log(msg);
                        await this.discordClient.send(msg);
                    }
                }
                console.log('Search complete.');
            } catch (e) {
                console.log(`Failed to check for arbitrage: ${e}`);
            } finally {
                await sleep(config.get<number>('CHECK_INTERVAL_SECONDS'));
            }
        }
    }
}
