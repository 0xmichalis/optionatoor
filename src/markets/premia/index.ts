import { BigNumber, Contract, ethers, providers, utils, Wallet } from 'ethers'
import { Contract as MulticallContract, Provider as MulticallProvider } from 'ethers-multicall'

import ApiService from '../../services/api'
import { config } from '../../config'
import { fetchOptionsQuery } from './queries'

const subgraphURL = config.get('PREMIA_SUBGRAPH_API_URL')

class PremiaService {
    // RPC providers
    private provider: providers.StaticJsonRpcProvider
    private multicallProvider: MulticallProvider

    private wallet: Wallet

    private linkPool: Contract

    constructor() {
        this.provider = new providers.StaticJsonRpcProvider(config.get('NODE_API_URL'))
        this.multicallProvider = new MulticallProvider(this.provider)

        this.wallet = new ethers.Wallet(config.get('PRIVATE_KEY'), this.provider)
        console.log(`Keeper address: ${this.wallet.address}`)

        const poolAbi = [
            'function quote(address feePayer, uint64 maturity, int128 strike64x64, uint256 contractSize, bool isCall) external view returns (int128 baseCost64x64, int128 feeCost64x64, int128 cLevel64x64, int128 slippageCoefficient64x64)',
        ]
        this.linkPool = new Contract('0xf87Ca9EB60c2E40A6C5Ab14ca291934a95F845Ff', poolAbi, this.provider)
    }

    async fetchPremiums(): Promise<any> {
        const options = await this.fetchOptions()
        for (let o of options.data.options) {
            if (o.pairName == 'LINK/DAI') {
                console.log(o)
                console.log(`maturity: ${new Date(o.maturity*1000)}`)

                const [
                    baseCost64x64,
                    feeCost64x64,
                    cLevel64x64,
                    slippageCoefficient64x64
                ] = await this.linkPool.quote(
                    this.wallet.address,
                    o.maturity,
                    o.strike64x64,
                    BigNumber.from('1000000000000000000000'),
                    o.optionType == 'CALL'
                )

                console.log(`base cost: ${baseCost64x64}`)
                console.log(`fee cost: ${feeCost64x64}`)
                console.log(`C level: ${cLevel64x64}`)
                console.log(`slippage: ${slippageCoefficient64x64}`)
                break
            }
        }
    }

    async fetchOptions(): Promise<any> {
        const now = Math.floor(Date.now() / 1000)
        const resp =  await ApiService.graphql(subgraphURL, fetchOptionsQuery(now))
        return resp.data
    }
}

export default PremiaService
