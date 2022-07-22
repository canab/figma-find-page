// This shows the HTML page in "ui.html".
figma.showUI(__html__, {
    themeColors: true,
    width: 250,
    height: 250
});
figma.ui.onmessage = msg => {
    switch (msg.type) {
        case "on_input":
            onInput(msg.text);
            break;
        case "on_open":
            onOpen(msg.data);
            break;
        case "on_close":
            figma.closePlugin();
            break;
    }
};
function findPages(result, root, query) {
    for (let node of root.children) {
        if (node.type === "PAGE") {
            if (node.name.toLowerCase().includes(query)) {
                result.push({
                    id: node.id,
                    name: node.name,
                    type: "PAGE",
                });
            }
        }
    }
}
const max_result = 50;
const max_depth = 1;
const stat = { nodes: 0, time: 0 };
function findFrames(result, page, root, query, depth = 0) {
    for (let node of root.children) {
        stat.nodes++;
        if (result.length > max_result) {
            return;
        }
        if (node.type === "FRAME" ||
            node.type === "COMPONENT" ||
            node.type === "COMPONENT_SET") {
            if (node.name.toLowerCase().includes(query)) {
                result.push({
                    pg_id: page.id,
                    pg_name: page.name,
                    id: node.id,
                    name: node.name,
                    type: node.type,
                });
            }
            if (depth + 1 < max_depth) {
                findFrames(result, page, node, query, depth + 1);
            }
        }
    }
}
function onInput(text) {
    if (typeof (text) !== "string") {
        figma.ui.postMessage({ type: "search_result", data: { recent: recentList } });
        return;
    }
    const query = text.toLowerCase().trim();
    if (!query) {
        figma.ui.postMessage({ type: "search_result", data: { recent: recentList } });
        return;
    }
    const pages = [];
    findPages(pages, figma.root, query);
    stat.time = Date.now();
    stat.nodes = 0;
    const layers = [];
    for (let page of figma.root.children) {
        findFrames(layers, page, page, query);
    }
    console.log(`time: ${Date.now() - stat.time}ms, nodes: ${stat.nodes}`);
    figma.ui.postMessage({ type: "search_result", data: { pages, layers } });
}
const documentKey = figma.root.name;
const storageVersion = 1;
let recentList = [];
function onOpen(data) {
    if (data.type === "PAGE") {
        const page = figma.root.findChild(it => it.id === data.id);
        if (!page)
            return;
        figma.currentPage = page;
        addToRecent(data);
    }
    else {
        const page = figma.root.findChild(it => it.id === data.pg_id);
        if (!page)
            return;
        figma.currentPage = page;
        const node = page.findChild(it => it.id === data.id);
        if (node) {
            figma.currentPage.selection = [node];
            figma.viewport.scrollAndZoomIntoView([node]);
            addToRecent(data);
        }
    }
}
function addToRecent(data) {
    const recentIndex = recentList.findIndex(it => it.id === data.id);
    if (recentIndex >= 0) {
        recentList.splice(recentIndex, 1);
    }
    recentList.unshift(data);
    const storageData = {
        version: storageVersion,
        recent: recentList,
    };
    figma.clientStorage.setAsync(documentKey, storageData)
        .then(() => figma.closePlugin());
}
figma.clientStorage.getAsync(documentKey).then((result) => {
    var _a;
    if ((result === null || result === void 0 ? void 0 : result.version) !== storageVersion)
        return;
    recentList = (_a = result.recent) !== null && _a !== void 0 ? _a : [];
    const data = {
        recent: recentList,
    };
    figma.ui.postMessage({ type: "search_result", data });
});
