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

        console.log('\x1b[1mGetting Lyra sells...\x1b[0m')
        const lyraSellOptions = await this.lyra.getOptions()
        for (let o of lyraSellOptions) {
            this.potentiallySet(o, sells, false)
        }

        console.log('\x1b[1mGetting Lyra buys...\x1b[0m')
        const lyraBuyOptions = await this.lyra.getOptions(true)
        for (let o of lyraBuyOptions) {
            this.potentiallySet(o, buys, true)
        }

        console.log('\x1b[1mGetting Premia buys...\x1b[0m')
        const premiaOptions = await this.premia.getOptions()
        for (let o of premiaOptions) {
            this.potentiallySet(o, buys, true)
        }

        console.log()
        console.log('\x1b[1mBEST SELLS\x1b[0m')
        console.log()
        for (const [key, o] of sells.entries()) {
            console.log(`Asset: ${key}`)
            console.log(`Market: ${o.market}`)
            console.log(`Premium: ${utils.formatUnits(o.premium)}`)
            console.log()
        }

        console.log()
        console.log('\x1b[1mBEST BUYS\x1b[0m')
        console.log()
        for (const [key, o] of buys.entries()) {
            console.log(`Asset: ${key}`)
            console.log(`Market: ${o.market}`)
            console.log(`Premium: ${utils.formatUnits(o.premium)}`)
            console.log()
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
                console.log(`Found better ${isBuy ? 'buy' : 'sell'} for ${key} in ${o.market}`)
                console.log(`${o.market}: ${utils.formatUnits(o.premium)}`)
                console.log(`${existing.market}: ${utils.formatUnits(existing.premium)}`)
                map.set(key, o)
            }
        }
    }
}
