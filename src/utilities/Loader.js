import React from "react"
import ReactLoading from "react-loading"

const Loader = () => {
	return (
		<>
			<div className="loader d-flex  align-items-center justify-content-center">
				<ReactLoading type="balls" color="#007DFE" height={"10%"} width={"10%"} />
			</div>
		</>
	)
}

export default Loader
