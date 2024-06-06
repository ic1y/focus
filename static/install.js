if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/sw.js");
}
let installPrompt = null;
const installButton = document.createElement("button");
installButton.style.fontWeight = "700";
installButton.style.fontSize = "1.5rem";
installButton.innerText = "Install the Focus app";
installButton.style.display = "none";

const main = document.querySelector("main")
main.insertBefore(installButton, main.firstChild);

installButton.addEventListener("click", async () => {
	if (installPrompt === null) {
		return;
	}
	const result = await installPrompt.prompt();
	console.log(`Install prompt was: ${result.outcome}`);
	installPrompt = null;
	installButton.style.display = "none";
});

window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	installPrompt = event;
	installButton.style.display = "block";
});