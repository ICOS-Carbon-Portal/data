// Data value column is added to the end at runtime
const columnsToFetch = ['TIMESTAMP', 'Flag'];

export default {
	columnsToFetch,
	columnIndexes: {
		ts: columnsToFetch.indexOf('TIMESTAMP'),
		flag: columnsToFetch.indexOf('Flag'),
		val: columnsToFetch.length
	}
};
