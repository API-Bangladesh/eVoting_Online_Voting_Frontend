import React from "react"
import { Switch, Route } from "react-router-dom"
import { useSelector } from 'react-redux'
import _ from 'lodash'

// pages
import GivingOnlineVote from "../pages/GivingOnlineVote"
import ViewBallots from "../pages/ViewBallots"
import Error404 from "../pages/Error404"



const Routes = () => {
	const voterToken = useSelector((state) => state.token);
	return (
		<>
			<Switch>
				<Route exact path="/" component={GivingOnlineVote} />
				{
					(!_.isNull(voterToken) && !_.isUndefined(voterToken)) &&
					<Route exact path="/view-ballots" component={ViewBallots} />
				}
				<Route exact path="*">
					<Error404 />
				</Route>
			</Switch>
		</>
	)
}
export default Routes
