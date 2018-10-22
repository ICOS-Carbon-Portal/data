import State, {getStateFromHash, stateToHash, managePrefixes} from '../src/main/models/State';
import {fetchAllSpecTables} from '../src/main/backend';
import 'isomorphic-fetch';
import deepEqual from 'deep-equal';
import CompositeSpecTable from "../src/main/models/CompositeSpecTable";


const hash = '{"filterCategories"%3A{"level"%3A[2]%2C"theme"%3A["atmosphere"]%2C"type"%3A["atcCo2L2DataObject"]}%2C"filterTemporal"%3A{"df"%3A"1960-01-01"%2C"dt"%3A"2019-01-11"%2C"sf"%3A"1960-01-01"%2C"st"%3A"2019-01-01"}%2C"filterFreeText"%3A{"pids"%3A["-xQ2wgAt-ZjdGaCEJnKQIEIu"]}%2C"page"%3A1}';

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

		const state = new State();
		const stateFromHash = state.update(getStateFromHash(''));
		delete stateFromHash.route;

		expect(deepEqual(state, stateFromHash, {strict: true})).toBe(true);
	});

	it("produces a state object from a hash", () => {

		const state = new State();
		const stateFromHash = state.update(getStateFromHash(hash));

		expect(deepEqual(state, stateFromHash, {strict: true})).toBe(false);
		Object.keys(stateFromHash).forEach(key => {
			if (key !== 'route') {
				expect(state.hasOwnProperty(key)).toBe(true, `key=${key}`);
			}
		});
	});

	it("produces a correct round trip from hash -> state -> hash", () => {

		const state = new State();
		const stateFromHash = state.update(getStateFromHash(hash));
		const newHash = stateToHash(stateFromHash);

		expect(decodeURIComponent(hash)).toBe(newHash);
	});

	it("produces a correct round trip from URI -> shortened URI -> URI", (done) => {

		fetchAllSpecTables().then(
			allTables => {
				const specTable = new CompositeSpecTable(allTables.specTables);

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
						extended = managePrefixes(managePrefixes(original));
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