import dotenv from 'dotenv'
import Joi from 'joi'


const schema: Joi.ObjectSchema = Joi.object({
  ADDITIONAL_SPREAD_USD: Joi.number().optional(),
  ARBITRUM_NODE_API_URL: Joi.string().uri().required(),
  ARBITRUM_ORACLE_WBTC: Joi.string().required(),
  ARBITRUM_ORACLE_WETH: Joi.string().required(),
  CHECK_INTERVAL_SECONDS: Joi.number().required(),
  CONTRACT_SIZE_BTC: Joi.string().required(),
  CONTRACT_SIZE_ETH: Joi.string().required(),
  DISCORD_BOT_TOKEN: Joi.string().optional().allow(''),
  DISCORD_CHANNEL_ID: Joi.string().optional().allow(''),
  FANTOM_NODE_API_URL: Joi.string().uri().required(),
  FANTOM_ORACLE_WBTC: Joi.string().required(),
  FANTOM_ORACLE_WETH: Joi.string().required(),
  MAINNET_NODE_API_URL: Joi.string().uri().required(),
  MAINNET_ORACLE_WBTC: Joi.string().required(),
  MAINNET_ORACLE_WETH: Joi.string().required(),
  PREMIA_ARBITRUM_POOL_WBTC: Joi.string().required(),
  PREMIA_ARBITRUM_POOL_WETH: Joi.string().required(),
  PREMIA_ARBITRUM_SUBGRAPH_API_URL: Joi.string().uri().required(),
  PREMIA_FANTOM_POOL_WBTC: Joi.string().required(),
  PREMIA_FANTOM_POOL_WETH: Joi.string().required(),
  PREMIA_FANTOM_SUBGRAPH_API_URL: Joi.string().uri().required(),
  PREMIA_MAINNET_POOL_WBTC: Joi.string().required(),
  PREMIA_MAINNET_POOL_WETH: Joi.string().required(),
  PREMIA_MAINNET_SUBGRAPH_API_URL: Joi.string().uri().required(),
})

export class ConfigService {
    private config

    constructor() {
      const { parsed: parsedConfig, error: parseError } = dotenv.config()
      if (parseError) {
        console.log(`No .env file found, config.get will use process.env`)
        return
      }

      const { error: validationError, value: config } = schema.validate(parsedConfig)
      if (validationError) {
        throw Error(`Failed to validate config: ${validationError}`)
      }

      // Custom validation
      if ((process.env['DISCORD_BOT_TOKEN'] && !process.env['DISCORD_CHANNEL_ID'])
        || (process.env['DISCORD_CHANNEL_ID'] && !process.env['DISCORD_BOT_TOKEN'])) {
          throw new Error('DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID need to be specified together')
      }

      this.config = config
    }

    get<T>(key: string): T {
      return process.env[key] || this.config[key]
    }
}

export const config = new ConfigService()
