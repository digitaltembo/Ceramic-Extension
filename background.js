// Recursive

let stylesheet = "";
const insertedTabs = new Set();
const className = "recursivetypetester-disabled";
const blacklistedClasses = [
    "icon",
    "Icon",
    "fa",
    "fas",
    "far",
    "fal",
    "fab",
    "font-fontello",
    "glyphicon"
];
const blacklist = (() => {
    let b = "";
    for (const blacklistedClass of blacklistedClasses) {
        b += `:not(.${blacklistedClass})`;
    }
    return b;
})();

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        "fontActivated": false,
        "fonts": [{
                "name": "Recursive Sans",
                "file": "recursive-sans-var.woff2",
                "selectors": [
                    "*"
                ]
            },
            {
                "name": "Recursive Mono",
                "file": "recursive-mono-var.woff2",
                "selectors": [
                    "code",
                    "code *", // Code blocks with syntax highlighting
                    "pre",
                    "pre *", // Code blocks with syntax highlighting
                    "samp",
                    "kbd",
                    ".blob-code", // Github
                    ".blob-code *" // Github
                ]
            }

        ]
    }, () => {
        generateStyleSheet();
    });
});

chrome.tabs.onUpdated.addListener((_tabId, { status }, { active }) => {
    if (active && status === "loading") {
        chrome.storage.sync.get(
            "fontActivated", ({ fontActivated }) => {
                toggle(fontActivated, true);
            }
        );
    }
});

chrome.tabs.onActivated.addListener(() => {
    chrome.storage.sync.get(
        "fontActivated", ({ fontActivated }) => {
            toggle(fontActivated);
        }
    );
});

chrome.tabs.onRemoved.addListener(tabId => {
    insertedTabs.delete(tabId);
});

// Injecting the stylesheet is fast, adding a class to
// the body isn't. We don't want a delay, so the CSS will
// enable the fonts immediately, and we only add a class
// when we want to *remove* the custom fonts.
function toggle(fontActivated, forceInsert) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, tabs => {
        const tabId = tabs[0].id;

        if (fontActivated) {
            // Inject CSS to activate font
            if (!insertedTabs.has(tabId) || forceInsert) {
                chrome.tabs.insertCSS(tabId, {
                    code: stylesheet,
                    runAt: "document_start"
                });
                insertedTabs.add(tabId);
            }
            // Remove force-disable class
            chrome.tabs.executeScript(tabId, {
                code: `document.body.classList.remove("${className}");`
            });
        } else {
            // Add force-disable class
            chrome.tabs.executeScript(tabId, {
                code: `document.body.classList.add("${className}");`
            });
        }
    });
}

function generateStyleSheet() {
    chrome.storage.sync.get(
        "fonts", ({ fonts }) => {
            for (const font of fonts) {

                // TODO: if font has `*` as selector, it must go first in
                // the stylesheet, otherwise it overwrites previous rules
                let selectors = [];
                for (const selector of font.selectors) {
                    selectors.push(`body:not(.recursivetypetester-disabled) ${selector}${blacklist}`);
                }

                const fontURL = chrome.runtime.getURL(`fonts/${font.file}`);

                stylesheet += `
                    @font-face {
                        font-family: '${font.name}';
                        src: url('${fontURL}');
                    }

                    ${selectors.join(', ')} {
                        font-family: '${font.name}' !important;
                    }`;
            }
        }
    );
}