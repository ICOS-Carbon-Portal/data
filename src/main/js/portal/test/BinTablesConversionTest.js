import BinTable from '../main/models/BinTable';
//import {binTables2Dygraph} from '../main/models/chartDataMaker';

describe("binTables conversion", function() {

	it("parses a single binTable", function() {

		const bytes = new ArrayBuffer(4 * 2 * 8);
		const view = new DataView(bytes);

		['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'].forEach((date, i) => {
			const millis = Date.parse(date);
			view.setFloat64(i * 8, millis, false);
			view.setFloat64((i + 4) * 8, i + 1, false);
		});
		const schema = {
			columns: ['DOUBLE', 'DOUBLE'],
			size: 4
		};

		const binTable = new BinTable(bytes, schema);

		expect(binTable.length).toEqual(4);
		expect(binTable.nCols).toEqual(2);
		expect(binTable.column(1).value(0)).toEqual(1);

	});
});
