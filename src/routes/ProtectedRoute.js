import React from "react"
import {Route, Redirect} from "react-router-dom"
const authStatus = true

function ProtectedRoute({component: Component, ...rest}) {
	return (
		<Route
			{...rest}
			render={(props) => {
				if (authStatus) {
					return <Component {...props} />
				} else {
					return <Redirect to="/sign-in" />
				}
			}}
		/>
	)
}

export default ProtectedRoute
