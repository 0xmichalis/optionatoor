import { Connection, PublicKey } from '@solana/web3.js';
import { Exchange, Network, utils } from '@zetamarkets/sdk';

import { config } from '../../config';
import { IOption } from '../../types/option';

class ZetaClient {
    // Whether the class is initialized
    private isInitialized: boolean = false;

    private client: Connection;
    // private marketLink = 'https://mainnet.zeta.markets/';

    // // Contract sizes
    // private btcContractSize: string;
    // private ethContractSize: string;

    constructor() {
        console.log(`Initializing Zeta client...`);
        const networkUrl = config.get<string>('SOLANA_NODE_API_URL');
        this.client = new Connection(networkUrl, utils.defaultCommitment());

        // this.btcContractSize = config.get('CONTRACT_SIZE_BTC');
        // this.ethContractSize = config.get('CONTRACT_SIZE_ETH');
    }

    async init(): Promise<void> {
        const programID = config.get<string>('ZETA_PROGRAM_ID');
        await Exchange.load(
            new PublicKey(programID),
            Network.MAINNET,
            this.client,
            utils.defaultCommitment(),
            undefined, // Exchange wallet can be ignored for normal clients.
            5000, // ThrottleMs - increase if you are running into rate limit issues on startup.
            undefined // Callback - See below for more details.
        );

        utils.displayState();

        this.isInitialized = true;
        console.log(`Zeta client initialized.`);
    }

    // Set isBuy to true to get quotes for long options
    async getOptions(/*isBuy: boolean*/): Promise<IOption[]> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?');

        const options: IOption[] = [];

        return options;
    }
}

export default ZetaClient;
