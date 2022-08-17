// This shows the HTML page in "ui.html".

figma.ui.onmessage = msg =>
{
	switch (msg.type) {
		case "on_input":
			onInput(msg.text);
			break;

		case "on_open":
			onOpen(msg.data, msg.close);
			break;

		case "on_settings":
			settings = msg.settings;
			saveData(() => {
				figma.ui.resize(settings.width, settings.height);
			})
			break;

		case "on_close":
			figma.closePlugin();
			break;
	}
};

let settings = {
	width: 300,
	height: 300,
}

interface ItemData
{
	id: string;
	name: string;
	type: "PAGE" | "FRAME" | "COMPONENT" | "COMPONENT_SET";
	pg_id?: string;
	pg_name?: string;
}

interface StorageData
{
	version?: number;
	recent?: ItemData[];
	settings?: typeof settings;
}

function findPages(result: ItemData[], root: BaseNodeMixin & ChildrenMixin, query: string)
{
	for (let node of root.children) {
		if (node.type === "PAGE" as any) {
			if (node.name.toLowerCase().includes(query)) {
				result.push({
					id: node.id,
					name: node.name,
					type: "PAGE"
				});
			}
		}
	}
}

const max_result = 50;
const max_depth = 1;
const stat = {nodes: 0, time: 0};

function findFrames(result: ItemData[],
                    page: PageNode,
                    root: BaseNodeMixin & ChildrenMixin,
                    query: string,
                    depth = 0)
{
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
					type: node.type
				});
			}

			if (depth + 1 < max_depth) {
				findFrames(result, page, node as any, query, depth + 1);
			}
		}
	}
}

function onInput(text: unknown)
{
	if (typeof (text) !== "string") {
		figma.ui.postMessage({type: "search_result", data: {recent: recentList}});
		return;
	}

	const query = text.toLowerCase().trim();
	if (!query) {
		figma.ui.postMessage({type: "search_result", data: {recent: recentList}});
		return;
	}

	const pages = [];

	findPages(pages, figma.root as any, query);

	stat.time = Date.now();
	stat.nodes = 0;

	const layers = [];

	for (let page of figma.root.children) {
		findFrames(layers, page, page, query);
	}

	console.log(`time: ${Date.now() - stat.time}ms, nodes: ${stat.nodes}`);

	figma.ui.postMessage({type: "search_result", data: {pages, layers}});
}

const documentKey = figma.root.name;
const storageVersion = 1;
let recentList: ItemData[] = [];

function onOpen(data: ItemData, close: boolean)
{
	if (data.type === "PAGE") {
		const page = figma.root.findChild(it => it.id === data.id);
		if (!page) {
			return;
		}
		figma.currentPage = page;
		addToRecent(data, close);
	} else {
		const page = figma.root.findChild(it => it.id === data.pg_id);
		if (!page) {
			return;
		}
		figma.currentPage = page;
		const node = page.findChild(it => it.id === data.id);
		if (node) {
			figma.currentPage.selection = [node];
			figma.viewport.scrollAndZoomIntoView([node]);
			addToRecent(data, close);
		}
	}
}

function addToRecent(data: ItemData, closePlugin = false)
{
	const recentIndex = recentList.findIndex(it => it.id === data.id);
	if (recentIndex >= 0) {
		recentList.splice(recentIndex, 1);
	}
	recentList.unshift(data);
	saveData(() => {
		if (closePlugin) {
			figma.closePlugin();
		}
	});
}

function saveData(callback: () => void)
{
	const storageData: StorageData = {
		version: storageVersion,
		recent: recentList,
		settings,
	};
	figma.clientStorage
		.setAsync(documentKey, storageData)
		.then(callback);
}

figma.clientStorage.getAsync(documentKey).then((result: StorageData) => {
	if (result?.version !== storageVersion) {
		return;
	}
	recentList = result.recent ?? [];
	settings.width = result.settings?.width ?? settings.width;
	settings.height = result.settings?.height ?? settings.height;

	const data: IData = {
		recent: recentList,
	};

	showUI();
	figma.ui.postMessage({type: "search_result", data});
	figma.ui.postMessage({type: "settings", settings});
});

function showUI()
{
	figma.showUI(__html__, {
		themeColors: true,
		width: settings.width,
		height: settings.height,
		visible: true,
	});
}

interface IData
{
	pages?: ItemData[];
	layers?: ItemData[];
	recent?: ItemData[];
}

