import { utils } from 'ethers'

import LyraService from './markets/lyra'
import PremiaService from './markets/premia'
import { IOption, oKey } from './types/option'

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

        const buys = new Map<string, IOption>();
        const sells = new Map<string, IOption>();

        // Get sells first

        console.log('\x1b[1mGetting Lyra sells...\x1b[0m')
        const lyraSellOptions = await this.lyra.getOptions()
        for (let o of lyraSellOptions) {
            this.potentiallySet(o, sells, false)
        }

        // While getting buys, match immediately with a sell.
        // If no sell exists, no point in keeping the buy around.

        console.log('\x1b[1mGetting Lyra buys...\x1b[0m')
        const lyraBuyOptions = await this.lyra.getOptions(true)
        for (let o of lyraBuyOptions) {
            if (!sells.has(oKey(o))) continue
            this.potentiallySet(o, buys, true)
        }

        console.log('\x1b[1mGetting Premia buys...\x1b[0m')
        const premiaOptions = await this.premia.getOptions()
        for (let o of premiaOptions) {
            if (!sells.has(oKey(o))) continue
            this.potentiallySet(o, buys, true)
        }

        // Look for arbitrage opportunities in the spreads
        let arbFound = false
        for (const [key, sell] of sells.entries()) {
            const buy = buys.get(key)
            if (!buy) throw new Error('this is not fair')

            if (sell.premium.gt(buy.premium)) {
                arbFound = true
                console.log(`\x1b[1mArbitrage opportunity found!\x1b[0m`)
                console.log(`Asset: ${key}`)
                console.log(`Contract size: ${sell.contractSize}`)
                console.log(`Sell in ${sell.market}: ${utils.formatUnits(sell.premium)}`)
                console.log(`Buy in ${buy.market}: ${utils.formatUnits(buy.premium)}`)
                console.log()
            }
        }
        if (!arbFound) {
            console.log('No arbitrage opportunity found.')
        }
    }

    private potentiallySet(o: IOption, map: Map<string, IOption>, isBuy: boolean): void {
        const key = oKey(o)
        const existing = map.get(key)
        if (!existing)
            map.set(key, o)
        else {
            // Replace if current offer is better than what's set.
            // For sells, we want the higher premium, for buys we
            // want the lower premium.
            if ((isBuy && o.premium.lt(existing.premium)) || (!isBuy && o.premium.gt(existing.premium))) {
                map.set(key, o)
            }
        }
    }
}
