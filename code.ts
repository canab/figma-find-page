// This shows the HTML page in "ui.html".

figma.showUI(__html__, {
	themeColors: true,
	width: 250,
	height: 250
});

figma.ui.onmessage = msg =>
{
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

interface ItemData
{
	id: string;
	name: string;
}

function findPages(result: ItemData[], root: BaseNodeMixin & ChildrenMixin, query: string)
{
	for (let node of root.children) {
		if (node.type === "PAGE" as any) {
			if (node.name.toLowerCase().includes(query)) {
				result.push({id: node.id, name: node.name});
			}
		}
	}
}

const max_result = 50;
const max_depth = 2;
let node_stat = 0;

function findFrames(result: ItemData[], root: BaseNodeMixin & ChildrenMixin, query: string, depth = 0)
{
	if (depth === 0) {
		node_stat = 0;
	}

	for (let node of root.children) {

		node_stat++;

		if (result.length > max_result) {
			return;
		}

		if (node.type === "PAGE" as any) {
			if (depth < max_depth) {
				findFrames(result, node as any, query, depth + 1);
			}
			continue;
		}

		if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
			if (node.name.toLowerCase().includes(query)) {
				let prefix = "";
				if (node.type === "FRAME") {
					prefix = "# ";
				} else {
					prefix = "◈ ";
				}

				result.push({id: node.id, name: prefix + node.name});
			}
			if (depth < max_depth) {
				findFrames(result, node as any, query, depth + 1);
			}
		}
	}

	if (depth === 0) {
		console.log(`stat: ${node_stat} nodes`);
	}
}

function onInput(text: unknown)
{
	if (typeof (text) !== "string") {
		figma.ui.postMessage({type: "search_result", nodes: recentList});
		return;
	}

	const query = text.toLowerCase().trim();
	if (!query) {
		figma.ui.postMessage({type: "search_result", nodes: recentList});
		return;
	}

	const result = [];

	findPages(result, figma.root as any, query);

	const time = Date.now();
	findFrames(result, figma.root as any, query);
	console.log(`time: ${Date.now() - time}ms`);

	figma.ui.postMessage({type: "search_result", nodes: result});
}

const documentKey = figma.root.name;
let recentList: ItemData[] = [];

function onOpen(data: ItemData)
{
	const page = figma.root.findChild(it => it.id === data.id);
	if (!page) {
		return;
	}

	figma.currentPage = page;

	const recentIndex = recentList.findIndex(it => it.id === data.id);
	if (recentIndex >= 0) {
		recentList.splice(recentIndex, 1);
	}
	recentList.unshift(data);
	figma.clientStorage.setAsync(documentKey, recentList)
		.then(() => figma.closePlugin());
}

figma.clientStorage.getAsync(documentKey).then(result => {
	recentList = result || [];
	figma.ui.postMessage({type: "search_result", nodes: recentList});
});

console.log("run");
