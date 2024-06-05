const { formatTime } = require("./utils");
const achievements = require("./achievements.json").achievements;

const helpers = {
	getAchievements: function (focusData) {
		let totalMin = 0;

		if (focusData)
			focusData.forEach((timeString) => {
				const [startTime, endTime] = timeString.split("|").map(Number);
				const minutes = Math.floor((endTime - startTime) / 60000);
				totalMin += minutes;
			});

		let acvmHtml = "";
		achievements.forEach((acvm) => {
			const achieved = totalMin >= acvm.req;
			acvmHtml += `<div data-name="${acvm.name}" data-desc="${
				acvm.description
			}" data-req="${acvm.req}" data-achv="${
				achieved ? 1 : 0
			}" data-src="${acvm.imgSrc}"><img alt="${acvm.name}" src="${
				achieved
					? "/acvm/" + acvm.imgSrc
					: "/acvm/mystery.png"
			}"><span class="acvmTitle">${acvm.name} ${
				achieved ? "✅" : "🔒"
			}</span><span class="acvmDesc">${
				achieved
					? acvm.description
					: "Reach a total focus time of " +
					  formatTime(acvm.req * 60000)
			}</span><br></div>`;
		});
		return acvmHtml;
	},
	showTime: function (timeData) {
		let [startTime, endTime] = timeData.split("|");
		const milliseconds = endTime - startTime;

		let date = new Date(Number(startTime));
		return `On ${date.toLocaleString()}, you focused for ${formatTime(
			milliseconds
		)}.`;
	},
	getTotalTime: function (focusData) {
		let totalSeconds = 0;

		if (focusData)
			focusData.forEach((timeString) => {
				const [startTime, endTime] = timeString.split("|").map(Number);
				const seconds = Math.floor((endTime - startTime) / 1000);
				totalSeconds += seconds;
			});
		return totalSeconds;
	},
};

module.exports = helpers;