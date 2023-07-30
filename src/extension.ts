import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
let url: any;
let xsrfToken: any;
let sensediaAuth: any;


async function solicitCredentials() {
    url = await vscode.window.showInputBox({
        prompt: 'Enter the URL:',
		placeHolder:"https://manager-demov3.sensedia.com",
        ignoreFocusOut: true,
    });

    xsrfToken = await vscode.window.showInputBox({
        prompt: 'Enter the XSRF Token:',
		placeHolder:"xxxxxxxxxxxxxxxxxxxxx",
        ignoreFocusOut: true,
    });

    sensediaAuth = await vscode.window.showInputBox({
        prompt: 'Enter the Sensedia Auth:',
		placeHolder:"xxxxxxxxxxxxxxxxxxxxx",
        ignoreFocusOut: true,
    });
}

async function buscaComAnimacao() {
	await solicitCredentials();
	// Mostra a animação de progresso enquanto faz a busca
	return vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification, // Onde a barra de progresso será exibida
		title: 'Buscando...', // Título da barra de progresso
		cancellable: true // Define se é possível cancelar a tarefa
	}, async (progress, token) => {
		// Executa a busca
		const resultado = await createApiFolders();;
		// Atualiza a mensagem da barra de progresso
		progress.report({ message: 'Busca concluída!' });
		return resultado;
	});
}

// Exemplo de como usar a busca com animação
async function run() {
	try {
		const resultado = await buscaComAnimacao();
		vscode.window.showInformationMessage(`Resultado: ${resultado}`);
	} catch (error) {
		vscode.window.showErrorMessage('Ocorreu um erro durante a busca.');
	}
}

const createFolderRecursively = (dirPath: string) => {
	const parts = dirPath.split(path.sep);
	for (let i = 1; i <= parts.length; i++) {
		const currentPath = path.join(...parts.slice(0, i));
		if (!fs.existsSync(currentPath)) {
			fs.mkdirSync(currentPath);
		}
	}
};

const fetchApis = async () => {
	const endpoint = `${url}/api-manager/api/v3/apis`;
	const headers = {
		'XSRF-TOKEN': xsrfToken,
		'Sensedia-Auth': sensediaAuth,
	};

	try {
		const response = await axios.get(endpoint, { headers });
		return response.data;
	} catch (error) {
		vscode.window.showErrorMessage('Erro ao obter a lista de APIs.');
		return [];
	}
};

const fetchApiById = async (id: number) => {
	const endpoint = `${url}/api-manager/api/v3/apis/${id}`;
	const headers = {
		'XSRF-TOKEN': xsrfToken,
		'Sensedia-Auth': sensediaAuth,
	};

	try {
		const response = await axios.get(endpoint, { headers });
		return response.data;
	} catch (error) {
		vscode.window.showErrorMessage(`Erro ao obter a API com ID ${id}.`);
		return null;
	}
};

const createApiFolders = async () => {
  	
	const apis = await fetchApis();
	for (const api of apis) {
		const apiId = api.id;
		const interceptorData = await fetchApiById(apiId);
		if (interceptorData) {
			for (const resources of interceptorData.lastRevision.resources) {
				for (const operation of resources.operations) {
					const operationName = `${operation.method.toLowerCase()}${operation.path.replace(/\//g, '-')}`;
					operation.interceptors.forEach((i: any) => {
						try {
							if (i.type === "Custom") {
								const apiName = api.name.replace(/\s/g, '-').toLowerCase();
								const apiFolderPath = path.join(vscode.workspace.rootPath || '', 'API', apiName);
								createFolderRecursively(apiFolderPath);
								const resourcesFolderPath = path.join(apiFolderPath, resources.name);
								createFolderRecursively(resourcesFolderPath);
								const operationFolderPath = path.join(resourcesFolderPath, operationName);
								createFolderRecursively(operationFolderPath);
								let parsedContent = JSON.parse(i.content);
								const interceptorName = `${parsedContent.name}`.replace(/\s/g, '-').toLowerCase();
								const interceptorContent = parsedContent.script;
								if (i.executionPoint == "FIRST") {
									const flowRequestPath = path.join(operationFolderPath, "Request");
									createFolderRecursively(flowRequestPath);
									const interceptorFilePath = path.join(flowRequestPath, `${i.position}-${interceptorName}.js`);
									fs.writeFileSync(interceptorFilePath, interceptorContent);
								} else {
									const flowResponsePath = path.join(operationFolderPath, "Response");
									createFolderRecursively(flowResponsePath);
									const interceptorFilePath = path.join(flowResponsePath, `${i.position}-${interceptorName}.js`);
									fs.writeFileSync(interceptorFilePath, interceptorContent);
								}
								parsedContent = null;
							}
							else {
								const apiName = api.name.replace(/\s/g, '-').toLowerCase();
								const apiFolderPath = path.join(vscode.workspace.rootPath || '', 'API', apiName);
								createFolderRecursively(apiFolderPath);
								const resourcesFolderPath = path.join(apiFolderPath, resources.name);
								createFolderRecursively(resourcesFolderPath);
								const operationFolderPath = path.join(resourcesFolderPath, operationName);
								createFolderRecursively(operationFolderPath);
								const interceptorName = `${i.type}`;
								const interceptorContent = i.content;
								if (i.executionPoint == "FIRST") {
									const flowRequestPath = path.join(operationFolderPath, "Request");
									createFolderRecursively(flowRequestPath);
									const interceptorFilePath = path.join(flowRequestPath, `${i.position}-${interceptorName}.json`);
									fs.writeFileSync(interceptorFilePath, interceptorContent);
								} else {
									const flowResponsePath = path.join(operationFolderPath, "Response");
									createFolderRecursively(flowResponsePath);
									const interceptorFilePath = path.join(flowResponsePath, `${i.position}-${interceptorName}.json`);
									fs.writeFileSync(interceptorFilePath, interceptorContent);
								}
							}
						} catch (error) {
							console.log(error);
						}
					});
				}

			}

		}
	}
};

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('extension.generateApiFolders', () => {
		
		buscaComAnimacao();
	});
	context.subscriptions.push(disposable);
}

export function deactivate() { }
