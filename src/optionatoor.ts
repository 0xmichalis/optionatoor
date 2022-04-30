import { BigNumber, Contract, ethers, providers, utils, Wallet } from 'ethers'
import { Contract as MulticallContract, Provider as MulticallProvider } from 'ethers-multicall'

import { config } from './config'
import PremiaService from './markets/premia'

export default class Optionatoor {
    // Whether the class is initialized
    private isInitialized: boolean = false

    // RPC providers
    private provider: providers.StaticJsonRpcProvider
    private multicallProvider: MulticallProvider

    private wallet: Wallet

    // Premia pools
    private premiaLinkPool: Contract

    constructor() {
        this.provider = new providers.StaticJsonRpcProvider(config.get('NODE_API_URL'))
        this.multicallProvider = new MulticallProvider(this.provider)

        this.wallet = new ethers.Wallet(config.get('PRIVATE_KEY'), this.provider)
        console.log(`Keeper address: ${this.wallet.address}`)

        const poolAbi = [
            'function quote(address feePayer, uint64 maturity, int128 strike64x64, uint256 contractSize, bool isCall) external view returns (int128 baseCost64x64, int128 feeCost64x64, int128 cLevel64x64, int128 slippageCoefficient64x64)',
        ]
        this.premiaLinkPool = new Contract('0xf87Ca9EB60c2E40A6C5Ab14ca291934a95F845Ff', poolAbi, this.provider)
    }

    public async init(): Promise<void> {
        this.isInitialized = true
    }

    public async run(): Promise<void> {
        if (!this.isInitialized) throw Error('uninitialized: did you run init()?')

        const options = await PremiaService.fetchOptions()
        for (let o of options.data.options) {
            if (o.pairName == 'LINK/DAI') {
                console.log(o)

                const [
                    baseCost64x64,
                    feeCost64x64,
                    cLevel64x64,
                    slippageCoefficient64x64
                ] = await this.premiaLinkPool.quote(
                    this.wallet.address,
                    o.maturity,
                    o.strike64x64,
                    BigNumber.from('10000000000000000'),
                    o.optionType == 'CALL'
                )

                console.log(`base cost: ${baseCost64x64}`)
                console.log(`fee cost: ${feeCost64x64}`)
                console.log(`C level: ${cLevel64x64}`)
                console.log(`slippage: ${slippageCoefficient64x64}`)
            }
        }
    }
}
