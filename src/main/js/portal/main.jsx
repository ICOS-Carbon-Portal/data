import BinTable from './models/BinTable.js';
import Backend from './Backend.js';

function handleError(error){
	console.log(error);
}

const requests = [[0], [1], [2]].map(cols => {
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
					console.log('First value is ' + binTable.column(0).value(0));
				},
				handleError
			);
			return {reqNum: (reqNum + 1) % requests.length};
		default:
			return oldState;
	}
}

const store = Redux.createStore(computeNextState);

function fetchData(){
	store.dispatch({type: 'FETCHNEXT'});
}

React.render(
	<div>
		<button onClick={fetchData}>Fetch!</button>
	</div>,
	document.getElementById('main')
);

