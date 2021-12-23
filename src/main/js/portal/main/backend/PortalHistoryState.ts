import IndexedDB, {IndexedDBProps} from "./IndexedDB";
import {StateSerialized} from "../models/State";
import config from "../config";

const sessionKey = config.portalHistoryStateProps.dbName;
const sessionValue = config.portalHistoryStateProps.storeName;
const signalQuestion = "?";
const signalReply = "!";

export default class PortalHistoryState{
	private readonly idb?: IndexedDB;
	private isIdbInitialized: boolean = false;

	constructor(props: IndexedDBProps) {
		this.idb = IndexedDB.isIndexedDbAvailable
			? new IndexedDB(props)
			: undefined;

		if (this.idb !== undefined){
			this.registerTabSync();
			this.init(this.idb);
		}
	}

	private registerTabSync(){
		window.addEventListener('storage', storageTransfer, false);

		if (isSessionStorageEmpty()) {
			signalViaLocalStorage(signalQuestion);
			setTimeout(() => this.cleanUpIndexedDB(), 400);
		}
	}

	private async init(idb: IndexedDB){
		const isIdbInitialized = await idb.init();
		this.isIdbInitialized = isIdbInitialized;
	}

	private cleanUpIndexedDB(){
		// Check sessionStorage again. It might have been set when other tab answered question.
		if (isSessionStorageEmpty()) {
			this.clearStore();
			// this.prune(12 * 3600 * 1000);
			sessionStorage.setItem(sessionKey, sessionValue);
		}
	}

	private async prune(maxAge: number){
		if (this.idb === undefined)
			return;

		const keys = await this.idb.getAllKeys() ?? [];
		const now = Date.now();

		keys.forEach(async key => {
			const state = await this.idb!.getValue<StateSerialized>(key);
			const ts = state?.ts ?? now;

			if (now - ts > maxAge)
				this.deleteState(key);
		});
	}

	getState(): Promise<StateSerialized | undefined> {
		if (this.idb === undefined){
			return Promise.resolve(history.state);
		} else {
			return this.idb.getValue<StateSerialized>(history.state);
		}
	}

	async pushState(state: StateSerialized, url: string): Promise<IDBValidKey | undefined>  {
		if (this.idb === undefined){
			history.pushState(state, '', url);
		} else {
			history.pushState(url, '', url);
			return this.idb.addValue({...state, url});
		}
	}

	async replaceState(state: StateSerialized, url: string): Promise<IDBValidKey | undefined>  {
		if (this.idb === undefined){
			history.replaceState(state, '', url);

		} else {
			history.replaceState(url, '', url);
			return this.idb.addValue({...state, url});
		}
	}

	deleteState(key: IDBValidKey){
		if (this.idb === undefined)
			return;
		
		this.idb.deleteValue(key);
	}

	clearStore() {
		if (this.idb !== undefined)
			this.idb.clearStore();
	}
}

const isSessionStorageEmpty = () => sessionStorage.getItem(sessionKey) === null;

const signalViaLocalStorage = (message: string) => {
	localStorage.setItem(sessionKey, message);
	localStorage.removeItem(sessionKey);
};

const storageTransfer = (event: StorageEvent) => {
	// Use localStorage to signal between tabs/windows
	const {key, newValue} = event;

	if (!newValue) return;
	
	if (key === sessionKey && newValue === signalQuestion) {
		// Tab/window ask
		signalViaLocalStorage(signalReply);
	}

	if (key === sessionKey && newValue === signalReply) {
		// Tab/window replied
		sessionStorage.setItem(sessionKey, sessionValue);
	}
};
