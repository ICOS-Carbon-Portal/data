import BinTable from '../main/models/BinTable';
import {binTables2Dygraph} from '../main/models/chartDataMaker';

var createBinTable = function(dates){
	const bytes = new ArrayBuffer(dates.length * 2 * 8);
	const view = new DataView(bytes);

	dates.forEach((date, i) => {
		const millis = Date.parse(date);
		view.setFloat64(i * 8, millis, false);
		view.setFloat64((i + dates.length) * 8, i, false);
	});

	const schema = {
		columns: ['DOUBLE', 'DOUBLE'],
		size: dates.length
	};

	return new BinTable(bytes, schema);
}

function debug(data){
	console.log(JSON.stringify(data));
}

describe("binTables conversion of non broken data (no NaN values)", function() {

	it("parses a single binTable", function () {

		const dates = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const binTable = createBinTable(dates);
		const data = binTables2Dygraph([binTable]);

		data.map((dataPoint, i) => {
			expect(dataPoint[0].getTime()).toBe(new Date(dates[i]).getTime());
			expect(dataPoint[1]).toBe(i);
		});

	});

	it("parses two binTables having the same dates", function () {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		data.map((dataPoint, i) => {
			expect(dataPoint[0].getTime()).toBe(new Date(dates1[i]).getTime());
			expect(dataPoint[1]).toBe(i);
			expect(dataPoint[2]).toBe(i);
		});

	});

	it("parses two binTables, having the same dates, starting at the same time and second serie is shorter", function () {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = ['2016-01-01', '2016-01-02', '2016-01-03'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		data.map((dataPoint, i) => {
			expect(dataPoint[0].getTime()).toBe(new Date(dates1[i]).getTime());
			expect(dataPoint[1]).toBe(i);
			if (i < data.length - 1) {
				expect(dataPoint[2]).toBe(i);
			} else {
				expect(dataPoint[2]).toBe(null);
			}
		});

	});

	it("parses two binTables, having the same dates, second serie is shorter and ending at the same time", function () {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = ['2016-01-02', '2016-01-03', '2016-01-04'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		data.map((dataPoint, i) => {
			expect(dataPoint[0].getTime()).toBe(new Date(dates1[i]).getTime());
			expect(dataPoint[1]).toBe(i);
			if (i > 0) {
				expect(dataPoint[2]).toBe(i - 1);
			} else {
				expect(dataPoint[2]).toBe(null);
			}
		});

	});

	it("parses two binTables, having the same dates, second serie is shorter and does not start and end at the same date", function () {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = ['2016-01-02', '2016-01-03'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		data.map((dataPoint, i) => {
			expect(dataPoint[0].getTime()).toBe(new Date(dates1[i]).getTime());
			expect(dataPoint[1]).toBe(i);
		});

		expect(data[0][2]).toBe(null);
		expect(data[1][2]).toBe(0);
		expect(data[2][2]).toBe(1);
		expect(data[3][2]).toBe(null);

	});

});

describe("binTables conversion of broken data (including NaN values)", function() {

	it("parses a single binTable with NaN value in the beginning", function () {

		const dates = [NaN, '2016-01-02', '2016-01-03', '2016-01-04'];
		const binTable = createBinTable(dates);
		const data = binTables2Dygraph([binTable]);

		expect(data[0][1]).toBe(1);
		expect(data[1][1]).toBe(2);
		expect(data[2][1]).toBe(3);

	});

	it("parses a single binTable with NaN value in the middle", function () {

		const dates = ['2016-01-01', NaN, '2016-01-03', '2016-01-04'];
		const binTable = createBinTable(dates);
		const data = binTables2Dygraph([binTable]);

		expect(data[0][1]).toBe(0);
		expect(data[1][1]).toBe(2);
		expect(data[2][1]).toBe(3);

	});

	it("parses a single binTable with NaN value in the end", function () {

		const dates = ['2016-01-01', '2016-01-02', '2016-01-03', NaN];
		const binTable = createBinTable(dates);
		const data = binTables2Dygraph([binTable]);

		expect(data[0][1]).toBe(0);
		expect(data[1][1]).toBe(1);
		expect(data[2][1]).toBe(2);

	});

	it("parses two binTables with same dates but NaN value at start of second serie", function() {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = [NaN, '2016-01-02', '2016-01-03', '2016-01-04'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates1[3]).getTime());

		expect(data[0][1]).toBe(0);
		expect(data[1][1]).toBe(1);
		expect(data[2][1]).toBe(2);
		expect(data[3][1]).toBe(3);

		expect(data[0][2]).toBe(null);
		expect(data[1][2]).toBe(1);
		expect(data[2][2]).toBe(2);
		expect(data[3][2]).toBe(3);
	});

	it("parses two binTables with same dates but NaN value inside of second serie", function() {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = ['2016-01-01', '2016-01-02', NaN, '2016-01-04'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates1[3]).getTime());

		expect(data[0][1]).toBe(0);
		expect(data[1][1]).toBe(1);
		expect(data[2][1]).toBe(2);
		expect(data[3][1]).toBe(3);

		expect(data[0][2]).toBe(0);
		expect(data[1][2]).toBe(1);
		expect(data[2][2]).toBe(null);
		expect(data[3][2]).toBe(3);
	});

	it("parses two binTables with same dates but NaN value at end of second serie", function() {

		const dates1 = ['2016-01-01', '2016-01-02', '2016-01-03', '2016-01-04'];
		const dates2 = ['2016-01-01', '2016-01-02', '2016-01-03', NaN];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates1[3]).getTime());

		expect(data[0][1]).toBe(0);
		expect(data[1][1]).toBe(1);
		expect(data[2][1]).toBe(2);
		expect(data[3][1]).toBe(3);

		expect(data[0][2]).toBe(0);
		expect(data[1][2]).toBe(1);
		expect(data[2][2]).toBe(2);
		expect(data[3][2]).toBe(null);
	});
});

describe("binTables conversion of non broken data (no NaN values) with non matching dates", function() {

	it("parses two binTables with same amount of dates", function() {

		const dates1 = ['2016-01-01', '2016-02-02', '2016-03-03', '2016-04-04'];
		const dates2 = ['2016-01-02', '2016-02-03', '2016-03-04', '2016-04-05'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length + dates2.length);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates2[0]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates2[1]).getTime());
		expect(data[4][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[5][0].getTime()).toBe(new Date(dates2[2]).getTime());
		expect(data[6][0].getTime()).toBe(new Date(dates1[3]).getTime());
		expect(data[7][0].getTime()).toBe(new Date(dates2[3]).getTime());

	});

	it("parses two binTables with different amount of dates (gap in the beginning for second serie)", function() {

		const dates1 = ['2016-01-01', '2016-02-02', '2016-03-03', '2016-04-04'];
		const dates2 = ['2016-02-03', '2016-03-04', '2016-04-05'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length + dates2.length);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates2[0]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[4][0].getTime()).toBe(new Date(dates2[1]).getTime());
		expect(data[5][0].getTime()).toBe(new Date(dates1[3]).getTime());
		expect(data[6][0].getTime()).toBe(new Date(dates2[2]).getTime());

	});

	it("parses two binTables with different amount of dates (gap in the end for second serie)", function() {

		const dates1 = ['2016-01-01', '2016-02-02', '2016-03-03', '2016-04-04'];
		const dates2 = ['2016-01-02', '2016-02-03'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(dates1.length + dates2.length);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates2[0]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates2[1]).getTime());
		expect(data[4][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[5][0].getTime()).toBe(new Date(dates1[3]).getTime());

	});

});

describe("binTables conversion of broken data (including NaN values) with non matching dates", function() {

	it("parses two binTables with same amount of dates (NaN in the beginning)", function() {

		const dates1 = ['2016-01-01', '2016-02-02', '2016-03-03', '2016-04-04'];
		const dates2 = [NaN, '2016-02-03', '2016-03-04', '2016-04-05'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(7);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates2[1]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[4][0].getTime()).toBe(new Date(dates2[2]).getTime());
		expect(data[5][0].getTime()).toBe(new Date(dates1[3]).getTime());
		expect(data[6][0].getTime()).toBe(new Date(dates2[3]).getTime());

	});

	it("parses two binTables with same amount of dates (NaN in the middle)", function() {

		const dates1 = ['2016-01-01', '2016-02-02', '2016-03-03', '2016-04-04'];
		const dates2 = ['2016-01-02', '2016-02-03', NaN, '2016-04-05'];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(7);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates2[0]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates2[1]).getTime());
		expect(data[4][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[5][0].getTime()).toBe(new Date(dates1[3]).getTime());
		expect(data[6][0].getTime()).toBe(new Date(dates2[3]).getTime());

	});

	it("parses two binTables with same amount of dates (NaN in the end)", function() {

		const dates1 = ['2016-01-01', '2016-02-02', '2016-03-03', '2016-04-04'];
		const dates2 = ['2016-01-02', '2016-02-03', '2016-03-04', NaN];

		const binTable1 = createBinTable(dates1);
		const binTable2 = createBinTable(dates2);
		const data = binTables2Dygraph([binTable1, binTable2]);

		expect(data.length).toEqual(7);

		expect(data[0][0].getTime()).toBe(new Date(dates1[0]).getTime());
		expect(data[1][0].getTime()).toBe(new Date(dates2[0]).getTime());
		expect(data[2][0].getTime()).toBe(new Date(dates1[1]).getTime());
		expect(data[3][0].getTime()).toBe(new Date(dates2[1]).getTime());
		expect(data[4][0].getTime()).toBe(new Date(dates1[2]).getTime());
		expect(data[5][0].getTime()).toBe(new Date(dates2[2]).getTime());
		expect(data[6][0].getTime()).toBe(new Date(dates1[3]).getTime());

	});

});
