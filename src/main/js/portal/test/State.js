import stateUtils, {defaultState} from '../src/main/models/State';
import {fetchBootstrapData} from '../src/main/backend';
import 'isomorphic-fetch';
import flatMap from 'array.prototype.flatmap';
import deepEqual from 'deep-equal';
import CompositeSpecTable from "../src/main/models/CompositeSpecTable";


const hash = encodeURIComponent('{"filterCategories":{"level":[2],"theme":["atmosphere"],"type":["atcCo2L2DataObject"]},"filterTemporal":{"df":"1960-01-01","dt":"2019-01-11","sf":"1960-01-01","st":"2019-01-01"},"filterPids":["-xQ2wgAt-ZjdGaCEJnKQIEIu"],"filterNumbers":[{"cat":"samplingHeight","txt":"5"},{"cat":"fileSize","txt":">5000"}],"page":1}');

flatMap.shim();

describe("Testing State", () => {

	let originalTimeout;

	beforeEach(() => {
		originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
	});

	afterEach(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
	});

	it("produces a state object from an empty hash", () => {

		const state = defaultState;
		const stateFromHash = stateUtils.update(state, stateUtils.getStateFromHash(''));

		state.ts = undefined;
		stateFromHash.ts = undefined;

		expect(deepEqual(state, stateFromHash, {strict: true})).toBe(true);
	});

	it("produces a state object from a hash", () => {

		const state = defaultState;
		const stateFromHash = stateUtils.update(state, stateUtils.getStateFromHash(hash));

		expect(deepEqual(state, stateFromHash, {strict: true})).toBe(false);
		Object.keys(stateFromHash).forEach(key => {
			if (key !== 'route') {
				expect(state.hasOwnProperty(key)).toBe(true, `key=${key}`);
			}
		});
	});

	it("produces a correct round trip from hash -> state -> hash", () => {

		const state = defaultState;
		const stateFromHash = stateUtils.update(state, stateUtils.getStateFromHash(hash));
		const newHash = stateUtils.stateToHash(stateFromHash);

		expect(decodeURIComponent(hash)).toBe(newHash);
	});

	it("produces a correct round trip from URI -> shortened URI -> URI", (done) => {

		fetchBootstrapData([]).then(
			allTables => {
				const specTable = new CompositeSpecTable.deserialize(allTables.specTables);
				const categories = {};
				specTable.tables.forEach(tbl => {
					tbl.names.forEach(colName => categories[colName] = new Set())
				});

				specTable.tables.forEach(tbl => {
					tbl.rows.forEach(row=> {
						tbl.names.forEach(colName => {
							if (row[colName] !== undefined && !Number.isInteger(row[colName]) && row[colName].startsWith('http')) {
								categories[colName].add(row[colName]);
							}
						});
					});
				});

				const filterCategories = Object.keys(categories).reduce((acc, key) => {
					if (categories[key].size > 0) {
						acc[key] = Array.from(categories[key]);
					}
					return acc;
				}, {});

				Object.keys(filterCategories).forEach(colName => {
					const original = {
						filterCategories: {[colName]: filterCategories[colName]}
					};

					let extended;

					try {
						extended = stateUtils.extendUrls(stateUtils.shortenUrls(original));
					} catch (e) {
						done.fail(e.message);
						return;
					}

					Object.keys(original.filterCategories).forEach(colName => {
						original.filterCategories[colName].forEach((uri, idx) => {
							expect(uri).toBe(extended.filterCategories[colName][idx]);
							done();
						});
					});
				});
			}
		);
	});

});
