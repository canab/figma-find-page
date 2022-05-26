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

		case "close":
			figma.closePlugin();
			break;
	}

//	if (msg.type === "create-rectangles") {
//		const nodes: SceneNode[] = [];
//		for (let i = 0; i < msg.count; i++) {
//			const rect = figma.createRectangle();
//			rect.x = i * 150;
//			rect.fills = [{type: "SOLID", color: {r: 1, g: 0.5, b: 0}}];
//			figma.currentPage.appendChild(rect);
//			nodes.push(rect);
//		}
//		figma.currentPage.selection = nodes;
//		figma.viewport.scrollAndZoomIntoView(nodes);
//	}

	// Make sure to close the plugin when you're done. Otherwise, the plugin will
	// keep running, which shows the cancel button at the bottom of the screen.
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
	if (page)
		figma.currentPage = page;
}