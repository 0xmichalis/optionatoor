import { BigNumber, Contract, ethers, providers, utils, Wallet } from 'ethers'
import { Contract as MulticallContract, Provider as MulticallProvider } from 'ethers-multicall'

import ApiService from '../../services/api'
import { config } from '../../config'
import { fetchOptionsQuery } from './queries'

const defaultDecimals = 18;

class PremiaService {
    // RPC providers
    private provider: providers.StaticJsonRpcProvider
    private multicallProvider: MulticallProvider
    private subgraphURL: string

    private wallet: Wallet

    // Pools
    private wbtcPool: Contract
    private wethPool: Contract
    private linkPool: Contract

    constructor() {
        this.provider = new providers.StaticJsonRpcProvider(config.get('PREMIA_NODE_API_URL'))
        this.multicallProvider = new MulticallProvider(this.provider)
        this.subgraphURL = config.get('PREMIA_SUBGRAPH_API_URL')

        this.wallet = new ethers.Wallet(config.get('PRIVATE_KEY'), this.provider)
        console.log(`Keeper address: ${this.wallet.address}`)

        const poolAbi = [
            'function quote(address feePayer, uint64 maturity, int128 strike64x64, uint256 contractSize, bool isCall) external view returns (int128 baseCost64x64, int128 feeCost64x64, int128 cLevel64x64, int128 slippageCoefficient64x64)',
        ]
        this.wbtcPool = new Contract(config.get('PREMIA_POOL_WBTC'), poolAbi, this.provider)
        this.wethPool = new Contract(config.get('PREMIA_POOL_WETH'), poolAbi, this.provider)
        this.linkPool = new Contract(config.get('PREMIA_POOL_LINK'), poolAbi, this.provider)
    }

    bn64x64ToBn(bn64x64: BigNumber, decimals = defaultDecimals): BigNumber {
        return bn64x64.mul(BigNumber.from(10).pow(decimals)).shr(64);
    }

    formatBn(bn: BigNumber, decimals = defaultDecimals): string {
        return utils.formatUnits(bn, decimals);
    }

    format64x64(bn64x64: BigNumber): string {
        return this.formatBn(this.bn64x64ToBn(bn64x64));
    }

    async fetchOptions(): Promise<any> {
        const now = Math.floor(Date.now() / 1000)
        const resp =  await ApiService.graphql(this.subgraphURL, fetchOptionsQuery(now))
        return resp.data
    }

    async fetchPremiums(): Promise<any> {
        const options = await this.fetchOptions()
        for (let o of options.data.options) {
            if (o.pairName != 'LINK/DAI')
                continue

            const [
                baseCost64x64,
                feeCost64x64,
            ] = await this.linkPool.quote(
                this.wallet.address,
                o.maturity,
                o.strike64x64,
                BigNumber.from(utils.parseUnits('1000', defaultDecimals)),
                o.optionType == 'CALL'
            )
            const premium = this.bn64x64ToBn(baseCost64x64).add(this.bn64x64ToBn(feeCost64x64))

            console.log()
            console.log(`Pair: ${o.pairName}`)
            console.log(`Type: ${o.optionType}`)
            console.log(`Maturity: ${new Date(o.maturity*1000)}`)
            console.log(`Strike: ${this.format64x64(BigNumber.from(o.strike64x64))}`)
            console.log(`Premium: ${this.formatBn(premium)}`)
            console.log()
        }
    }
}

export default PremiaService
