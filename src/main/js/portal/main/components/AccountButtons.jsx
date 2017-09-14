import React, { Component } from 'react';

export default class AccountButtons extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		const {user, logOutAction} = this.props;

		return (
			<div>
				<LogInOutBtn user={user} logOutAction={logOutAction} />
				<AccountBtn user={user} />
			</div>
		);
	}
}

const AccountBtn = ({user}) => {
	return (
		<span>{
			user.email
				? <a href="https://cpauth.icos-cp.eu" className="btn btn-primary" style={{marginLeft: 20}}>
					<span className="glyphicon glyphicon-user" style={{marginRight: 10}}/>
					My Carbon Portal Account
					{user.icosLicenceOk
						? null
						: <span className="badge" style={{marginLeft: 5}}>
							<span className="text-danger">License not accepted</span>
						</span>
					}
				</a>
				: null
		}</span>

	);
};

const LogInOutBtn = ({user, logOutAction}) => {
	const href = user.email
		? 'https://cpauth.icos-cp.eu/logout'
		: 'https://cpauth.icos-cp.eu';
	const className = user.email
		? 'glyphicon glyphicon-log-out'
		: 'glyphicon glyphicon-log-in';
	const btnText = user.email
		? 'Log out'
		: 'Log in';

	return (
		<span>{
			user.email
				? <button className="btn btn-primary" onClick={logOutAction}>
					<span className={className} style={{marginRight: 10}}/>
					{btnText}
				</button>
				: <a href={href} className="btn btn-primary">
					<span className={className} style={{marginRight: 10}}/>
					{btnText}
				</a>
		}</span>
	);
};
