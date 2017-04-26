// import config from '../../common/main/config';
// import App from './App';
// import URLSearchParams from '../../common/main/models/URLSearchParams';;
//
// new App(
// 	config,
// 	new URLSearchParams(window.location.search, ['service', 'varName', 'date', 'elevation', 'gamma'])
// );

import React from 'react';
import {render} from 'react-dom';
import Root from './containers/Root.jsx';

render(
	<Root />,
	document.getElementById('main')
);
