import State, {getStateFromHash, stateToHash} from '../src/main/models/State';
import deepEqual from 'deep-equal';


const hash = '{"filterCategories"%3A{"level"%3A[2]%2C"theme"%3A["atmosphere"]%2C"type"%3A["atcCo2L2DataObject"]}%2C"filterTemporal"%3A{"df"%3A"1960-01-01"%2C"dt"%3A"2019-01-11"%2C"sf"%3A"1960-01-01"%2C"st"%3A"2019-01-01"}%2C"filterFreeText"%3A{"pids"%3A["-xQ2wgAt-ZjdGaCEJnKQIEIu"]}%2C"page"%3A1}';

describe("Testing State", () => {

	it("produces a state object from an empty hash", () => {

		const state = new State();
		const stateFromHash = state.update(getStateFromHash(''));

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

});