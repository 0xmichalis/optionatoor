import dotenv from 'dotenv';
import Joi from 'joi';

const schema: Joi.ObjectSchema = Joi.object({
    ADDITIONAL_SPREAD_USD: Joi.number().optional().default(0),
    ARBITRUM_NODE_API_URL: Joi.string().uri().required(),
    ARBITRUM_ORACLE_WBTC: Joi.string()
        .optional()
        .default('0x6ce185860a4963106506C203335A2910413708e9'),
    ARBITRUM_ORACLE_WETH: Joi.string()
        .optional()
        .default('0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612'),
    CHECK_INTERVAL_SECONDS: Joi.number().optional().default(300),
    CONTRACT_SIZE_BTC: Joi.string().optional().default('0.01'),
    CONTRACT_SIZE_ETH: Joi.string().optional().default('1'),
    DISCORD_BOT_TOKEN: Joi.string().optional().allow(''),
    DISCORD_CHANNEL_ID: Joi.string().optional().allow(''),
    FANTOM_NODE_API_URL: Joi.string()
        .uri()
        .optional()
        .default('https://rpc.ftm.tools/'),
    FANTOM_ORACLE_WBTC: Joi.string()
        .optional()
        .default('0x8e94c22142f4a64b99022ccdd994f4e9ec86e4b4'),
    FANTOM_ORACLE_WETH: Joi.string()
        .optional()
        .default('0x11ddd3d147e5b83d01cee7070027092397d63658'),
    MAINNET_NODE_API_URL: Joi.string().uri().required(),
    MAINNET_ORACLE_WBTC: Joi.string()
        .optional()
        .default('0xf4030086522a5beea4988f8ca5b36dbc97bee88c'),
    MAINNET_ORACLE_WETH: Joi.string()
        .optional()
        .default('0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419'),
    PREMIA_ARBITRUM_POOL_WBTC: Joi.string()
        .optional()
        .default('0xb5fE3bc2eF4c34cC233922dfF2Fcb1B1BF89A38E'),
    PREMIA_ARBITRUM_POOL_WETH: Joi.string()
        .optional()
        .default('0xE5DbC4EDf467B609A063c7ea7fAb976C6b9BAa1a'),
    PREMIA_ARBITRUM_SUBGRAPH_API_URL: Joi.string()
        .uri()
        .optional()
        .default(
            'https://api.thegraph.com/subgraphs/name/premiafinance/premia-arbitrum'
        ),
    PREMIA_FANTOM_POOL_WBTC: Joi.string()
        .optional()
        .default('0x3a098984f1c3ecBAb0D5866F35438Ec0db3ec8C2'),
    PREMIA_FANTOM_POOL_WETH: Joi.string()
        .optional()
        .default('0xD888B9Aa5EF1a85968892C12E8cC83C73D69c8A1'),
    PREMIA_FANTOM_SUBGRAPH_API_URL: Joi.string()
        .uri()
        .optional()
        .default(
            'https://api.thegraph.com/subgraphs/name/premiafinance/premia-fantom'
        ),
    PREMIA_MAINNET_POOL_WBTC: Joi.string()
        .optional()
        .default('0x1B63334f7bfDf0D753AB3101EB6d02B278db8852'),
    PREMIA_MAINNET_POOL_WETH: Joi.string()
        .optional()
        .default('0xa4492fcDa2520cB68657d220f4D4aE3116359C10'),
    PREMIA_MAINNET_SUBGRAPH_API_URL: Joi.string()
        .uri()
        .optional()
        .default(
            'https://api.thegraph.com/subgraphs/name/premiafinance/premiav2'
        ),
});

export class ConfigService {
    private config;

    constructor() {
        const { parsed: parsedConfig, error: parseError } = dotenv.config();
        if (parseError) {
            console.log(`No .env file found, config.get will use process.env`);
        } else {
            const { error, value } = schema.validate(parsedConfig);
            if (error) {
                throw Error(`Failed to validate config: ${error}`);
            }
            this.config = value;
        }

        // Custom validation
        if (
            (process.env['DISCORD_BOT_TOKEN'] &&
                !process.env['DISCORD_CHANNEL_ID']) ||
            (process.env['DISCORD_CHANNEL_ID'] &&
                !process.env['DISCORD_BOT_TOKEN'])
        ) {
            throw new Error(
                'DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID need to be specified together'
            );
        }
    }

    get<T>(key: string): T {
        return process.env[key] || this.config[key];
    }
}

export const config = new ConfigService();
