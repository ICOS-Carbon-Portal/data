import {Dict} from "../../../common/main/types";

interface IndexedDBIndex {
	indexName: string
		keyPath: string
		isUnique: boolean
}
export interface IndexedDBOptions {
	keyPath?: string
	indexes?: IndexedDBIndex[]
}
export interface IndexedDBProps {
	dbName: string
	storeName: string
	version: number
	options: IndexedDBOptions
}
export default class IndexedDB{
	private db?: IDBDatabase;
	private dbName: string;
	private storeName: string;
	private version: number;
	private options: IndexedDBOptions;

	constructor({dbName, storeName, version, options}: IndexedDBProps) {
		this.dbName = dbName;
		this.storeName = storeName;
		this.version = version;
		this.options = options;
	}

	init(): Promise<boolean>{
		if (!IndexedDB.isIndexedDbAvailable)
			return Promise.resolve(false);

		return this.createDB().then(
			createdDB => {
				this.db = createdDB;
				return Promise.resolve(true);
			},
			_ => Promise.resolve(false)
		);
	}

	static get isIndexedDbAvailable() {
		return 'indexedDB' in window;
	}

	private createDB(): Promise<IDBDatabase> {
		const {dbName, storeName, version, options, createStore} = this;

		return new Promise(function(resolve, reject) {
			const request = window.indexedDB.open(dbName, version);

			request.onupgradeneeded = function(event) {
				const {oldVersion, newVersion} = event;
				const {keyPath, indexes = []} = options;
				const storeParams: IDBObjectStoreParameters = {keyPath};

				const idb = request.result;

				if (newVersion !== null && oldVersion > 0 && newVersion > oldVersion && idb.objectStoreNames.contains(storeName))
					idb.deleteObjectStore(storeName);
				
				createStore(idb, storeName, storeParams, indexes);
			}

			request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result)

			request.onerror = () => reject(`Could not open database due to ${request.error}`);
		});
	}

	private createStore(db: IDBDatabase, storeName: string, storeParams: IDBObjectStoreParameters, indexes: IndexedDBIndex[]){
		const objectStore = db.createObjectStore(storeName, storeParams);

		indexes.forEach(idx =>
			objectStore.createIndex(idx.indexName, idx.keyPath, {unique: idx.isUnique})
		);
	}

	getValue<T>(key: IDBValidKey): Promise<T | undefined> {
		const {db, storeName} = this;

		if (db === undefined)
			return Promise.reject("Database is not initialized (happened in getValue)");

		return new Promise(function(resolve, reject) {
			const trans = db.transaction(storeName, "readonly");
			const store = trans.objectStore(storeName);
			const request = store.get(key);

			trans.onerror = () => reject(`Transaction not opened due to ${trans.error}`);

			request.onsuccess = () => resolve(request.result);

			request.onerror = () => reject(`Could not get value due to ${request.error}`);
		});
	}

	addValue(value: Dict<any>): Promise<IDBValidKey> {
		const {db, storeName} = this;

		if (db === undefined)
			return Promise.reject("Database is not initialized (happened in addValue)");

		return new Promise(function(resolve, reject) {
			const trans = db.transaction(storeName, "readwrite");
			const store = trans.objectStore(storeName);
			const request = store.put(value);

			trans.onerror = () => reject(`Transaction not opened due to ${trans.error}`);

			request.onsuccess = () => resolve(request.result);

			request.onerror = () => reject(`Could not put value due to ${request.error}`);
		});
	}

	deleteValue(key: IDBValidKey): Promise<boolean>{
		const {db, storeName} = this;

		if (db === undefined)
			return Promise.reject("Database is not initialized (happened in deleteValue)");
		
		return new Promise(function(resolve, reject) {
			const trans = db.transaction(storeName, "readwrite");
			const store = trans.objectStore(storeName);
			const request = store.delete(key);

			trans.onerror = () => reject(`Transaction not opened due to ${trans.error}`);

			request.onsuccess = () => resolve(true);

			request.onerror = () => reject(`Could not put value due to ${request.error}`);
		});
	}

	clearStore(){
		const {db, storeName} = this;

		if (db === undefined)
			return;

		if (db.objectStoreNames.contains(storeName)) {
			const trans = db.transaction(storeName, "readwrite");
			const store = trans.objectStore(storeName);
			const request = store.clear();

			trans.onerror = () => `Transaction not opened due to ${trans.error}`;

			request.onsuccess = () => request.result;

			request.onerror = () => `Could not clear store due to ${request.error}`;
		}
	}

	getKeyPath(db: IDBDatabase, storeName: string): string | string[] {
		if (db === undefined)
			return "Database is not initialized (happened in getKeyPath)";

		const trans = db.transaction(storeName, "readonly");
		const store = trans.objectStore(storeName);
		return store.keyPath;
	}

	getAllKeys(): Promise<IDBValidKey[]> {
		const {db, storeName} = this;

		if (db === undefined)
			return Promise.reject("Database is not initialized (happened in getAllKeys)");

		return new Promise(function(resolve, reject) {
			const trans = db.transaction(storeName, "readonly");
			const store = trans.objectStore(storeName);
			const request = store.getAllKeys();

			trans.onerror = () => reject(`Transaction not opened due to ${trans.error}`);

			request.onsuccess = () => resolve(request.result);

			request.onerror = () => reject(`Could not get all keys due to ${request.error}`);
		});
	}
}
