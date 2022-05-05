import { config } from './config'
import PremiaService from './markets/premia'

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false

    private maxBuyUSD = 0

    // AMMs
    private premia: PremiaService

    constructor() {
        this.maxBuyUSD = Number(config.get('MAX_BUY_USD'))
        this.premia = new PremiaService()
    }

    public async init(): Promise<void> {
        await this.premia.init()
        this.isInitialized = true
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?')

        const premiaOptions = await this.premia.fetchPremiums(this.maxBuyUSD)
        for (let o of premiaOptions) {
            console.log(`Pair: ${o.pairName}`)
            console.log(`Type: ${o.optionType}`)
            console.log(`Maturity: ${new Date(o.maturity)}`)
            console.log(`Strike: ${this.premia.formatBn(o.strike)}`)
            console.log(`Contract size: ${o.contractSize}`)
            console.log(`Premium: ${this.premia.formatBn(o.premium)}`)
            console.log()
        }
    }
}
