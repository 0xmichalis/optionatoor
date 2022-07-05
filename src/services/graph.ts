import axios, { AxiosResponse } from 'axios';

class GraphService {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    do(query: string, variables = {}): Promise<AxiosResponse> {
        return axios.post(this.url, {
            query,
            variables,
        });
    }
}

export default GraphService;
