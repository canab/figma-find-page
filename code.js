// This shows the HTML page in "ui.html".
figma.showUI(__html__, { themeColors: true });
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
function onInput(text) {
    if (typeof (text) !== "string") {
        figma.ui.postMessage({ type: "search_result", nodes: recentList });
        return;
    }
    const query = text.toLowerCase().trim();
    if (!query) {
        figma.ui.postMessage({ type: "search_result", nodes: recentList });
        return;
    }
    const doc = figma.currentPage.parent;
    const result = [];
    for (let node of doc.children) {
        if (node.type === "PAGE") {
            if (node.name.toLowerCase().includes(query)) {
                const data = { id: node.id, name: node.name };
                result.push(data);
            }
        }
    }
    figma.ui.postMessage({ type: "search_result", nodes: result });
}
const documentKey = figma.root.name;
let recentList = [];
function onOpen(data) {
    const page = figma.root.findChild(it => it.id === data.id);
    if (!page)
        return;
    figma.currentPage = page;
    const recentIndex = recentList.findIndex(it => it.id === data.id);
    if (recentIndex >= 0)
        recentList.splice(recentIndex, 1);
    recentList.unshift(data);
    figma.clientStorage.setAsync(documentKey, recentList)
        .then(() => figma.closePlugin());
}
figma.clientStorage.getAsync(documentKey).then(result => {
    recentList = result || [];
    figma.ui.postMessage({ type: "search_result", nodes: recentList });
});
