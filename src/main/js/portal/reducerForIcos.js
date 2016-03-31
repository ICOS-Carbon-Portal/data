
const initState = {};

export default function(state = initState, action){

	switch(action.type){
		case 'EXAMPLE_CASE_TO_BE_REPLACED':
			return Object.assign({}, state, {dummy: action.dummy});

		default:
			return state;
	}

}

