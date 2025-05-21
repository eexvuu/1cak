const { default: axios } = require("axios");
const { JSDOM } = require("jsdom");
const BASE_URL = "https://1cak.com";

class Wancak {
    #headers;
    #cookie;
    /**
     *
     * @param {string} cookie
     * @example new Wancak('sess_user_id=1080150; sess_str=8654ddb1d004cad1c023eeaee3894c7asas3;')
     */
    constructor(cookie) {
        this.#cookie = cookie;
        this.#headers = {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
            "Upgrade-Insecure-Requests": 1,
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "max-age=0",
            Connection: "keep-alive",
            Host: "1cak.com",
            Referer: "https://1cak.com/login",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
        };
        if (this.#cookie) this.#headers["cookie"] = this.#cookie;
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
            // return null; // Original line
            throw new Error(`Failed to get cookie: ${error.message}`);
        }
    };

    async #getVideo(url) {
        try {
            const { data } = await axios.get(url);
            let dom = new JSDOM(data).window.document;
            return dom
                .querySelector('video[class="video media"]')
                .querySelectorAll("source")[1]
                .getAttribute("src");
        } catch (error) {
            // console.log(error); // Original line
            // return "https://1cak.com/images/unsave.jpg"; // Original line
            throw new Error(`Failed to get video from ${url}: ${error.message}`);
        }
    }

    /**
     * set nfsw mode
     * @param {boolean} enableNsfw // true = on | false = off
     */
    async nsfw(enableNsfw) {
        try {
            const headers = {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
                "sec-ch-ua":
                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                cookie: this.#cookie,
                Referer: "https://1cak.com/",
            };

            const { data } = await axios.get(
                "https://1cak.com/recent&setSave=" + (enableNsfw ? 1 : 0),
                {
                    headers: headers,
                }
            );
            return data;
        } catch (error) {
            if (error.response?.data === "login") {
                throw new Error("Login required - Please provide valid cookie");
            }
            throw error;
        }
    }

    /**
     *
     * @param {'vote'|'legendary'|'lol'|'trending'} mode
     * @returns
     */
    async section(mode = "vote") {
        try {
            if (/vote|legendary|lol|trending/g.test(mode)) {
                const res = await axios.get(BASE_URL + "/" + mode, {
                    headers: this.#headers,
                });
                let dom = new JSDOM(res.data).window.document;

                let postElements = [
                    ...dom
                        .getElementById("content")
                        .querySelectorAll(
                            'div[style="border-bottom:1px solid #ccc;padding-bottom:10px;padding-top:10px"]'
                        ),
                ];

                let data = [];
                for (let postElement of postElements) {
                    let gif =
                        postElement.querySelector("div.giphy_div") == null
                            ? null
                            : postElement.querySelector("div.giphy_div").innerHTML;
                    let image = postElement.querySelector("img");
                    let media =
                        gif !== null
                            ? await this.#getVideo(gif)
                            : image !== null
                            ? image.getAttribute("src")
                            : null;

                    // --- Logic untuk Vote Count ---
                    let voteValue = "0"; // Nilai default jika elemen tidak ditemukan atau -9999999
                    const voteElement = postElement.querySelector(
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
                        date: postElement.querySelector("abbr").getAttribute("title"),
                        title: postElement.querySelector('a[target="_blank"] > h3')
                            .textContent,
                        media:
                            media !== null && media.startsWith("/")
                                ? BASE_URL + media
                                : media,
                        source: postElement.querySelectorAll("div.blur")[1].textContent,
                        vote: voteValue, // Gunakan nilai vote yang sudah diproses
                        post:
                            postElement
                                .getElementsByTagName("fb:comments-count")[0]
                                ?.getAttribute("href") || null, // Menambahkan optional chaining
                        gif:
                            postElement.querySelector("div.giphy_div") !== null
                                ? true
                                : false,
                        nsfw: /not safe for work/i.test(postElement.innerHTML), // Membuat case-insensitive
                        author: {
                            user:
                                postElement.querySelector(
                                    'a[style="display:inline;background:none"] > b'
                                ) !== null
                                    ? postElement
                                          .querySelector(
                                              'a[style="display:inline;background:none"] > b'
                                          )
                                          .textContent.trim()
                                    : null,
                            url:
                                postElement.querySelector(
                                    'a[style="display:inline;background:none"]'
                                ) !== null
                                    ? BASE_URL +
                                      postElement
                                          .querySelector(
                                              'a[style="display:inline;background:none"]'
                                          )
                                          .getAttribute("href")
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
                        nextPageUrl = nextPageUrl;
                    }
                }
                // --- Akhir Link Pagination ---

                // Kembalikan objek yang berisi data item dan link halaman berikutnya
                return {
                    items: data, // Menggunakan 'items' seperti sebelumnya
                    nextPage: nextPageUrl,
                };
            } else {
                // return { // Original lines
                //     status: false,
                //     msg: "mode tidak tersedia, list mode => vote|legendary|lol|trending",
                // };
                throw new Error("Mode tidak tersedia, list mode => vote|legendary|lol|trending");
            }
        } catch (error) {
            // console.error("Error in section:", error); // Menggunakan console.error // Original line
            // Mengembalikan objek error yang lebih informatif // Original line
            // return { // Original lines
            //     status: false,
            //     msg: "An error occurred while fetching data",
            //     error: error.message,
            // };
            throw new Error(`An error occurred while fetching section data: ${error.message}`);
        }
    }

    /**
     *
     * @param {string} url
     */
    async pages(url) {
        try {
            const res = await axios.get(BASE_URL + "/" + url, {
                headers: this.#headers,
            });
            let dom = new JSDOM(res.data).window.document;

            let postElements = [
                ...dom
                    .getElementById("content")
                    .querySelectorAll(
                        'div[style="border-bottom:1px solid #ccc;padding-bottom:10px;padding-top:10px"]'
                    ),
            ];

            let data = [];
            for (let postElement of postElements) {
                let gif =
                    postElement.querySelector("div.giphy_div") == null
                        ? null
                        : postElement.querySelector("div.giphy_div").innerHTML;
                let image = postElement.querySelector("img");
                let media =
                    gif !== null
                        ? await this.#getVideo(gif)
                        : image !== null
                        ? image.getAttribute("src")
                        : null;

                // --- Logic untuk Vote Count ---
                let voteValue = "0"; // Nilai default jika elemen tidak ditemukan atau -9999999
                const voteElement = postElement.querySelector(
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

                // Special handling for source when URL starts with "of-"
                let source;
                if (url.startsWith("of-")) {
                    const sourceDiv = postElement.querySelector(
                        "#vote_td_2882598 > div:nth-child(5)"
                    );
                    source = sourceDiv?.textContent || "";
                } else {
                    source = postElement.querySelectorAll("div.blur")[1]?.textContent;
                }

                data.push({
                    date: postElement.querySelector("abbr")?.getAttribute("title"),
                    title: postElement.querySelector('a[target="_blank"] > h3')
                        ?.textContent,
                    media:
                        media !== null && media.startsWith("/")
                            ? BASE_URL + media
                            : media,
                    source: source,
                    vote: voteValue,
                    post:
                        postElement
                            .getElementsByTagName("fb:comments-count")[0]
                            ?.getAttribute("href") || null,
                    gif: postElement.querySelector("div.giphy_div") !== null,
                    nsfw: /not safe for work/i.test(postElement.innerHTML),
                    author: {
                        user: postElement
                            .querySelector(
                                'a[style="display:inline;background:none"] > b'
                            )
                            ?.textContent?.trim(),
                        url: postElement.querySelector(
                            'a[style="display:inline;background:none"]'
                        )
                            ? BASE_URL +
                              postElement
                                  .querySelector(
                                      'a[style="display:inline;background:none"]'
                                  )
                                  .getAttribute("href")
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
                    nextPageUrl = nextPageUrl;
                }
            }
            // --- Akhir Link Pagination ---

            // Kembalikan objek yang berisi data item dan link halaman berikutnya
            return {
                items: data, // Menggunakan 'items' seperti sebelumnya
                nextPage: nextPageUrl,
            };
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

    /**
     * Get a single post by its ID
     * @param {string|number} postId The ID of the post to fetch
     * @returns {Promise<Object>} Post details
     */
    async getPost(postId) {
        try {
            const res = await axios.get(`${BASE_URL}/${postId}`, {
                headers: this.#headers,
            });
            let dom = new JSDOM(res.data).window.document;

            // Get the post container
            const postContainer = dom.querySelector(
                'div#content div[style="border-bottom:1px solid #eee;padding-bottom:10px;padding-top:10px"]'
            );

            if (!postContainer) {
                // return { // Original lines
                //     status: false,
                //     msg: "Post not found",
                // };
                throw new Error("Post not found");
            }

            // Get media content
            let gif = postContainer.querySelector("div.giphy_div");
            let image = postContainer.querySelector("img");
            let media =
                gif !== null
                    ? await this.#getVideo(gif.innerHTML)
                    : image !== null
                    ? image.getAttribute("src")
                    : null;

            // Get vote count
            let voteValue = "0";
            const voteElement = postContainer.querySelector(
                'div[style="margin-top:5px;cursor:pointer"] span'
            );
            if (voteElement) {
                const rawVoteText = voteElement.textContent;
                voteValue = rawVoteText === "-9999999" ? "0" : rawVoteText;
            }

            // Build post data
            const postData = {
                id: postId,
                date: postContainer
                    .querySelector("abbr")
                    ?.getAttribute("title"),
                title: postContainer.querySelector("h3")?.textContent,
                media:
                    media !== null && media.startsWith("/")
                        ? BASE_URL + media
                        : media,
                source: postContainer
                    .querySelector("div.blur")
                    ?.childNodes[2]?.textContent?.trim(),
                vote: voteValue,
                gif: gif !== null,
                nsfw: /Not save for work/i.test(postContainer.innerHTML),
                author: {
                    user: postContainer
                        .querySelector(
                            'a[style="display:inline;background:none"] > b'
                        )
                        ?.textContent.trim(),
                    url: postContainer.querySelector(
                        'a[style="display:inline;background:none"]'
                    )
                        ? BASE_URL +
                          postContainer
                              .querySelector(
                                  'a[style="display:inline;background:none"]'
                              )
                              .getAttribute("href")
                        : null,
                },
            };

            return postData;
        } catch (error) {
            // console.error("Error in getPost:", error); // Original line
            // return { // Original lines
            //     status: false,
            //     msg: "An error occurred while fetching the post",
            //     error: error.message,
            // };
            throw new Error(`An error occurred while fetching the post ${postId}: ${error.message}`);
        }
    }

    async shuffle() {
        try {
            const res = await axios.get(BASE_URL + "/shuffle", {
                headers: this.#headers,
            });
            let dom = new JSDOM(res.data).window.document;
            let postElements = [
                ...dom
                    .getElementById("content")
                    .querySelectorAll(
                        'div[style="border-bottom:1px solid #eee;padding-bottom:10px;padding-top:10px"]'
                    ),
            ]; //.map(postElement => postElement.querySelector('img')).filter(postElement => postElement !== null)
            let data = [];
            for (let postElement of postElements) {
                data.push({
                    date: postElement.querySelector("abbr").getAttribute("title"),
                    title: postElement.querySelector('h3[style="margin-top:-4px"]')
                        .textContent,
                    media:
                        postElement.querySelector("div.giphy_div") !== null
                            ? await this.#getVideo(
                                  postElement.querySelector("div.giphy_div").innerHTML
                              )
                            : postElement.querySelector("img").getAttribute("src"),
                    source: postElement.querySelectorAll("div.blur")[0].childNodes[2]
                        .textContent,
                    vote: postElement
                        .querySelectorAll("div.blur")[1]
                        .querySelectorAll("span")[0].textContent,
                    post: postElement
                        .getElementsByTagName("fb:comments-count")[0]
                        .getAttribute("href"),
                    gif:
                        postElement.querySelector("div.giphy_div") !== null
                            ? true
                            : false,
                    nsfw: /Not safe for work|Not save for work/g.test(
                        postElement.innerHTML
                    ),
                    author: {
                        user: postElement
                            .querySelector(
                                'a[style="display:inline;background:none"] > b'
                            )
                            .textContent.trim(),
                        url:
                            BASE_URL +
                            postElement
                                .querySelector(
                                    'a[style="display:inline;background:none"]'
                                )
                                .getAttribute("href"),
                    },
                });
            }
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * mencari post berdasarkan query
     * @param {string} query
     * @returns
     */
    async search(query) {
        try {
            const res = await axios.get(
                BASE_URL + "/search-0-" + encodeURIComponent(query),
                { headers: this.#headers }
            );
            let dom = new JSDOM(res.data).window.document;
            let postElements = [
                ...dom
                    .getElementById("content")
                    .querySelectorAll(
                        'div[style="border-bottom:1px solid #ccc;padding-bottom:10px;padding-top:10px"]'
                    ),
            ]; //.map(postElement => postElement.querySelector('img')).filter(postElement => postElement !== null)
            let data = [];
            for (let postElement of postElements) {
                //console.log(/rizkybarjo/.test(dom.textContent));
                let gif =
                    postElement.querySelector("div.giphy_div") == null
                        ? null
                        : postElement.querySelector("div.giphy_div").innerHTML;
                let image = postElement.querySelector("img");
                data.push({
                    date: postElement.querySelector("abbr").getAttribute("title"),
                    title: postElement.querySelector('a[target="_blank"] > h3')
                        .textContent,
                    media:
                        gif !== null
                            ? await this.#getVideo(gif)
                            : image !== null
                            ? image.getAttribute("src")
                            : null,
                    //media: postElement.querySelector('source') !== null ? postElement.querySelectorAll('source')[1].getAttribute('src') == null ? null : postElement.querySelectorAll('source')[1].getAttribute('src') : postElement.querySelector('a[target="_blank"]').innerHTML,
                    source: postElement.querySelectorAll("div.blur")[1].textContent,
                    vote: postElement
                        .querySelector(
                            'div[style="margin-top:5px;cursor:pointer"]'
                        )
                        .querySelector("span").textContent,
                    post: postElement
                        .getElementsByTagName("fb:comments-count")[0]
                        .getAttribute("href"),
                    gif:
                        postElement.querySelector("div.giphy_div") !== null
                            ? true
                            : false,
                    nsfw: /Not safe for work|Not save for work/g.test(
                        postElement.innerHTML
                    ),
                    author: {
                        user: postElement
                            .querySelector(
                                'a[style="display:inline;background:none"] > b'
                            )
                            .textContent.trim(),
                        url:
                            BASE_URL +
                            postElement
                                .querySelector(
                                    'a[style="display:inline;background:none"]'
                                )
                                .getAttribute("href"),
                    },
                });
            }
            return data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * get comments list
     * @param {string|number} postId post id
     */
    async getComments(postId) {
        try {
            const { data } = await axios.get(
                "https://cdn16.1cak.com/1cak_comment.php?act=view_comments&post_id=" +
                    postId
            );
            let dom = new JSDOM(data).window.document;
            //let commentElements = [...dom.getElementById('comment_1cak_' + id).querySelector('div > div').querySelectorAll('div[style="margin-bottom:10px;overflow:hidden"]')]
            //style="margin:5px"
            let commentElements = [
                ...dom
                    .querySelector('div[style="margin:5px"]')
                    .querySelectorAll(
                        'div[style="margin-bottom:10px;overflow:hidden"]'
                    ),
            ];
            let comments = [];
            for (let commentElement of commentElements) {
                comments.push({
                    author: {
                        user: commentElement.querySelector("span > a > b").textContent,
                    },
                    parent_comment_id: commentElement
                        .querySelector("span")
                        .getAttribute("id")
                        .match(/\d+/)[0],
                    hasMedia: /img src/g.test(commentElement.innerHTML),
                    media: /img src/g.test(commentElement.innerHTML)
                        ? commentElement.querySelector("img").getAttribute("src")
                        : null,
                    date: commentElement.querySelector("abbr").getAttribute("title"),
                    text: (() => {
                        const commentSpan = commentElement.querySelector("span");
                        if (!commentSpan) return "";
                        let text = "";
                        let collect = false;
                        for (const node of commentSpan.childNodes) {
                            if (node.nodeName.toLowerCase() === 'br') {
                                collect = true;
                                continue;
                            }
                            if (collect && node.nodeType === 3) { // Node.TEXT_NODE
                                text += node.nodeValue;
                            }
                            // Optionally handle other element nodes within comment text, e.g., images/emojis
                            // if (collect && node.nodeType === 1 && node.nodeName.toLowerCase() === 'img') {
                            //     text += node.getAttribute('alt') || '[image]';
                            // }
                        }
                        return text.trim();
                    })(),
                });
            }
            return comments;
        } catch (error) {
            throw error;
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
            const { data } = await axios.get(
                "https://cdn16.1cak.com/1cak_comment.php?act=view_comments&post_id=" +
                    postId +
                    "&parent_comment_id=" +
                    parentCommentId
            );
            let dom = new JSDOM(data).window.document;
            //let commentElements = [...dom.getElementById('comment_1cak_' + id).querySelector('div > div').querySelectorAll('div[style="margin-bottom:10px;overflow:hidden"]')]
            //style="margin:5px"
            let commentElements = [
                ...dom.querySelectorAll(
                    'div[style="margin-bottom:10px;overflow:hidden"]'
                ),
            ];
            let comments = [];
            for (let commentElement of commentElements) {
                comments.push({
                    author: {
                        user: commentElement.querySelector("span > a > b").textContent,
                    },
                    parent_comment_id: commentElement
                        .querySelector("span")
                        .getAttribute("id")
                        .match(/\d+/)[0],
                    hasMedia: /img src/g.test(commentElement.innerHTML),
                    media: /img src/g.test(commentElement.innerHTML)
                        ? commentElement.querySelector("img").getAttribute("src")
                        : null,
                    date: commentElement.querySelector("abbr").getAttribute("title"),
                    text: (() => {
                        const commentSpan = commentElement.querySelector("span");
                        if (!commentSpan) return "";
                        let text = "";
                        let collect = false;
                        for (const node of commentSpan.childNodes) {
                            if (node.nodeName.toLowerCase() === 'br') {
                                collect = true;
                                continue;
                            }
                            if (collect && node.nodeType === 3) { // Node.TEXT_NODE
                                text += node.nodeValue;
                            }
                            // Optionally handle other element nodes within comment text, e.g., images/emojis
                            // if (collect && node.nodeType === 1 && node.nodeName.toLowerCase() === 'img') {
                            //     text += node.getAttribute('alt') || '[image]';
                            // }
                        }
                        return text.trim();
                    })(),
                });
            }
            return comments;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Vote or unvote a post
     * @param {string|number} postId The ID of the post to vote/unvote
     * @returns {Promise<Object>} Vote result
     */
    async fun(postId) {
        try {
            const headers = {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
                "sec-ch-ua":
                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                cookie: this.#cookie,
                Referer: "https://1cak.com/",
            };

            const { data } = await axios.get(
                `${BASE_URL}/recent&vote=${postId}`,
                {
                    headers: headers,
                }
            );

            // Check response type
            if (data === "Fun!") {
                return {
                    status: true,
                    msg: "Successfully upvoted post",
                    action: "upvote",
                    postId,
                };
            } else if (data === "Fun") {
                return {
                    status: true,
                    msg: "Successfully removed upvote",
                    action: "unvote",
                    postId,
                };
            } else {
                // return { // Original lines
                //     status: false,
                //     msg: "Vote action failed",
                //     error: data,
                // };
                throw new Error(`Vote action failed for post ${postId}: ${data}`);
            }
        } catch (error) {
            // console.error("Error in fun:", error); // Original line
            // return { // Original lines
            //     status: false,
            //     msg: "An error occurred while voting",
            //     error: error.message,
            // };
            throw new Error(`An error occurred while voting for post ${postId}: ${error.message}`);
        }
    }

    /**
     * Downvote or remove downvote from a post
     * @param {string|number} postId The ID of the post to downvote/undownvote
     * @returns {Promise<Object>} Vote result
     */
    async nuf(postId) {
        try {
            const headers = {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
                "sec-ch-ua":
                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                cookie: this.#cookie,
                Referer: "https://1cak.com/",
            };

            const { data } = await axios.get(
                `${BASE_URL}/recent&nope=${postId}`,
                {
                    headers: headers,
                }
            );

            // Check response type
            if (data === "Nuf!") {
                return {
                    status: true,
                    msg: "Successfully downvoted post",
                    action: "downvote",
                    postId,
                };
            } else if (data === "Nuf") {
                return {
                    status: true,
                    msg: "Successfully removed downvote",
                    action: "undownvote",
                    postId,
                };
            } else {
                // return { // Original lines
                //     status: false,
                //     msg: "Downvote action failed",
                //     error: data,
                // };
                throw new Error(`Downvote action failed for post ${postId}: ${data}`);
            }
        } catch (error) {
            // console.error("Error in nuf:", error); // Original line
            // return { // Original lines
            //     status: false,
            //     msg: "An error occurred while downvoting",
            //     error: error.message,
            // };
            throw new Error(`An error occurred while downvoting for post ${postId}: ${error.message}`);
        }
    }

    /**
     * Add a comment to a post
     * @param {Object} params Comment parameters
     * @param {string|number} params.postId The ID of the post to comment on
     * @param {string} params.comment The comment text
     * @param {string|number} [params.replyId] Optional ID of the comment to reply to
     * @param {string|number} [params.parentId] Optional ID of the parent comment when replying
     * @returns {Promise<Object>} Comment result
     */
    async addComment({ postId, comment, replyId = "", parentId = "" }) {
        try {
            // First get the post page to extract credentials
            const res = await axios.get(`${BASE_URL}/${postId}`, {
                headers: this.#headers,
            });

            // Extract credentials from script tag
            const hashMatch = res.data.match(/var hash_comment='([^']+)'/);
            const userNameMatch = res.data.match(
                /var user_name_comment='([^']+)'/
            );
            const userIdMatch = res.data.match(/var user_id_comment='([^']+)'/);

            const hash = hashMatch ? hashMatch[1] : null;
            const userName = userNameMatch ? userNameMatch[1] : null;
            const userId = userIdMatch ? userIdMatch[1] : null;

            if (!userId || !userName || !hash) {
                throw new Error("Could not extract user credentials from page");
            }

            const headers = {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7",
                "content-type": "text/plain;charset=UTF-8",
                "sec-ch-ua":
                    '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                "sec-ch-ua-mobile": "?1",
                "sec-ch-ua-platform": '"Android"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                cookie: this.#cookie,
                Referer: `${BASE_URL}/${postId}`,
            };

            const url = new URL(`${BASE_URL}/cdn16/1cak_comment.php`);
            url.searchParams.append("post_id", postId);
            url.searchParams.append("user_id", userId);
            url.searchParams.append("comment_reply_id", replyId);
            url.searchParams.append("comment_reply_parent_id", parentId);
            url.searchParams.append("user_name", userName);
            url.searchParams.append("hash", hash);
            url.searchParams.append("comment", comment);
            url.searchParams.append("act", "add_comment");

            const { data } = await axios.post(url.toString(), "", { headers });

            if (data) {
                return {
                    status: true,
                    msg: "Comment added successfully",
                    postId,
                    comment,
                };
            }
        } catch (error) {
            console.error("Error in addComment:", error);
            // return { // Original lines
            //     status: false,
            //     msg: "An error occurred while adding comment",
            //     error: error.message,
            // };
            throw new Error(`An error occurred while adding comment to post ${postId}: ${error.message}`);
        }
    }
}

module.exports = Wancak;
