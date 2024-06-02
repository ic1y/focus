const startBtn = document.getElementById("start");
const endBtn = document.getElementById("end");
const timeEl = document.getElementById("time");
const enterToDoBtn = document.getElementById("enterToDo");
const toDoIn = document.getElementById("addToDo");
const toDoLi = document.getElementById("toDoList");
let focusState = false;
let currentTimeout = null;

const addToDo = async (toDo, done) => {
	const toDoDiv = document.createElement("div");
	console.log(toDo)
	const toDoLabel = document.createElement("label");
	const toDoName = document.createElement("span");
	toDoName.innerText = toDo;
	const toDoCheck = document.createElement("input");
	toDoCheck.type = "checkbox";
	if (done === "on") { toDoCheck.checked === "on"; }
	toDoCheck.addEventListener("change", async () => {
		let done = toDoCheck.value;
		const rawResponse = await fetch("/addToDo", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				toDo: toDo,
				type: "update",
				done: done,
			}),
		});
	});

	const deleteBtn = document.createElement("button");

	toDoLabel.append(toDoCheck, toDoName);
	toDoDiv.append(toDoLabel, deleteBtn);
	toDoLi.appendChild(toDoDiv);

	deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>`;
	deleteBtn.addEventListener("click", async () => {
		const rawResponse = await fetch("/addToDo", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				toDo: toDo,
				type: "delete",
			}),
		});
		if (rawResponse.status === 200) {
			toDoLi.removeChild(toDoDiv);
		}
	});
}

const rawResponse = fetch("/getToDos", {
	method: "GET",
	headers: {
		Accept: "application/json",
		"Content-Type": "application/json",
	}
}).then(resp => {
	resp.json().then(json => {
		const toDos = json.toDos;
		// console.log("todos:" + JSON.stringify(toDos));
		for (let i = 0; i < toDos.length; i++) {
			addToDo(toDos[i].name, toDos[i].done);
		}
	});
});	

const makeToDo = async () => {
	let toDo = toDoIn.value;
	if (toDo.trim().length === 0) return;
	toDoIn.value = "";
	const rawResponse = await fetch("/addToDo", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			toDo: toDo,
			type: "add"
		}),
	});	
	if (rawResponse.status === 200) {

		addToDo(toDo);
	}
}

enterToDoBtn.addEventListener("click", makeToDo);
toDoIn.addEventListener("keydown", (e) => {
	if (e.key === "Enter") makeToDo();
})

const formatTime = (milliseconds) => {
	let totalSeconds = Math.floor(milliseconds / 1000);
	let hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(
		seconds
	).padStart(2, "0")}`;
};

const fTimewUnits = (milliseconds) => {
	let totalSeconds = Math.floor(milliseconds / 1000);
	let hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
	return `${hours > 0 ? hours + "hrs " : ""}${
		minutes > 0 ? minutes + "min " : ""
	}${seconds > 0 ? seconds + "secs" : ""}`;
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
				"Good job! You focused for " +
				fTimewUnits(endTime - startTime) +
				"! Feel free to take a short break before continuing."
			);
			location.reload();
		},
		{ once: true }
	);
};

startBtn.addEventListener("click", startFocus);

document.getElementById("logOut").addEventListener("click", () => {
	const cfm = confirm("Confirmation: log out?");
	if (cfm === true) document.location.pathname = "/log-out";
})

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