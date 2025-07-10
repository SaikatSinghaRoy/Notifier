const CHECK_INTERVAL_MINUTES = 30;
const ACTIVE_HOURS = [10, 23]; // From 10 AM to 11 PM

// On install or reload, schedule alarm
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("checkWebsites", {
        periodInMinutes: CHECK_INTERVAL_MINUTES,
    });
});

// Handle incoming messages (check now, add, delete, toggle)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { type } = message;

    if (type === "ADD_SITE") {
        const { id, name, url, enabled } = message.payload;
        chrome.storage.local.get("urls", (res) => {
            const urls = res.urls || {};
            urls[id] = { name, url, enabled, lastHash: null };
            chrome.storage.local.set({ urls });
        });
    }

    if (type === "DELETE_SITE") {
        const { id } = message;
        chrome.storage.local.get("urls", (res) => {
            const urls = res.urls || {};
            delete urls[id];
            chrome.storage.local.set({ urls });
        });
    }

    if (type === "TOGGLE_SITE") {
        const { id, enabled } = message;
        chrome.storage.local.get("urls", (res) => {
            const urls = res.urls || {};
            if (urls[id]) {
                urls[id].enabled = enabled;
                chrome.storage.local.set({ urls });
            }
        });
    }

    if (type === "CHECK_NOW") {
        checkWebsite(message.url) // Manual check updates hash if update available
    }
});

const hashContent = async (text) => {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

const notifyUser = (name) => {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon/icon.png",
        title: `${name} Updated`,
        message: "There is a new update. Please check the website.",
        priority: 2,
    });
};

const checkWebsite = async (url) => {
    try {
        const res = await fetch(url);
        const text = await res.text();
        const hash = await hashContent(text);

        chrome.storage.local.get("urls", (res) => {
            const urls = res.urls || {};
            const site = urls[url];
            if (!site) return;

            if (site.lastHash && site.lastHash !== hash) {
                notifyUser(site.name || url);
                site.lastHash = hash; // update hash only if changed
                chrome.storage.local.set({ urls });
            }
        });
    } catch (err) {
        console.log(`Error checking ${url}:`, err);
    }
};

// Runs every 30 minutes
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkWebsites") {
        const now = new Date();
        const hour = now.getHours();

        // Run only during active hours
        if (hour >= ACTIVE_HOURS[0] && hour < ACTIVE_HOURS[1]) {
            chrome.storage.local.get("urls", (res) => {
                const urls = res.urls || {};
                for (const [url, site] of Object.entries(urls)) {
                    if (site.enabled) {
                        checkWebsite(url);
                    }
                }
            });
        }
    }
});
