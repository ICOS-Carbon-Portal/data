import BinTable from './models/BinTable.js';
import Backend from './Backend.js';
import React from 'react';
import ReactDom from 'react-dom';
import {LineChart} from 'react-d3-basic';
import {createStore} from 'redux';

//var Chart = require('react-d3-core').Chart;

function handleError(error){
	console.log(error);
}

const requests = [[0,1]].map(cols => {
	return {
		"tableId": "aaaaaaaaaaaaaaaaaaaaaa01",
		"schema": {
			"columns": ["INT", "FLOAT", "DOUBLE"],
			"size": 344
		},
		"columnNumbers": cols
	};
});

function computeNextState(oldState = {reqNum: 0}, action){
	switch(action.type){
		case 'FETCHNEXT':
			const reqNum = oldState.reqNum;
			const tblRequest = requests[reqNum];
			Backend.getBinaryTable(
				tblRequest,
				tbl => {
					const schema = {
						columns: tblRequest.columnNumbers.map(i => tblRequest.schema.columns[i]),
						size: tblRequest.schema.size
					};
					const binTable = new BinTable(tbl, schema);
					console.log(`Fetched request ${reqNum} successfully!`);
					console.log(`Fetched ${binTable.length} rows`);
					console.log(`Fetched columns: ${binTable.nCols}`);
					console.log('First value is  ' + binTable.column(0).value(0));

					let data = [];
					for (let i=0; i<binTable.column(0).length; i++) {
						data.push({X: binTable.column(0).value(i), Y: binTable.column(1).value(i)});
						//console.log(i +  " - " + binTable.column(0).value(i));
					}

					console.log(data);

					//for (let i=0; i<binTable.column(1).length; i++) {
					//	console.log(i +  " - " + binTable.column(1).value(i));
					//}
				},
				handleError
			);
			return {reqNum: (reqNum + 1) % requests.length};
		default:
			return oldState;
	}
}

const store = createStore(computeNextState);

function fetchData(){
	store.dispatch({type: 'FETCHNEXT'});
}

ReactDom.render(
	<div>
		<button onClick={fetchData}>Fetch!</button>
	</div>,
	document.getElementById('main')
);

