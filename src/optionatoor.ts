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

        await this.premia.fetchPremiums(this.maxBuyUSD)
    }
}
