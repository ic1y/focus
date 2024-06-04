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

const utils = {
	formatTime: formatTime
}

module.exports = utils;