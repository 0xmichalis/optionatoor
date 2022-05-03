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
    private wbtcPool: MulticallContract
    private wethPool: MulticallContract
    private linkPool: MulticallContract

    // Oracles
    private wbtcOracle: MulticallContract
    private wethOracle: MulticallContract
    private linkOracle: MulticallContract

    // Decimals
    private oracleDecimals = 8
    private linkDecimals = 18

    constructor() {
        this.provider = new providers.StaticJsonRpcProvider(config.get('PREMIA_NODE_API_URL'))
        this.multicallProvider = new MulticallProvider(this.provider)
        this.subgraphURL = config.get('PREMIA_SUBGRAPH_API_URL')

        this.wallet = new ethers.Wallet(config.get('PRIVATE_KEY'), this.provider)
        console.log(`Keeper address: ${this.wallet.address}`)

        const poolAbi = [
            'function getPoolSettings() external view returns ((address underlying, address base, address underlyingOracle, address baseOracle))',
            'function quote(address feePayer, uint64 maturity, int128 strike64x64, uint256 contractSize, bool isCall) external view returns (int128 baseCost64x64, int128 feeCost64x64, int128 cLevel64x64, int128 slippageCoefficient64x64)',
        ]
        this.wbtcPool = new MulticallContract(config.get('PREMIA_POOL_WBTC'), poolAbi)
        this.wethPool = new MulticallContract(config.get('PREMIA_POOL_WETH'), poolAbi)
        this.linkPool = new MulticallContract(config.get('PREMIA_POOL_LINK'), poolAbi)

        const oracleAbi = [
            'function latestAnswer() external view returns (uint256)',
        ]
        this.wbtcOracle = new MulticallContract(config.get('ORACLE_WBTC'), oracleAbi)
        this.wethOracle = new MulticallContract(config.get('ORACLE_WETH'), oracleAbi)
        this.linkOracle = new MulticallContract(config.get('ORACLE_LINK'), oracleAbi)
    }

    async init(): Promise<void> {
        await this.multicallProvider.init()
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

    async fetchPremiums(maxBuyUSD: number): Promise<any> {
        // Fetch oracle prices first to estimate max
        // contract size per asset.
        const oracleCalls = [
            this.wbtcOracle.latestAnswer(),
            this.wethOracle.latestAnswer(),
            this.linkOracle.latestAnswer(),
        ]

        const [
            wbtcPrice,
            wethPrice,
            linkPrice,
        ] = await this.multicallProvider.all(oracleCalls)

        console.log(`WBTC/USD: ${this.formatBn(wbtcPrice, this.oracleDecimals)}`)
        console.log(`WETH/USD: ${this.formatBn(wethPrice, this.oracleDecimals)}`)
        console.log(`LINK/USD: ${this.formatBn(linkPrice, this.oracleDecimals)}`)

        const calls = []
        const options = await this.fetchOptions()
    
        for (let o of options.data.options) {
            if (o.pairName == 'YFI/DAI') continue

            // Multiply by 1e8 to match the oracle decimals
            let contractSize: string

            switch (o.pairName) {
                case 'WBTC/DAI':
                    contractSize = '0.05'
                    break
                case 'WETH/DAI':
                    contractSize = '1'
                    break
                case 'LINK/DAI':
                    contractSize = '200'
                    break
                default:
                    throw Error(`unknown pair: ${o.pairName}`)
            }
 
            calls.push(
                this.linkPool.quote(
                    this.wallet.address,
                    o.maturity,
                    o.strike64x64,
                    utils.parseUnits(contractSize, this.linkDecimals),
                    o.optionType == 'CALL'
                )
            )
        }

        const premiums = await this.multicallProvider.all(calls)

        let i = 0
        for (let o of options.data.options) {
            if (o.pairName == 'YFI/DAI') continue

            // Multiply by 1e8 to match the oracle decimals
            let contractSize: string
            let price = 0

            switch (o.pairName) {
                case 'WBTC/DAI':
                    contractSize = '0.05'
                    price = wbtcPrice
                    break
                case 'WETH/DAI':
                    contractSize = '1'
                    price = wethPrice
                    break
                case 'LINK/DAI':
                    contractSize = '200'
                    price = linkPrice
                    break
                default:
                    throw Error(`unknown pair: ${o.pairName}`)
            }

            const data = premiums[i]
            const [
                baseCost64x64,
                feeCost64x64
            ] = data
            
            const premium = this.bn64x64ToBn(BigNumber.from(baseCost64x64))
                .add(this.bn64x64ToBn(BigNumber.from(feeCost64x64)))

            console.log(`Pair: ${o.pairName}`)
            console.log(`Type: ${o.optionType}`)
            console.log(`Maturity: ${new Date(o.maturity*1000)}`)
            console.log(`Strike: ${this.format64x64(BigNumber.from(o.strike64x64))}`)
            console.log(`Contract size: ${contractSize}`)
            console.log(`Premium: ${this.formatBn(premium.mul(price), this.linkDecimals+this.oracleDecimals)}`)
            console.log()

            i++
        }
    }
}

export default PremiaService
