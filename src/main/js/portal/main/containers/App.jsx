import React from 'react';
import {AnimatedToasters} from 'icos-cp-toaster';
import Search from './Search.jsx';
import Collections from './Collections.jsx';


export const App = props => <div className="container-fluid" style={{marginTop: 10}}>
	<AnimatedToasters
		autoCloseDelay={5000}
		toasterData={props.toasterData}
		maxWidth={400}
	/>
	<div className="page-header">
		<h1>
			ICOS data portal
			<small> Under construction</small>
		</h1>
	</div>

	<Route props={props} />

</div>;

const Route = props => {
	switch(props.route){

		case 'search':
			return <Search props={props} />;

		case 'collections':
			return <Collections props={props} />;

		default:
			return <Search props={props}  />;
	}
};
