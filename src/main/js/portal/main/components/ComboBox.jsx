import React, { Component } from 'react';

export default class ComboBox extends Component {
	constructor(props) {
		super(props);
		this.state = {
			showDropdDown: false
		}
	}

	handleInputClick(){
		this.setState({showDropdDown: !this.state.showDropdDown});
	}

	handleBlur(e){
		if (!e.currentTarget.contains(document.activeElement)) {
			this.setState({showDropdDown: false});
		}
	}

	render(){
		const props = this.props;
		const state = this.state;

		const dropDownBaseStyle = {
			margin: '-1px 0 0 0',
			width: 'calc(100% - 40px)',
			maxHeight: 200,
			overflowY: 'auto'
		};
		const dropDownStyle = state.showDropdDown
			? Object.assign(dropDownBaseStyle, {display: 'block'})
			: Object.assign(dropDownBaseStyle, {display: 'none'});
		// const dummyData = Array.from({length: 1500}, (_, i) => i);
		const lorems = ['Lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','In','imperdiet','ultrices','justo','in','sollicitudin','libero','temporDuis','lacinia','euismod','massa','eget','luctus','Suspendisse','sed','ultrices','nisl','tempor','suscipit','magna','Morbi','enim','enim','facilisis','sit','amet','viverra','id','ornare','non','mi','Vestibulum','ante','ipsum','primis','in','faucibus','orci','luctusultrices','posuere','cubilia','Curae','Cras','a','consequat','tellus','Suspendisse','arcu','id','nisi','ullamcorper','condimentum','nec','nec','odio','Vestibulum','purus','est','consequat','nisi','consequat','ultrices','dui','Donec','volutpat','orci','blandit','lorem','malesuada','convallis','Duis','nulla','nibh','rhoncus','vitae','euismod','eu','luctus','vitae','ex','Integer','blandit','tortor','id','mauris','volutpat','vitae','condimentum','quam','placerat','iam','nisl','purus','tristique','convallismattis','diam','Duis','interdum','antesem','dictum','tempus','Sed','commodo','vehicula','tellus','vitae','egestas','Fusce','ligula','augue','ultrices','non','sem','eget','gravida','sagittis','mauris','Aliquam','efficitur','laoreet','dapibus','Phasellus','nec','pulvinar','est','Proin','elementum','nisl','telluslaoreet','augue','mollis','sed','Cras','vel','dictum','sem','Mauris','sagittis','lorem','ipsum','vel','ullamcorper','lacus','aliquam','id','Lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','Sed','id','fermentum','mi','Suspendisse','faucibus','lectus','eget','ultrices','sagittis','ipsum','magna','mattis','diam','id','feugiat','sem','ipsum','ut','turpis','Nulla','sit','amet','dolor','elementumcumsan','sapien','ut','laoreet','turpis','Proin','a','enim','orci','Nunc','nec','metusvelit','imperdiet','iaculis','Maecenas','sit','amet','leo','lobortis','dignissim','libero','noncumsan','tellus','Ut','a','dignissim','lacus','Nulla','commodo','dignissim','turpis','quis','tristique','Praesentmolestie','felis','Sed','hendrerit','vulputate','leo','Quisque','quis','efficitur','nibh','Nullam','felis','in','enim','lacinia','viverra','Nulla','ut','fermentum','urna','Curabitur','vestibulum','velit','justo','sit','amet','vehicula','erat','varius','Maecenas','faucibus','nisl','id','odio','mattis','quis','placerat','tellus','porttitor','Maecenas','tempus','ullamcorper','tortor','vulputate','Mauris','tristiquemauris','dapibus','elementum','Ut','odio','enim','pellentesque','ut','orci','a','aliquam','lobortis','dolor','Mauris','finibus','sagittis','odio','faucibus','magna','molestie','eu','Nullam','dapibus','sit','amet','leo','vitae','elementum','Nunc','pulvinar','finibus','laoreet','Cras','ullamcorper','aliquam','mi','aliquam','vehicula','Praesent','sagittis','eu','enim','vel','efficitur','Duis','venenatis','nisl','vitae','commodo','Maecenas','rutrum','nisi','enim','ut','venenatis','justo','feugiat','eget','Pellentesque','vulputate','nisi','Mauris','id','ex','eleifend','finibus','ligula','sit','amet','semper','lorem','Donec','semper','gravida','dapibus','Nulla','vulputate','varius','quam','a','ornare','diam','mattis','sit','amet','Interdummalesuada','fames','ante','ipsum','primis','in','faucibus','Nunc','scelerisque','tellus','metusvestibulum','ipsum','consequat','Proin','faucibus','nibh','nec','massa','dictum','aliquam','iam','sit','amet','sem','turpis'];
		const dummyData = lorems.filter((l, i, self) => self.indexOf(l) == i);
		// console.log({dummyData});

		return (
			<div className="input-group" onBlur={this.handleBlur.bind(this)}>

				<input type="text" onClick={this.handleInputClick.bind(this)} className="form-control" />
				<span className="input-group-btn">
					<button className="btn btn-default" type="button">
						<span className="glyphicon glyphicon-remove-sign" />
					</button>
				</span>

				<ul className="dropdown-menu" style={dropDownStyle}>{
					dummyData.map(i => {
						return <li key={'k' + i}>
							<a href="#">{i}</a>
						</li>
					})
				}</ul>
			</div>
		);
	}
}