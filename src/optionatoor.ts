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

        const options = await PremiaService.fetchOptions()
        console.log(JSON.stringify(options))
    }
}
