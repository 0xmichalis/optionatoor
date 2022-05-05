import { utils } from 'ethers'

import { config } from './config'
import PremiaService from './markets/premia'

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false

    private maxBuyUSD = 0

    // AMMs
    private premia: PremiaService

    constructor() {
        this.premia = new PremiaService()
    }

    public async init(): Promise<void> {
        await this.premia.init()
        this.isInitialized = true
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?')

        const premiaOptions = await this.premia.getOptions()
        for (let o of premiaOptions) {
            console.log(`Pair: ${o.pairName}`)
            console.log(`Type: ${o.optionType}`)
            console.log(`Maturity: ${new Date(o.maturity)}`)
            console.log(`Strike: ${utils.formatUnits(o.strike)}`)
            console.log(`Contract size: ${o.contractSize}`)
            console.log(`Premium: ${utils.formatUnits(o.premium)}`)
            console.log()
        }
    }
}
