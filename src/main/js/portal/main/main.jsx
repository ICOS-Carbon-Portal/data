import React from 'react';
import {render} from 'react-dom';
import Root from './containers/Root.jsx';
import {greeter} from './test';

const user = { firstName: "Karin", lastName: "Doe" };
console.log(greeter(user));

render(
	<Root />,
	document.getElementById('main')
);
