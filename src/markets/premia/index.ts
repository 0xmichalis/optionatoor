import ApiService from '../../services/api'
import { config } from '../../config'
import { fetchPoolsQuery, fetchTokensQuery } from './queries'

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
}

export default PremiaService
