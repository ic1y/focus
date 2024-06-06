const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const key = process.env.jwt_key;

const formatTime = (milliseconds) => {
	let totalSeconds = Math.floor(milliseconds / 1000);
	let hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
	return `${hours > 0 ? hours + "hrs " : ""}${
		minutes > 0 ? minutes + "mins " : ""
	}${seconds > 0 ? seconds + "secs" : ""}`;
};

const verify = async (req, res, Clx, deferLogin) => {
	const token = req.cookies.authToken;

	if (!token) {
		if (deferLogin === true) {
			res.render("intro");
		} else {
			res.sendStatus(400);
		}
		return false;
	}

	let id = null;
	try {
		result = jwt.verify(token, key);
		id = result.id;
	} catch (err) {
		console.log(err);
		res.sendStatus(403);
		return false;
	}
	id = ObjectId.createFromHexString(id);
	const uInfo = await Clx.findOne({ _id: id });
	if (uInfo === null) {
		res.sendStatus(404);
		return false;
	}
	setCookie(id.toString(), res, false); // renew cookie
	return uInfo;
};

const setCookie = (id, res, redirect) => {
	const token = jwt.sign({ id: id.toString() }, key);
	
	// Set the JWT as an HTTP-only cookie
	res.cookie("authToken", token, {
		httpOnly: true, // Accessible only by the server
		secure: true, // Only send over HTTPS
		maxAge: 2592000000, // = 30 * 24 * 60 * 60 * 1000, 30 day expiration
		sameSite: "strict", // Strict same-site policy
	});
	if (redirect !== false) res.redirect("/");
}

const utils = {
	formatTime: formatTime,
	verify: verify,
	setCookie: setCookie
}

module.exports = utils;