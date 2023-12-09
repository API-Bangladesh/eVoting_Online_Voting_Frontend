import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { MdOutlineHowToVote } from 'react-icons/md';
import { toast } from 'react-toastify';
import { makeCapitalizeSentence, toastNotify } from '../app-helpers/appHelpers';
import Swal from 'sweetalert2';
import { trackPromise, usePromiseTracker } from 'react-promise-tracker';
import { useSelector, useDispatch } from 'react-redux';
import defaultUser from '../assets/img/user-2.jpg';

const _ = require('lodash');
const axios = require('axios');
const CancelToken = axios.CancelToken;
const axiosCancelSource = CancelToken.source();

const ViewBallots = () => {
	const history = useHistory();
	const [ballots, setBallots] = useState(null);
	const [votingResult, setVotingResult] = useState({});
	const [companyDetails, setCompanyDetails] = useState(null);
	const { promiseInProgress } = usePromiseTracker();
	const voterToken = useSelector((state) => state.token);
	const dispatch = useDispatch();

	/**
	 * @method { onChangeHandler}
	 *
	 * @type  {}
	 * @param  { event, positionName, positionId, candidate, voteLimited }
	 * @return  {} =>{}
	 */
	const onChangeHandler = (event, positionName, positionId, candidate, voteLimited) => {
		let obj = votingResult;
		let isVoted = event.target.checked;
		if (obj.hasOwnProperty(positionName)) {
			if (isVoted === false) {
				let newMarkers = obj[positionName].candidates.filter((c) => c.candidateId !== candidate.candidateId);
				obj[positionName].candidates = newMarkers;

				if (obj[positionName].candidates.length < 1) {
					delete obj[positionName];
				}
			} else {
				if (!_.isNull(voteLimited)) {
					if (_.size(obj[positionName].candidates) >= voteLimited) {
						event.target.checked = false;
						Swal.fire({
							width: 600,
							title: 'Warning',
							text: `Select Any (${voteLimited}) For ${positionName}`,
							icon: 'warning',
							confirmButtonColor: '#FFC154',
							confirmButtonText: 'Ok',
						});
					} else {
						obj[positionName].candidates.push({ ...candidate, isVoted });
					}
				} else {
					obj[positionName].candidates.push({ ...candidate, isVoted });
				}
			}
		} else {
			obj[positionName] = {
				positionId,
				candidates: [{ ...candidate, isVoted }],
			};
		}

		setVotingResult(obj);
	};

	/**
	 * @method { voteValidation}
	 *
	 * @type  {}
	 * @param  {}
	 * @return  { letsGo }
	 */
	const voteValidation = () => {
		let letsGo = true;
		if (_.size(Object.keys(votingResult)) === _.size(ballots)) {
			for (const prop in votingResult) {
				for (const ballot of ballots) {
					if (ballot.positionName === prop) {
						if (!_.isNull(ballot.voteLimited)) {
							if (ballot.voteLimited !== votingResult[prop].candidates.length) {
								letsGo = false;
								return Swal.fire({
									width: 600,
									title: 'Warning',
									text: `Select Any (${ballot.voteLimited}) For ${ballot.positionName}`,
									icon: 'warning',
									confirmButtonColor: '#FFC154',
									confirmButtonText: 'Ok',
								});
							}
						}
					}
				}
			}
		} else {
			letsGo = false;
			return Swal.fire({
				width: 600,
				title: 'Warning',
				text: 'Please vote as required',
				icon: 'warning',
				confirmButtonColor: '#FFC154',
				confirmButtonText: 'Ok',
			});
		}

		return letsGo;
	};

	/**
	 * @method { onSubmit }
	 *
	 * @type  {}
	 * @param  {e}
	 * @return  {}
	 */
	const onSubmit = (e) => {
		e.preventDefault();
		let okay = voteValidation();
		if (okay === true) {
			let expectedResultScheme = { candidates: [] };
			for (const property in votingResult) {
				const { candidates } = votingResult[property];
				for (const eachCandidate of candidates) {
					expectedResultScheme.candidates.push(eachCandidate);
				}
			}
			expectedResultScheme['voterToken'] = !_.isNull(voterToken) && voterToken;
			postVotingResult(expectedResultScheme);
		}
	};

	/**
	 * @method { getAllBallots}
	 *
	 * @type  {}
	 * @param  {}
	 * @return  {}
	 */
	const getAllBallots = async () => {
		await trackPromise(
			axios
				.get('/api/get-all-ballots', {
					cancelToken: axiosCancelSource.token,
				})
				.then(function (response) {
					const responseData = !_.isEmpty(response.data.data) ? response.data.data : toastNotify(toast, 'error', 'No data to show !!');
					let expectedDataScheme = responseData.reduce((accumulator, ballot) => {
						const {
							position_id,
							ballot_items,
							vote_limit,
							position: { name: position_name },
						} = ballot;

						let candidates = ballot_items.map((candidate) => {
							const {
								candidate: { name: candidate_name, icon },
								candidate_id,
							} = candidate;
							return {
								name: candidate_name,
								candidateId: candidate_id,
								icon: icon,
							};
						});
						accumulator.push({
							positionName: position_name,
							positionId: position_id,
							candidates: candidates,
							voteLimited: vote_limit,
						});

						return accumulator;
					}, []);

					setBallots(expectedDataScheme);
				})
				.catch(function (error) {
					toastNotify(toast, 'error', 'Api response error !!');
					console.error(error.response);
				})
		);
	};

	/**
	 * @method { postVotingResult}
	 *
	 * @type  {}
	 * @param  {result}
	 * @return  {}
	 */
	const postVotingResult = async (result) => {
		await axios
			.post('/api/post-vote', result, {
				cancelToken: axiosCancelSource.token,
			})
			.then(function (response) {
				console.log(response);
				let status = response?.data?.status;

				if (status === true) {
					return Swal.fire({
						width: 600,
						title: 'Success',
						text: 'Vote has been casted successfully !!',
						icon: 'success',
						confirmButtonColor: '#4AC41C',
						confirmButtonText: 'Ok',
					}).then((result) => {
						if (result.isConfirmed) {
							dispatch({ type: 'SET_TOKEN', payload: { token: null } });
							history.push(`/?token=${voterToken}`);
							history.go();
						}
					});
				}
			})
			.catch(function (error) {
				let status = error?.response?.status;
				if (status === false) {
					return Swal.fire({
						width: 600,
						title: 'Oops !!',
						text: 'Something went wrong! please try again !!',
						icon: 'error',
						confirmButtonColor: '#f00',
						confirmButtonText: 'Ok',
					});
				}
			});
	};

	/**
	 * @method { getCompanyDetails }
	 *
	 * @type  {}
	 * @param  {e}
	 * @return  {}
	 */
	const getCompanyDetails = async () => {
		await axios
			.get('/api/company-details', {
				cancelToken: axiosCancelSource.token,
			})
			.then(function (response) {
				let { data } = response?.data;
				setCompanyDetails(data);
			})
			.catch(function (error) {
				console.error(error.response);
			});
	};

	/**
	 * @method { componentDidMount }
	 * @method { componentWillUnMount }
	 *
	 * @type  {}
	 * @param  {}
	 * @return  {}
	 */
	useEffect(() => {
		getAllBallots();
		getCompanyDetails();
		return () => {
			axiosCancelSource.cancel('Cancel request.');
			toast.dismiss();
		};
	}, []);

	return (
		<>
			<section className="ViewBallots py-5">
				<div className="container">
					<div className="row">
						<div className="col-xxl-9 col-xl-10 mx-auto">
							<div className="view-ballots p-4 p-xl-5 pt-xl-4 is-drop-shadow bg-white rounded">
								{!_.isNull(companyDetails) && !_.isUndefined(companyDetails) ? (
									<div className="row align-items-center text-center ballots-head mb-5">
										<div className="col-lg-12">
											<div className="club-details">
												{companyDetails?.icon !== undefined && !_.isEmpty(companyDetails.icon) ? (
													<img src={`${companyDetails.icon}`} style={{ maxWidth: '150px' }} alt="logo" className="img-fluid mb-3 d-inline-block" />
												) : null}
												<h5 className="fs-3 fw-normal mb-1"> {companyDetails?.organization}</h5>
												<p className="mb-0">
													<small>{companyDetails?.address}</small>
												</p>
											</div>
										</div>
									</div>
								) : null}

								<form method="post" onSubmit={(e) => onSubmit(e)} className="ballots-body">
									{_.isArray(ballots) && !_.isEmpty(ballots) ? (
										ballots.map((ballot, key) => {
											const { positionName, positionId, candidates, voteLimited } = ballot;
											return (
												<div key={key} className="ballots-widget mb-4">
													<h3 className="fs-6 fw-normal pb-2 b border-bottom mb-4">
														Select Any ({voteLimited > 0 && `${voteLimited}`}) For{' '}
														<strong> {makeCapitalizeSentence(positionName)}</strong>
													</h3>

													<div className="eVote-table table-responsive">
														<table className="table align-middle table-primary table-striped">
															<thead>
																<tr>
																	<th>{makeCapitalizeSentence(positionName)} Candidates</th>
																	<th>Image</th>
																	<th className="text-center">Vote</th>
																</tr>
															</thead>
															<tbody>
																{_.isArray(candidates) && !_.isEmpty(candidates) ? (
																	candidates.map((candidate) => {
																		return (
																			<tr key={candidate?.candidateId}>
																				<td>{candidate?.name}</td>
																				<td>
																					{candidate?.icon && !_.isNull(candidate.icon) ? (
																						<img src={`${candidate.icon}`} alt="Icon" className="img-fluid candidate-img" />
																					) : (
																						<img src={`${defaultUser}`} alt="Icon" className="img-fluid candidate-img" />
																					)}
																				</td>
																				<td className="text-center">
																					<div className="form-check d-inline-flex form-check-md">
																						<input
																							onChange={(event) =>
																								onChangeHandler(event, positionName, positionId, candidate, voteLimited)
																							}
																							name={positionName}
																							className="form-check-input"
																							type="checkbox"
																						/>
																					</div>
																				</td>
																			</tr>
																		);
																	})
																) : (
																	<tr>
																		<td colSpan="4">
																			<h5 className="mb-0 mt-4 fs-4 fw-normal text-danger">There is no candidates for this position</h5>
																		</td>
																	</tr>
																)}
															</tbody>
														</table>
													</div>
												</div>
											);
										})
									) : (
										<h3 className={`mb-0 ${promiseInProgress ? 'text-dark' : 'text-danger  opacity-50 '} text-center fs-3 fw-normal lh-base`}>
											{promiseInProgress ? 'Loading ....' : ' Ballots could not found !!'}
										</h3>
									)}
									{!_.isEmpty(ballots) ? (
										<div className="form-group text-end">
											<button type="submit" className="btn btn-primary px-4 rounded-pill">
												<MdOutlineHowToVote /> Submit
											</button>
										</div>
									) : null}
								</form>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default ViewBallots;
