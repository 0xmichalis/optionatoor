import axios, { AxiosResponse } from 'axios';

const ApiService = {
  init(): void {
    axios.defaults.headers.common['Accept'] = 'application/json';
  },
  get(url: string): Promise<AxiosResponse> {
    return axios.get(url);
  },
  post(url: string, data: any): Promise<AxiosResponse> {
    return axios.post(url, data);
  },
  graphql(url: string, query: string, variables = {}): Promise<AxiosResponse> {
    return axios.post(url, {
      query,
      variables,
    });
  },
};

export default ApiService;
