import {BinTable} from '../../../main/js/portal/models/BinTable';
import {binTables2Dygraph} from '../../../main/js/portal/models/chartDataMaker';

describe("binTables conversion", function() {

	it("parses a single binTable", function(done) {

		const bytes = new ArrayBuffer(4 * 2 * 8);
		const doubles = new Float64Array(bytes);

		['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'].forEach((date, i) => {
			const millis = Date.parse(date);
			doubles[i] = millis;
		});
		[1,2,3,4].forEach((value, i) => doubles[4 + i] = value);
		const schema = {
			columns: ['DOUBLE', 'DOUBLE'],
			size: 4
		};

		const binTable = new BinTable(bytes, schema);

		const data = [
			[Date.parse('2016-01-01'), Date.parse('2016-01-02'), Date.parse('2016-01-03'), Date.parse('2016-01-04')],
			[1,2,3,4]
		];

	});
});