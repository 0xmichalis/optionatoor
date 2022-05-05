import { utils } from 'ethers'

import LyraService from './markets/lyra'
import PremiaService from './markets/premia'

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false

    // AMMs
    private premia: PremiaService
    private lyra: LyraService

    constructor() {
        this.premia = new PremiaService()
        this.lyra = new LyraService()
    }

    public async init(): Promise<void> {
        await this.premia.init()
        this.isInitialized = true
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?')

        console.log('Getting Lyra markets...')
        const lyraOptions = await this.lyra.getOptions()
        for (let o of lyraOptions) {
            console.log(`Asset: ${o.pairName}`)
            console.log(`Type: ${o.optionType}`)
            console.log(`Maturity: ${new Date(o.maturity)}`)
            console.log(`Strike: ${utils.formatUnits(o.strike)}`)
            console.log(`Contract size: ${o.contractSize}`)
            console.log(`Premium: ${utils.formatUnits(o.premium)}`)
            console.log()
        }

        console.log('Getting Premia markets...')
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
