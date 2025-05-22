function useSpotifyLogin() {

    const clientId = '180db798e7f14db3a648f58fb47c930e';
    const redirectUri = 'http://127.0.0.1:5173/loginResponse';

    const generateRandomString = (length: number): string => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    }

    const codeVerifier = generateRandomString(64);

    const sha256 = async (plain: string): Promise<ArrayBuffer> => {
        const encoder = new TextEncoder()
        const data = encoder.encode(plain)
        return window.crypto.subtle.digest('SHA-256', data)
    }

    const base64encode = (input: ArrayBuffer) => {
        return btoa(String.fromCharCode(...new Uint8Array(input)))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    const login = async () => {
        const hashed = await sha256(codeVerifier)
        const codeChallenge = base64encode(hashed);

        const scope = 'user-read-private user-read-email';
        const authUrl = new URL("https://accounts.spotify.com/authorize")

        // generated in the previous step
        window.localStorage.setItem('code_verifier', codeVerifier as string);

        const params = {
            response_type: 'code',
            client_id: clientId,
            scope,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            redirect_uri: redirectUri,
        }

        authUrl.search = new URLSearchParams(params).toString();
        window.location.href = authUrl.toString();

    }

    async function getResponse() {
        const urlParams = new URLSearchParams(window.location.search);
        let code = urlParams.get('code');
        if (!code) {
            console.log('Error')
            return
        }
        await getToken(code)
    }

    const getToken = async (code: string) => {

        // stored in the previous step
        const codeVerifier = localStorage.getItem('code_verifier');
        if (typeof (codeVerifier) !== 'string') {
            console.error('CodeVerifier is not stored in localStorage')
            return
        }

        const url = "https://accounts.spotify.com/api/token";
        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier,
            }),
        }
        const body = await fetch(url, payload);
        const response = await body.json();
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token)

        setTimeout(() => {
            refreshAccessToken()
        }, response.expires_in * 100)

    }

    async function refreshAccessToken() {
        const url = "https://accounts.spotify.com/api/token";
        const refreshToken = localStorage.getItem('refresh_token') as string
        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId
            }),
        }
        const body = await fetch(url, payload);
        const response = await body.json();

        if (response.error) {
            localStorage.clear()
            console.error('An error has ocurred refreshing the access token. Clearing Local Storage')
        }
        localStorage.setItem('access_token', response.access_token);
        if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
        }

        setTimeout(() => {
            refreshAccessToken()
        }, response.expires_in * 100)
    }


    return { login, getResponse, refreshAccessToken }
}

export default useSpotifyLogin