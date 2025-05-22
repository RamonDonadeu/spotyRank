import { GetSongsFromAlbumResponse, SearchRequest, SearchResponse } from "./apiTypes";
import axios, { AxiosResponse } from "axios";

const api = axios.create({
    baseURL: 'https://api.spotify.com', headers: {
        Authorization: 'Bearer ' + localStorage.getItem('access_token')
    }
})


export const spotifyApi = {
    search(params: SearchRequest): Promise<AxiosResponse<SearchResponse>> {
        return api.get('/v1/search', { params })
    },
    getSongsFromAlbum(id: string): Promise<AxiosResponse<GetSongsFromAlbumResponse>> {
        return api.get('/v1/albums/' + id + '/tracks')
    }
}