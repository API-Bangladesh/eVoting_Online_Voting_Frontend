import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { MdOutlineHowToVote } from 'react-icons/md';
import { AiOutlineStop } from 'react-icons/ai';
import { BsInfoCircle } from 'react-icons/bs';
import { Modal } from 'react-bootstrap';
// import OtpInput from 'react-otp-input';
import OTPInput from 'otp-input-react';
import { toast } from 'react-toastify';
import { toastNotify } from '../app-helpers/appHelpers';
import { useDispatch } from 'react-redux';
import { trackPromise, usePromiseTracker } from 'react-promise-tracker';
import Loader from '../utilities/Loader';
import moment from 'moment';

const queryString = require('query-string');
const parsed = queryString.parse(window.location.search);
var _ = require('lodash');
const axios = require('axios');
const CancelToken = axios.CancelToken;
const axiosCancelSource = CancelToken.source();

const GivingOnlineVote = () => {
	const [hasToken, setHasToken] = useState(null);
	const [isTokenUsed, setIsTokenUsed] = useState(null);
	const [tokenUsedDateTime, setTokenUsedDateTime] = useState(null);
	const [isTokenExist, setIsTokenExist] = useState(null);
	const [token, setToken] = useState(null);
	const [modalShow, setModalShow] = useState(false);
	const [otp, setOtp] = useState('');
	const [votingSchedule, setVotingSchedule] = useState(null);
	const [isVotePermit, setIsVotePermit] = useState(false);
	const history = useHistory();
	const dispatch = useDispatch();
	const { promiseInProgress } = usePromiseTracker();

	const handleModalClose = () => {
		setModalShow(false);
		setOtp('');
	};
	const handleModalShow = () => setModalShow(true);

	/**
	 * @method  requestForOtpSent
	 *
	 * @type  {}
	 * @param  {token}
	 * @return  {} =>{}
	 */
	const requestForOtpSent = async (token) => {
		await trackPromise(
			axios
				.get('/api/otp/' + token, {
					cancelToken: axiosCancelSource.token,
				})
				.then(function (response) {
					response?.data?.status && handleModalShow();
				})
				.catch(function (error) {
					error?.response?.data?.status === false && toastNotify(toast, 'error', `request is not sent. please try again later !!`);
				})
		);
	};

	/**
	 * @method  otpVerification
	 *
	 * @type  {}
	 * @param  {token , otp}
	 * @return  {} =>{}
	 */
	const otpVerification = async (token, otp) => {
		await trackPromise(
			axios
				.get(`/api/token-validation/${token}/${otp}`, {
					cancelToken: axiosCancelSource.token,
				})
				.then(function (response) {
					if (response?.data?.status) {
						dispatch({ type: 'SET_TOKEN', payload: { token } });
						toastNotify(toast, 'success', `Otp Validation Success`);
						handleModalClose();
						setTimeout(() => {
							history.push(`${process.env.PUBLIC_URL}/view-ballots`);
						}, 1000);
					}
				})
				.catch(function (error) {
					if (error?.response?.data?.status === false) {
						setOtp('');
						toastNotify(toast, 'error', `Otp does not match`);
					}
				})
		);
	};

	/**
	 * @method  handleVoteNow
	 *
	 * @type  {}
	 * @param  {}
	 * @return  {} =>{}
	 */
	const handleVoteNow = () => {
		requestForOtpSent(token);
	};

	/**
	 * @method  getTokenStatus
	 *
	 * @type  {}
	 * @param  { token }
	 * @return  {} =>{}
	 */
	const getTokenStatus = async (token) => {
		await trackPromise(
			axios
				.get('/api/post-token/' + token, {
					cancelToken: axiosCancelSource.token,
				})
				.then(function (response) {
					let { isTokenUsed, isTokenExist } = response?.data?.data;
					setIsTokenUsed(isTokenUsed);
					setIsTokenExist(isTokenExist);

					if (isTokenUsed === true) {
						let { used_time } = response?.data?.data;
						setTokenUsedDateTime(used_time);
					}

					if (isTokenUsed === false) {
						let { votingSchedule: schedule } = response?.data?.data;
						let { startDate, startTime, endTime } = schedule;

						let votingDate = moment(startDate, 'YYYY-MM-DD');
						let today = moment(moment(), 'YYYY-MM-DD');

						if (votingDate.isSameOrAfter(today, 'date')) {
							setVotingSchedule(schedule);
							if (votingDate.isSame(today, 'date')) {
								var start_time = moment(moment().format('YYYY-MM-DD') + ' ' + startTime);
								var end_time = moment(moment().format('YYYY-MM-DD') + ' ' + endTime);
								let isBetween = moment(moment()).isBetween(start_time, end_time);
								setIsVotePermit(isBetween);

							} else {
								setIsVotePermit(false);
							}
						} else {
							setIsVotePermit(false);
							setVotingSchedule(null);
						}
					}
				})
				.catch(function (error) {
					let isTokenExist = error?.response?.data?.errors?.isTokenExist;
					setIsTokenExist(() => {
						return isTokenExist ? isTokenExist : false;
					});
				})
		);
	};

	/**
	 * @method { componentDidMount}
	 *
	 * @type  {}
	 * @param  {}
	 * @return  {} =>{}
	 */
	useEffect(() => {
		if (parsed?.token) {
			let { token } = parsed;
			setToken(token);
			setHasToken(true);
			getTokenStatus(token);
		} else {
			setHasToken(false);
		}
	}, []);

	/**
	 * @method { handleOtpSubmit}
	 *
	 * @type  {}
	 * @param  {}
	 * @return  {} =>{}
	 */
	const handleOtpSubmit = () => {
		if (!_.isEmpty(otp)) {
			if (otp.toString().length < 6) {
				return alert('You have to input 6 digit must !');
			}
			otpVerification(token, otp);
		} else {
			return alert('Enter Otp Code First !!');
		}
	};

	/**
	 * @method { componentWillUnmount}
	 *
	 * @type  {}
	 * @param  {}
	 * @return  {} =>{}
	 */
	useEffect(() => {
		return () => {
			axiosCancelSource.cancel('Cancel request.');
			toast.dismiss();
		};
	}, []);


	return (
		<>
			<Modal id="otpHandleModal" show={modalShow} size="lg">
				<Modal.Body className="text-center py-5">
					<div className="head-text mb-4">
						<h4 className="mb-1 fs-5 text-success fw-normal">6 Digit OTP code has been sent to your email.</h4>
						<p className="mb-0 fs-5">Enter verification code here.</p>
					</div>
					<OTPInput
						value={otp}
						onChange={(otp) => setOtp(otp)}
						autoFocus
						OTPLength={6}
						otpType="number"
						disabled={false}
						className="justify-content-center"
						inputStyle={{ width: '50px', height: '50px' }}
					/>
					<div className="footer-text mt-0">
						<button type="button" onClick={handleOtpSubmit} className="btn btn-primary btn-reset m-1">
							Submit
						</button>
					</div>
				</Modal.Body>
			</Modal>
			<section className="GivingOnlineVote text-center py-5">
				<div className="container position-relative">
					{promiseInProgress && <Loader />}

					{isTokenUsed ? (
						<div className="mt-5 hasToken-true isTokenUsed-true p-5">
							<h2 className="display-5 text-success mb-5">You're already voted</h2>
							<div className="voting-time">
								<h6 className="fs-4 fw-normal border-bottom pb-3 mb-3">Voted On</h6>
								<p className="mb-0 text-danger fw-bold fs-5"> {moment(tokenUsedDateTime).format('HH:mm:ss A : DD MMMM YYYY')} </p>
							</div>
						</div>
					) : null}

					{isTokenUsed === false ? (
						<div className="hasToken-true">
							<h2 className="display-6 mb-5">Welcome to the online voting system</h2>
							<div className="voting-time mb-4">
								<h6 className="fs-4 fw-normal border-bottom pb-3 mb-3">Voting Time</h6>
								<p className="mb-0 text-primary fs-5">
									{!_.isNull(votingSchedule) &&
										`${moment(votingSchedule.startTime, ['HH.mm']).format('hh:mm A')} - ${moment(votingSchedule.endTime, ['HH.mm']).format(
											'hh:mm A'
										)}  : ${moment(votingSchedule.startDate).format('DD MMMM YYYY')} `}
								</p>
							</div>
							{!_.isNull(votingSchedule) && isVotePermit === true && (
								<button
									type="button"
									onClick={handleVoteNow}
									className={`btn px-4 rounded-pill ${hasToken ? 'btn-primary' : 'btn-danger opacity-25 disabled'}`}
								>
									<MdOutlineHowToVote /> Vote Now
								</button>
							)}
						</div>
					) : null}

					{hasToken === false || isTokenExist === false ? (
						<div className="row overflow-hidden">
							<div className="mt-5 hasToken-false p-5 alert alert-danger rounded position-absolute top-0 start-0 end-0 mx-auto col-9 col-sm-7 col-lg-6">
								<AiOutlineStop size="4rem" className="text-danger mb-4" />
								<h3 className="fs-3 fw-normal mb-0">
									{' '}
									<BsInfoCircle /> Unauthorized Access{' '}
								</h3>
							</div>
						</div>
					) : null}
				</div>
			</section>
		</>
	);
};

export default GivingOnlineVote;
