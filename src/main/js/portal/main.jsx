import BinTable from './models/BinTable.js';


function handleError(error){
	console.log(error);
}


let requests = [[0]].map(cols => {
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
			let reqNum = oldState.reqNum;
			let tblRequest = requests[reqNum];
			Backend.getBinaryTable(
				tblRequest,
				tbl => {
					let binTable = new BinTable(tbl, tblRequest.schema, tblRequest.columnNumbers);
					console.log(`Fetched request ${reqNum} successfully!`);
					console.log(`Fetched ${binTable.length} rows`);
					console.log('First value is ' + binTable.column(0).value(0));
				},
				err => console.log(err)
			);
			return {reqNum: (reqNum + 1) % requests.length};
		default:
			return oldState;
	}
}

let store = Redux.createStore(computeNextState);

let Backend = require('./Backend.js');

function fetchData(){
	store.dispatch({type: 'FETCHNEXT'});
}

React.render(
	<div>
		<button onClick={fetchData}>Fetch!</button>
	</div>,
	document.getElementById('main')
);

