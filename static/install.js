if ("serviceWorker" in navigator) {
	navigator.serviceWorker.register("/sw.js");
}
let installPrompt = null;
const installButton = document.getElementById("install");

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