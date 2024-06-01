const startBtn = document.getElementById("start");
const endBtn = document.getElementById("end");
const timeEl = document.getElementById("time");
let focusState = false;
let currentTimeout = null;

const formatTime = (milliseconds, notation) => {
	let totalSeconds = Math.floor(milliseconds / 1000);
	let hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, "0")}${
		notation ? "hrs" : ""
	} : ${String(minutes).padStart(2, "0")}${notation ? "mins" : ""} : ${String(
		seconds
	).padStart(2, "0")}${notation ? "secs" : ""}`;
};

const beforeUnloadHandler = (e) => {
	if (focusState === true) {
		e.preventDefault();
		e.returnValue = true; // For backwards compatibility
	}
};

const startFocus = () => {
	startBtn.style.display = "none";
	const startTime = Date.now();
	focusState = true;
	endBtn.style.display = "block";

	function updateTime() {
		const currentTime = Date.now();
		const timeElapsed = currentTime - startTime;
		timeEl.innerText = formatTime(timeElapsed);
		if (focusState === true) {
			currentTimeout = setTimeout(updateTime, 1000);
		}
	}
	updateTime();

	document.addEventListener("beforeunload", beforeUnloadHandler);

	endBtn.addEventListener(
		"click",
		() => {
			const endTime = Date.now();
			if (currentTimeout !== null) clearTimeout(currentTimeout);

			document.removeEventListener("beforeunload", beforeUnloadHandler);
			// Prevent accidental clicks/spam: if total recorded time is less than 1 second, do not record focus
			if (endTime - startTime < 1000) return;

			focusState = false;
			endBtn.style.display = "none";
			startBtn.style.display = "block";

			(async () => {
				const rawResponse = await fetch("/postFocus", {
					method: "POST",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						startTime: startTime,
						endTime: endTime,
					}),
				});

				console.log(rawResponse.text());
			})();

			alert(
				"Good job! You focused for " + formatTime(endTime - startTime)
			) + "! Feel free to take a short break before continuing.";
		},
		{ once: true }
	);
};

startBtn.addEventListener("click", startFocus);
document.getElementById("delete").addEventListener("click", async () => {
	const cfm = prompt("Are you sure you want to delete your account? This action is irreversible! To confirm, enter 'delete':");
	if (!cfm) return;
	if (cfm.trim().toLowerCase() === "delete") {
		const rawResponse = await fetch("/deleteAccount", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				delete: "delete"
			})
		});	
		// server sends 200 to show successful account deletion (see index.js)
		if (rawResponse.status === 200) {
			alert("Your account has been successfully deleted!");
			document.location = "/";
		};
	};
})