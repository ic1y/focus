const startBtn = document.getElementById("start");
const endBtn = document.getElementById("end");
const timeEl = document.getElementById("time");
const enterToDoBtn = document.getElementById("enterToDo");
const toDoIn = document.getElementById("addToDo");
const toDoLi = document.getElementById("toDoList");
const focusLi = document.getElementById("focusList");
const histTitle = document.getElementById("histTitle");
let focusState = false;
let currentTimeout = null;

if (focusLi.children.length === 0) {
	histTitle.style.display = "none";
}

const showToDo = async (toDo, done) => {
	const toDoDiv = document.createElement("div");
	// console.log(toDo)
	const toDoLabel = document.createElement("label");
	const toDoName = document.createElement("span");
	toDoName.innerText = toDo;
	const toDoCheck = document.createElement("input");
	toDoCheck.type = "checkbox";
	toDoCheck.checked = done;
	toDoCheck.addEventListener("change", async () => {
		const rawResponse = await fetch("/addToDo", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				toDo: toDo,
				type: "update",
				done: toDoCheck.checked,
			}),
		});
		if (rawResponse.status !== 200) alert("Error: failed to change to-do");
	});

	const btnsDiv = document.createElement("div");
	// const changeBtn = document.createElement("button");
	const deleteBtn = document.createElement("button");
	btnsDiv.append(deleteBtn);

	toDoLabel.append(toDoCheck, toDoName);
	toDoDiv.append(toDoLabel, btnsDiv);
	toDoLi.appendChild(toDoDiv);

	// changeBtn.ariaLabel = "Change to-do";
	// changeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><title>Change to-do</title><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>'
	// changeBtn.addEventListener("click", async () => {
	// 	const prm = prompt("Current to-do: " + toDoName.innerText + "\nChange to-do name:")
	// 	if (prm === null) return;
	// 	const rawResponse = await fetch("/addToDo", {
	// 		method: "POST",
	// 		headers: {
	// 			Accept: "application/json",
	// 			"Content-Type": "application/json",
	// 		},
	// 		body: JSON.stringify({
	// 			toDo: prm,
	// 			type: "update",
	// 			done: toDoCheck.checked,
	// 		}),
	// 	});
	// 	if (rawResponse.status === 200) {
	// 		toDoName.innerText = prm;
	// 	} else {
	// 		alert("Failed to change to-do");
	// 	}
	// })

	deleteBtn.ariaLabel = "Delete to-do";
	deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><title>Delete to-do</title><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>';
	deleteBtn.addEventListener("click", async () => {
		if (confirm(`Please confirm: delete '${toDoName.innerText}'?`) !== true) return; // require user confirmation for toDo deletion
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
		} else {
			alert("Error: failed to remove to-do");
		}
	});
}

const toDos = JSON.parse(toDoLi.innerText);
toDoLi.innerText = "";
if (toDos.length !== 0) {
	console.log("todos:" + JSON.stringify(toDos));
	for (let i = 0; i < toDos.length; i++) {
		showToDo(toDos[i].name, Boolean(toDos[i].done));
	}
}

const createToDo = async () => {
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

		showToDo(toDo);
	}
}

enterToDoBtn.addEventListener("click", createToDo);
toDoIn.addEventListener("keydown", (e) => {
	if (e.key === "Enter") createToDo();
})

const formatTime = (milliseconds, units) => {
	let totalSeconds = Math.floor(milliseconds / 1000);
	let hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
	if (units === true) {
		return `${hours > 0 ? hours + "hrs " : ""}${
			minutes > 0 ? minutes + "mins " : ""
		}${seconds > 0 ? seconds + "secs" : ""}`;
	} else {
		return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(
			2,
			"0"
		)} : ${String(seconds).padStart(2, "0")}`;
	}
};

const totalEl = document.getElementById("total");
let totalTime = Number(totalEl.dataset.total);
if(totalTime > 0) totalEl.innerText = "Total focus time: " + formatTime(totalTime * 1000, true);

const dlg = document.querySelector("dialog");
const dlgTitle = document.getElementById("dlgTitle");
const dlgDesc = document.getElementById("dlgDesc");
const dlgImg = document.getElementById("dlgImg");
const closeDlg = document.getElementById("closeDlg");

const unlockAchv = (el, benchM) => {
	// check for dialog element support
	if (typeof HTMLDialogElement === "undefined") {
		alert(`Congratulations! You unlocked ${el.dataset.name}!`);
		return checkAcvm(benchM);
	}
	closeDlg.style.display = "none";
	
	dlgImg.src = "/acvm/mystery.png";
	dlgImg.alt = "Click to unlock mystery character!";

	dlgTitle.innerText = `You got '${el.dataset.name}'!\n`;
	const revealImg = () => {
		dlgImg.alt = el.dataset.name;
		dlgImg.src = "/acvm/" + el.dataset.src;
		dlgDesc.innerText = el.dataset.desc.replaceAll("|", "\"");
		closeDlg.style.display = "block";
	}
	dlgImg.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			revealImg();
		}
	}, { once: true });
	dlgImg.addEventListener("click", revealImg);

	closeDlg.addEventListener("click", () => {
		document.body.classList.remove("dlgOpen");
		const acvmImg = el.children[0];
		acvmImg.src = "/acvm/" + el.dataset.src;
		acvmImg.classList.remove("bw");
		main.removeAttribute("ariaDisabled");
		dlg.close();
		dlg.style.display = "none";
		dlgDesc.innerText = "";
		el.children[1].innerText = el.dataset.name + " ✅";
		el.children[2].innerText = el.dataset.desc;
		checkAcvm(benchM);
	}, { once: true });
	document.body.classList.add("dlgOpen");
	dlg.style.display = "flex";
	dlg.open = true;
	main.ariaDisabled = true;

	dlgImg.focus();
}

const checkAcvm = (benchM) => {;
	console.log("bench mark" + benchM);
	const firstEl = document.querySelectorAll('div[data-achv="0"]')[0];
	if (!firstEl) return;

	if (benchM >= Number(firstEl.dataset.req)) {
		console.log(true);

		firstEl.dataset.achv = "1";
		unlockAchv(firstEl, benchM);
	} else {
		return;
	}
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
					formatTime((endTime - startTime), true) +
					"! Feel free to take a short break before continuing."
			);

			totalTime += Math.floor((endTime - startTime) / 1000);
			totalEl.innerText = "Total focus time: " + formatTime((totalTime * 1000), true);
			checkAcvm(Math.floor(totalTime / 60));

			const listEntry = document.createElement("li");
			const startDT = new Date(startTime).toLocaleString();
			listEntry.innerText = `On ${startDT}, you focused for ${formatTime(
				(endTime - startTime),
				true
			)}.`;
			if (focusLi.children.length === 0) {
				histTitle.style.display = "block";
			}
			focusLi.insertBefore(listEntry, focusLi.firstChild);
		},
		{ once: true }
	);
};

startBtn.addEventListener("click", startFocus);

document.getElementById("logOut").addEventListener("click", () => {
	const cfm = confirm("Confirmation: log out?");
	if (cfm === true) document.location.pathname = "/log-out";
})

document.getElementById("requestData").addEventListener("click", async () => {
	const cfm = confirm("Confirmation: request a copy of your user data? This will open a .json file in a new tab for your download.");
	if (cfm === false) return;
	fetch("/requestData", {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
	}).then((res) => res.blob())
		.then((blob) => {
			const file = window.URL.createObjectURL(blob);
			const newWin = window.open(file);

			if (
				!newWin ||
				newWin.closed ||
				typeof newWin.closed == "undefined"
			) {
				//POPUP BLOCKED
				document.location.assign(file);
			};
		});;
})

document.getElementById("changePass").addEventListener("click", async () => {
	const newP = prompt(
		"Change password\nNew password:"
	);
	if (newP === null) return;
	if (newP.length < 8 || newP.length > 1024 || /[\s+]/.test(newP)) return alert("Password should contain between 8 and 1024 characters inclusive. No spaces allowed.");
	const rawResponse = await fetch("/changePass", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ pass: newP })
	});
	switch (rawResponse.status) {
		case (200):
			alert("Password successfully changed.")
			break;
		case (500):
			alert("Server error: password change unsuccessful");
			break;
	}
});

document.getElementById("delete").addEventListener("click", async () => {
	const cfm = prompt("Are you sure you want to delete your account? This action is irreversible! To confirm, enter 'delete':");
	if (cfm === false) return;
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
		switch (rawResponse.status) {
			case (200):
				alert(
					"Your account has been successfully deleted.\nYour user data has also been deleted from our database.\nYour cookies have been deleted.\nAny further queries can be addressed to the webmaster at ggohnchs@gmail.com."
				);
				document.location.reload();
				break;
			case (500):
				alert("Server error: deletion request unsuccessful");
				break;
		}
	};
})

// load iframe only when <summary> controlling iframe is clicked
document.getElementById("openMusic").addEventListener("click", () => {
	const player = document.querySelector("iframe");
	player.src = player.dataset.src;
}, { once: true });