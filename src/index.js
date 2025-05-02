const { default: axios } = require('axios');
const { JSDOM } = require('jsdom')
const BASE_URL = 'http://1cak.com';

class Wancak {
    #headers;
    #cookie;
    /**
     * 
     * @param {string} cookie
     * @example new Wancak('sess_user_id=1080150; sess_str=8654ddb1d004cad1c023eeaee3894c7asas3;')
     */
    constructor(cookie) {
        this.#cookie = cookie
        this.#headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
            'Upgrade-Insecure-Requests': 1,
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'max-age=0',
            'Connection': 'keep-alive',
            'Host': '1cak.com',
            'Referer': 'https://1cak.com/login',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
        }
        if (this.#cookie) this.#headers['cookie'] = this.#cookie
    }

    static getCookie = async (username, password) => {
        try {
            const headers = {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "sec-ch-ua":
                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                Referer: "https://1cak.com/login",
            };

            // First get the login page to get the dynamic username field name
            const lojin = await axios.get("https://1cak.com/login");
            const usernameField =
                /<input name="(.*?)" id="inputUsername"/g.exec(lojin.data)[1];

            // Prepare login form data
            const formData = `${usernameField}=${encodeURIComponent(
                username
            )}&password=${encodeURIComponent(password)}&Submit=Login`;

            const res = await axios.post(
                "https://1cak.com/auth&redirect=",
                formData,
                {
                    headers: headers,
                    maxRedirects: 0, // Prevent following redirects
                    validateStatus: (status) => status < 400 || status === 302, // Accept 302 redirect
                }
            );

            if (!res.headers["set-cookie"]) {
                throw new Error("Login failed - No cookies returned");
            }

            // Extract and combine cookies
            const cookies = res.headers["set-cookie"]
                .map((cookie) => cookie.split(";")[0])
                .join("; ");

            return cookies;
        } catch (error) {
            if (error.response?.status === 302) {
                // Success - login redirect received
                return error.response.headers["set-cookie"]
                    .map((cookie) => cookie.split(";")[0])
                    .join("; ");
            }
            console.error("Error in getCookie:", error.message);
            return null;
        }
    }

    async #getVideo(url) {
        try {
            const { data } = await axios.get(url)
            let dom = new JSDOM(data).window.document;
            return dom.querySelector('video[class="video media"]').querySelectorAll('source')[1].getAttribute('src');
        } catch (error) {
            console.log(error);
            return 'https://1cak.com/images/unsave.jpg'
        }
    }


    /**
     * set nfsw mode
     * @param {0|1} mode // 1 = on | 0 = off
     */
    async nsfw(mode) {
        try {
            const { data } = await axios.get('https://1cak.com/recent&setSave=' + mode)
            return data
        } catch (error) {
            throw error
        }
    }

    /**
     * 
     * @param {'vote'|'legendary'|'lol'|'trending'} mode 
     * @returns 
     */
    async section(mode = 'vote') {
        try {
            if (/vote|legendary|lol|trending/g.test(mode)) {
                const res = await axios.get(BASE_URL + "/" + mode, {
                    headers: this.#headers,
                });
                let dom = new JSDOM(res.data).window.document;

                let asu = [
                    ...dom
                        .getElementById("content")
                        .querySelectorAll(
                            'div[style="border-bottom:1px solid #ccc;padding-bottom:10px;padding-top:10px"]'
                        ),
                ];

                let data = [];
                for (let x of asu) {
                    let gif =
                        x.querySelector("div.giphy_div") == null
                            ? null
                            : x.querySelector("div.giphy_div").innerHTML;
                    let image = x.querySelector("img");
                    let media =
                        gif !== null
                            ? await this.#getVideo(gif)
                            : image !== null
                            ? image.getAttribute("src")
                            : null;

                    // --- Logic untuk Vote Count ---
                    let voteValue = "0"; // Nilai default jika elemen tidak ditemukan atau -9999999
                    const voteElement = x.querySelector(
                        'div[style="margin-top:5px;cursor:pointer"] span'
                    ); // Seleksi elemen span vote

                    if (voteElement) {
                        const rawVoteText = voteElement.textContent;
                        // Cek jika teks konten vote adalah '-9999999'
                        if (rawVoteText === "-9999999") {
                            voteValue = "0"; // Ubah menjadi '0'
                        } else {
                            voteValue = rawVoteText; // Gunakan nilai asli jika bukan '-9999999'
                        }
                    }
                    // --- Akhir Logic untuk Vote Count ---

                    data.push({
                        date: x.querySelector("abbr").getAttribute("title"),
                        title: x.querySelector('a[target="_blank"] > h3')
                            .textContent,
                        media:
                            media !== null && media.startsWith("/")
                                ? BASE_URL + media
                                : media,
                        source: x.querySelectorAll("div.blur")[1].textContent,
                        vote: voteValue, // Gunakan nilai vote yang sudah diproses
                        post:
                            x
                                .getElementsByTagName("fb:comments-count")[0]
                                ?.getAttribute("href") || null, // Menambahkan optional chaining
                        gif:
                            x.querySelector("div.giphy_div") !== null
                                ? true
                                : false,
                        nsfw: /not safe for work/i.test(x.innerHTML), // Membuat case-insensitive
                        author: {
                            user:
                                x.querySelector(
                                    'a[style="display:inline;background:none"] > b'
                                ) !== null
                                    ? x.querySelector(
                                            'a[style="display:inline;background:none"] > b'
                                        ).textContent.trim()
                                    : null,
                            url:
                                x.querySelector(
                                    'a[style="display:inline;background:none"]'
                                ) !== null
                                    ? BASE_URL +
                                        x.querySelector(
                                            'a[style="display:inline;background:none"]'
                                        ).getAttribute("href")
                                    : null,
                        },
                    });
                }

                // --- Ambil Link Pagination (dari modifikasi sebelumnya) ---
                let nextPageUrl = null;
                const nextPageElement = dom.getElementById("next_page_link");
                if (nextPageElement) {
                    nextPageUrl = nextPageElement.getAttribute("href");
                    if (nextPageUrl && nextPageUrl.startsWith("/")) {
                        nextPageUrl = BASE_URL + nextPageUrl;
                    }
                }
                // --- Akhir Link Pagination ---

                // Kembalikan objek yang berisi data item dan link halaman berikutnya
                return {
                    items: data, // Menggunakan 'items' seperti sebelumnya
                    nextPage: nextPageUrl,
                };
            } else {
                return {
                    status: false,
                    msg: "mode tidak tersedia, list mode => vote|legendary|lol|trending",
                };
            }
        } catch (error) {
            console.error("Error in section:", error); // Menggunakan console.error
            // Mengembalikan objek error yang lebih informatif
            return {
                status: false,
                msg: "An error occurred while fetching data",
                error: error.message,
            };
        }
    }

    async shuffle() {
        try {
            const res = await axios.get(BASE_URL + '/shuffle', { headers: this.#headers })
            let dom = new JSDOM(res.data).window.document
            let asu = [...dom.getElementById('content').querySelectorAll('div[style="border-bottom:1px solid #eee;padding-bottom:10px;padding-top:10px"]')]//.map(x => x.querySelector('img')).filter(x => x !== null)
            let data = []
            for (let x of asu) {
                data.push({
                    date: x.querySelector('abbr').getAttribute('title'),
                    title: x.querySelector('h3[style="margin-top:-4px"]').textContent,
                    media: x.querySelector('div.giphy_div') !== null ? await this.#getVideo(x.querySelector('div.giphy_div').innerHTML) : x.querySelector('img').getAttribute('src'),
                    source: x.querySelectorAll('div.blur')[0].childNodes[2].textContent,
                    vote: x.querySelectorAll('div.blur')[1].querySelectorAll('span')[0].textContent,
                    post: x.getElementsByTagName('fb:comments-count')[0].getAttribute('href'),
                    gif: x.querySelector('div.giphy_div') !== null ? true : false,
                    nsfw: /Not safe for work|Not save for work/g.test(x.innerHTML),
                    author: {
                        user: x.querySelector('a[style="display:inline;background:none"] > b').textContent.trim(),
                        url: BASE_URL + x.querySelector('a[style="display:inline;background:none"]').getAttribute('href'),
                    }
                })
            }
            return data
        } catch (error) {
            throw error
        }
    }

    /**
     * mencari post berdasarkan query
     * @param {string} query 
     * @returns
     */
    async search(query) {
        try {
            const res = await axios.get(BASE_URL + '/search-0-' + encodeURIComponent(query), { headers: this.#headers })
            let dom = new JSDOM(res.data).window.document
            let asu = [...dom.getElementById('content').querySelectorAll('div[style="border-bottom:1px solid #ccc;padding-bottom:10px;padding-top:10px"]')]//.map(x => x.querySelector('img')).filter(x => x !== null)
            let data = []
            for (let x of asu) {
                //console.log(/rizkybarjo/.test(dom.textContent));
                let gif = x.querySelector('div.giphy_div') == null ? null : x.querySelector('div.giphy_div').innerHTML
                let image = x.querySelector('img')
                data.push({
                    date: x.querySelector('abbr').getAttribute('title'),
                    title: x.querySelector('a[target="_blank"] > h3').textContent,
                    media: gif !== null ? await this.#getVideo(gif) : image !== null ? image.getAttribute('src') : null,
                    //media: x.querySelector('source') !== null ? x.querySelectorAll('source')[1].getAttribute('src') == null ? null : x.querySelectorAll('source')[1].getAttribute('src') : x.querySelector('a[target="_blank"]').innerHTML,
                    source: x.querySelectorAll('div.blur')[1].textContent,
                    vote: x.querySelector('div[style="margin-top:5px;cursor:pointer"]').querySelector('span').textContent,
                    post: x.getElementsByTagName('fb:comments-count')[0].getAttribute('href'),
                    gif: x.querySelector('div.giphy_div') !== null ? true : false,
                    nsfw: /Not safe for work|Not save for work/g.test(x.innerHTML),
                    author: {
                        user: x.querySelector('a[style="display:inline;background:none"] > b').textContent.trim(),
                        url: BASE_URL + x.querySelector('a[style="display:inline;background:none"]').getAttribute('href'),
                    }
                })
            }
            return data
        } catch (error) {
            throw error
        }
    }

    /**
     * get comments list
     * @param {string|number} postId post id
     */
    async getComments(postId) {
        try {
            const { data } = await axios.get('https://cdn16.1cak.com/1cak_comment.php?act=view_comments&post_id=' + postId)
            let dom = new JSDOM(data).window.document
            //let comment = [...dom.getElementById('comment_1cak_' + id).querySelector('div > div').querySelectorAll('div[style="margin-bottom:10px;overflow:hidden"]')]
            //style="margin:5px"
            let comment = [...dom.querySelector('div[style="margin:5px"]').querySelectorAll('div[style="margin-bottom:10px;overflow:hidden"]')]
            let ndasmu = []
            for (let x of comment) {
                ndasmu.push({
                    author: {
                        user: x.querySelector('span > a > b').textContent
                    },
                    parent_comment_id: x.querySelector('span').getAttribute('id').match(/\d+/)[0],
                    hasMedia: /img src/g.test(x.innerHTML),
                    media: /img src/g.test(x.innerHTML) ? x.querySelector('img').getAttribute('src') : null,
                    date: x.querySelector('abbr').getAttribute('title'),
                    text: /<br>(.*?)[<|\n]/g.exec(x.querySelector('span').innerHTML)[1].trim()
                })
            }
            return ndasmu
        } catch (error) {
            throw error
        }
    }

    /**
     * 
     * @param {string|number} postId post id
     * @param {string|number} parentCommentId parent comment id
     * @returns 
     */
    async getCommentReplies(postId, parentCommentId) {
        try {
            const { data } = await axios.get('https://cdn16.1cak.com/1cak_comment.php?act=view_comments&post_id=' + postId + '&parent_comment_id=' + parentCommentId)
            let dom = new JSDOM(data).window.document
            //let comment = [...dom.getElementById('comment_1cak_' + id).querySelector('div > div').querySelectorAll('div[style="margin-bottom:10px;overflow:hidden"]')]
            //style="margin:5px"
            let comment = [...dom.querySelectorAll('div[style="margin-bottom:10px;overflow:hidden"]')]
            let ndasmu = []
            for (let x of comment) {
                ndasmu.push({
                    author: {
                        user: x.querySelector('span > a > b').textContent
                    },
                    parent_comment_id: x.querySelector('span').getAttribute('id').match(/\d+/)[0],
                    hasMedia: /img src/g.test(x.innerHTML),
                    media: /img src/g.test(x.innerHTML) ? x.querySelector('img').getAttribute('src') : null,
                    date: x.querySelector('abbr').getAttribute('title'),
                    text: /<br>(.*?)[<|\n]/g.exec(x.querySelector('span').innerHTML)[1].trim()
                })
            }
            return ndasmu
        } catch (error) {
            throw error
        }
    }
}

module.exports = Wancak;