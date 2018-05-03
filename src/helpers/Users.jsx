var React=require("react");
var ReactDOM=require("react-dom");
var axios=require("axios");
import NavBar from '../components/NavBar';
import {NavLink} from 'react-router-dom';

class Users extends React.Component{
	constructor(props){
		super(props);
		this.state={
			users:[]
		}
	}
	componentDidMount(){
		axios({
			url:"/getallusers",
			method:"post",
		}).then((res)=>{
			this.setState({users:res.data});
		})
	}
	usersList(){
		const usersList=this.state.users.map((user)=>
			<li key={user}>
				<NavLink to={"./user="+user}>
					{user}
				</NavLink>
			</li>
		)
		return(
			<u1 key="usersList">{usersList}</u1>
		)
	}
	render(){
		return(
			<div>
				<NavBar />
				<div>
					Users list:
					{this.usersList()}
				</div>
			</div>
		)
	}
}
module.exports={
	Users
}