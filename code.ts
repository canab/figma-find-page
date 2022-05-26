// This shows the HTML page in "ui.html".
figma.showUI(__html__);

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

function onInput(text: unknown)
{
	console.log({text});

	if (typeof (text) !== "string") {
		figma.ui.postMessage({type: "search_result", nodes: []});
		return;
	}

	const query = text.toLowerCase().trim();
	if (!query) {
		figma.ui.postMessage({type: "search_result", nodes: []});
		return;
	}

	const doc = figma.currentPage.parent;
	const result = [];
	for (let node of doc.children) {
		if (node.type === "PAGE" as any) {
			if (node.name.toLowerCase().includes(query)) {
				const data: ItemData = {id: node.id, name: node.name};
				result.push(data);
			}
		}
	}

	figma.ui.postMessage({type: "search_result", nodes: result});
}

function onOpen(data: ItemData)
{
	const page = figma.root.findChild(it => it.id === data.id);
	if (page) {
		figma.currentPage = page;
		figma.closePlugin();
	}
}