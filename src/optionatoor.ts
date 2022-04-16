import { config } from './config'
import PremiaService from './markets/premia'

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false

    constructor() {}

    public async init(): Promise<void> {
        this.isInitialized = true
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?')

        console.log('Premia Tokens')
        const premiaTokens = await PremiaService.fetchTokens()
        console.log(JSON.stringify(premiaTokens))

        console.log('Premia Pools')
        const premiaPools = await PremiaService.fetchPools()
        console.log(JSON.stringify(premiaPools))
    }
}
