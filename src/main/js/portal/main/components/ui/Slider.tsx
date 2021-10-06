import React, { Component, CSSProperties, RefObject } from 'react';
import {debounce, Events} from 'icos-cp-utils';


const defaultIconStyle: CSSProperties = {
	fontSize: 14,
	position: 'absolute',
	float: 'right',
	top: -35,
	right: 8,
	cursor: 'pointer',
	color: '#666',
	padding: 10
};

type Props = {
	startCollapsed: boolean
	rootStyle?: CSSProperties
	iconStyle?: CSSProperties
	openClsName?: string
	closedClsName?: string
	title?: string
}

type State = {
	isOpen: boolean
	height?: number
	isOpening: boolean
}

export default class Slider extends Component<Props, State>{
	private rootStyle: CSSProperties
	private iconStyle: CSSProperties
	private events: any
	private handleResize: () => void
	private content: RefObject<HTMLDivElement>

	constructor(props: Props){
		super(props);

		this.content = React.createRef<HTMLDivElement>();
		this.rootStyle = { ...{ position: 'relative' }, ...props.rootStyle };
		this.iconStyle = { ...defaultIconStyle, ...props.iconStyle };

		this.state = {
			isOpen: props.startCollapsed === undefined ? true : !props.startCollapsed,
			height: undefined,
			isOpening: true
		};

		this.events = new Events();
		this.handleResize = debounce(() => {
			// Trigger a rerender on resize so it adjusts height
			this.setState({height: this.state.height});
		});
		this.events.addToTarget(window, "resize", this.handleResize);
	}

	onClick(){
		const isOpen = !this.state.isOpen;

		this.setState({
			isOpen,
			isOpening: isOpen
		});
	}

	componentDidUpdate(prevProps: Props & {children: React.ReactNode}) {
		if (this.props.children !== prevProps.children) {
			this.setHeight();
		}
	}

	componentWillUnmount(){
		this.events.clear();
	}

	transitionEnded(){
		this.setState({isOpening: false});
	}

	render(){
		const state = this.state;
		const isOpen = state.isOpen;
		const isOpening = state.isOpening;
		const height = isOpen
			? this.content ? getHeight(this.content) : state.height
			: 0;
		const {children, openClsName, closedClsName, title} = this.props;
		const iconCls = isOpen
			? openClsName || 'fas fa-angle-up'
			: closedClsName || 'fas fa-angle-down';
		const baseStyle: CSSProperties = {
			transition: 'height 0.3s ease-in-out',
			height
		};
		const contentStyle = !isOpen || isOpening
			? Object.assign({}, baseStyle, {overflow:'hidden'})
			: baseStyle;

		return (
			<div style={this.rootStyle}>
				<span className={iconCls} style={this.iconStyle} onClick={this.onClick.bind(this)} title={title} />
				<div ref={this.content} style={contentStyle}>
					{children}
				</div>
			</div>
		);
	}

	setHeight(){
		this.setState({height: getHeight(this.content)});
	}

	componentDidMount(){
		this.setHeight();

		this.events.addToTarget(this.content.current, "transitionend", this.transitionEnded.bind(this));
	}
}

const getHeight = (content: RefObject<HTMLDivElement>) => {
	return content.current
		? Array.from(content.current.childNodes).reduce((acc, curr) => acc + (curr as HTMLElement).clientHeight, 0)
		: 0;
};
