const Wancak = require('./src')
const jihan = new Wancak('cookie');

// search post by keyword
(async () => {
    try {
        const res = await jihan.search('jihan jahat banget');
        console.log("Search results:", res);
    } catch (error) {
        console.error("Error during search:", error.message);
    }
})();

// shuffle atau random
(async () => {
    try {
        const res = await jihan.shuffle();
        console.log("Shuffle results:", res);
    } catch (error) {
        console.error("Error during shuffle:", error.message);
    }
})();

// mencari post berdasarkan section
(async () => {
    try {
        const res = await jihan.section('trending');
        console.log("Section results:", res);
    } catch (error) {
        console.error("Error during section call:", error.message);
    }
})();

// set nfsw on / off
(async () => {
    try {
        const res = await jihan.nsfw(true); // Changed 1 to true
        console.log("NSFW mode set:", res);
    } catch (error) {
        console.error("Error setting NSFW mode:", error.message);
    }
})();