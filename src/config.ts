import dotenv from 'dotenv'
import Joi from 'joi'


const schema: Joi.ObjectSchema = Joi.object({
  ARBITRUM_NODE_API_URL: Joi.string().uri().required(),
  CHECK_INTERVAL_SECONDS: Joi.number().required(),
  CONTRACT_SIZE_BTC: Joi.string().required(),
  CONTRACT_SIZE_ETH: Joi.string().required(),
  CONTRACT_SIZE_LINK: Joi.string().required(),
  DISCORD_BOT_TOKEN: Joi.string().optional().allow(''),
  DISCORD_CHANNEL_ID: Joi.string().optional().allow(''),
  ORACLE_WBTC: Joi.string().required(),
  ORACLE_WETH: Joi.string().required(),
  ORACLE_LINK: Joi.string().required(),
  PREMIA_POOL_WBTC: Joi.string().required(),
  PREMIA_POOL_WETH: Joi.string().required(),
  PREMIA_POOL_LINK: Joi.string().required(),
  PREMIA_SUBGRAPH_API_URL: Joi.string().uri().required(),
  PRIVATE_KEY: Joi.string().required(),
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
