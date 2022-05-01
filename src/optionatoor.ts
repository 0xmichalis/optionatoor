import { config } from './config'
import PremiaService from './markets/premia'

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false

    // AMMs
    private premia: PremiaService

    constructor() {
        this.premia = new PremiaService()
    }

    public async init(): Promise<void> {
        this.isInitialized = true
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?')

        await this.premia.fetchPremiums()
    }
}
