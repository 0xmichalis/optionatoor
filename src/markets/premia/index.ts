import ApiService from '../../services/api'
import { config } from '../../config'
import { fetchOptionsQuery, fetchPoolsQuery, fetchTokensQuery } from './queries'

const subgraphURL = config.get('PREMIA_SUBGRAPH_API_URL')

const PremiaService = {
    async fetchTokens(): Promise<any> {
        const resp = await ApiService.graphql(subgraphURL, fetchTokensQuery)
        return resp.data
    },
    async fetchPools(): Promise<any> {
        const resp =  await ApiService.graphql(subgraphURL, fetchPoolsQuery)
        return resp.data
    },
    async fetchOptions(): Promise<any> {
        const now = Math.floor(Date.now() / 1000)
        const resp =  await ApiService.graphql(subgraphURL, fetchOptionsQuery(now))
        return resp.data
    },
}

export default PremiaService
