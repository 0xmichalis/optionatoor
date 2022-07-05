import { utils, BigNumber } from 'ethers';

import { config } from './config';
import LyraClient from './markets/lyra';
import PremiaClient from './markets/premia';
import DiscordService from './services/discord';
import { IOption, oKey } from './types/option';
import { arbitrageMessage, sleep } from './utils/utils';

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false;

    // AMMs
    private premiaArbitrum: PremiaClient;
    private premiaFantom: PremiaClient;
    private premiaMainnet: PremiaClient;
    private lyra: LyraClient;

    private additionalSpread: BigNumber;

    // Discord client
    private discordClient: DiscordService;

    constructor() {
        const additionalSpread = config
            .get<number>('ADDITIONAL_SPREAD_USD')
            .toString();
        // Parsing to 18 decimals since it is used with 18-decimal premiums
        // to calculate whether an arbitrage exists
        this.additionalSpread = utils.parseUnits(additionalSpread);
        console.log(`Using $${additionalSpread} additional in spread checks.`);

        // Setup AMM clients
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
        this.lyra = new LyraClient();

        // Setup Discord client
        this.discordClient = new DiscordService();
    }

    public async init(): Promise<void> {
        const discordToken = config.get<string>('DISCORD_BOT_TOKEN');
        if (discordToken) {
            const channelID = config.get<string>('DISCORD_CHANNEL_ID');
            await this.discordClient.init(discordToken, channelID);
        }

        await this.premiaArbitrum.init();
        await this.premiaFantom.init();
        await this.premiaMainnet.init();
        this.isInitialized = true;
    }

    public async run(): Promise<void> {
        if (!this.isInitialized)
            throw Error('uninitialized: did you run init()?');

        while (true) {
            try {
                console.log('Initiating a search...');
                const buys = new Map<string, IOption>();
                const sells = new Map<string, IOption>();

                // Get sells first, then buys and make sure
                // to keep only buys for sells that exist.

                console.log('\x1b[1mGetting Lyra sells...\x1b[0m');
                const lyraSellOptions = await this.lyra.getOptions();
                for (let o of lyraSellOptions) {
                    this.potentiallySet(o, sells, false);
                }

                console.log('\x1b[1mGetting Lyra buys...\x1b[0m');
                const lyraBuyOptions = await this.lyra.getOptions(true);
                for (let o of lyraBuyOptions) {
                    // While getting buys, match immediately with a sell.
                    // If no sell exists, no point in keeping the buy around.
                    if (!sells.has(oKey(o))) continue;
                    this.potentiallySet(o, buys, true);
                }

                console.log('\x1b[1mGetting Premia (Mainnet) buys...\x1b[0m');
                const premiaMainnetOptions =
                    await this.premiaMainnet.getOptions();
                for (let o of premiaMainnetOptions) {
                    // While getting buys, match immediately with a sell.
                    // If no sell exists, no point in keeping the buy around.
                    if (!sells.has(oKey(o))) continue;
                    this.potentiallySet(o, buys, true);
                }

                try {
                    console.log(
                        '\x1b[1mGetting Premia (Fantom) buys...\x1b[0m'
                    );
                    const premiaFantomOptions =
                        await this.premiaFantom.getOptions();
                    for (let o of premiaFantomOptions) {
                        // While getting buys, match immediately with a sell.
                        // If no sell exists, no point in keeping the buy around.
                        if (!sells.has(oKey(o))) continue;
                        this.potentiallySet(o, buys, true);
                    }
                } catch (e) {
                    // Fantom RPCs can also be a pita.
                    console.log(
                        `Failed to fetch options from Premia Fantom: ${e}`
                    );
                }

                try {
                    console.log(
                        '\x1b[1mGetting Premia (Arbitrum) buys...\x1b[0m'
                    );
                    const premiaArbitrumOptions =
                        await this.premiaArbitrum.getOptions();
                    for (let o of premiaArbitrumOptions) {
                        // While getting buys, match immediately with a sell.
                        // If no sell exists, no point in keeping the buy around.
                        if (!sells.has(oKey(o))) continue;
                        this.potentiallySet(o, buys, true);
                    }
                } catch (e) {
                    // Arbitrum has been a problematic RPC and there is no
                    // reason not to do an arb check only with the rest of
                    // the networks.
                    console.log(
                        `Failed to fetch options from Premia Arbitrum: ${e}`
                    );
                }

                // Look for arbitrage opportunities in the spreads
                for (const [key, buy] of buys.entries()) {
                    const sell = sells.get(key);
                    // This should never happen because we were already
                    // matching buys with sells that exist above.
                    if (!sell) throw new Error('this is not fair');

                    if (
                        sell.premium.gt(buy.premium.add(this.additionalSpread))
                    ) {
                        const msg = arbitrageMessage(
                            key,
                            sell.contractSize,
                            buy.market,
                            buy.link,
                            utils.formatUnits(buy.premium),
                            sell.market,
                            sell.link,
                            utils.formatUnits(sell.premium)
                        );
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

    private potentiallySet(
        o: IOption,
        map: Map<string, IOption>,
        isBuy: boolean
    ): void {
        const key = oKey(o);
        const existing = map.get(key);
        if (!existing) map.set(key, o);
        else {
            // Replace if current offer is better than what's set.
            // For sells, we want the higher premium, for buys we
            // want the lower premium.
            if (
                (isBuy && o.premium.lt(existing.premium)) ||
                (!isBuy && o.premium.gt(existing.premium))
            ) {
                map.set(key, o);
            }
        }
    }
}
