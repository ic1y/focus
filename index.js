const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const exphbs = require("express-handlebars");
const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
require("dotenv").config();
// const key = process.env.jwt_key;
const uri = process.env.mongodb_URI;
const { verify, setCookie } = require("./utils");
const helpers = require("./helpers");

const hbs = exphbs.create({
	helpers: helpers,
	extname: ".hbs",
	defaultLayout: "main",
});
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();
		console.log("connected");

		const db = client.db("focus");
		const uAuthClx = db.collection("user_auth");

		const app = express();

		app.use(bodyParser.urlencoded({ extended: false }));
		app.use(bodyParser.json());
		app.use(cookieParser());

		app.use("/", express.static("static"));

		app.use(function (req, res, next) {
			res.setHeader(
				"Content-Security-Policy",
				"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self' cdn.jsdelivr.net; connect-src 'self'; frame-src www.youtube-nocookie.com; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; manifest-src 'self'"
			);
			res.setHeader("Strict-Transport-Security", "max-age=31536000");
			res.setHeader("Referrer-Policy", "same-origin");
			res.setHeader("X-Content-Type-Options", "nosniff");
			res.setHeader("X-Frame-Options", "DENY");

			next();
		});

		// https://stackoverflow.com/a/26454491
		// Somewhat counter-intuitively, setting the extension name is not enough.
		// The engine name has to be the same as the file extension.

		app.engine("hbs", hbs.engine);
		app.set("view engine", "hbs");
		app.set("views", "./views");
		app.get("/", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx, true);
			if (uInfo === false) return;
			const focusData = uInfo.focusList || [];
			const toDoData = uInfo.toDos || [];
			try {
				res.render("home", {
					username: uInfo.username,
					focusData: focusData.reverse(),
					toDos: JSON.stringify(toDoData),
				});
			} catch (err) {
				res.render("intro");
				return;
			}
		});

		["sign-up", "login", "privacy"].forEach((path) => {
			app.get(`/${path}`, (req, res) => {
				res.render(path);
			});
		});

		app.get("/log-out", async (req, res) => {
			res.clearCookie("authToken");
			res.render("log-out");
		});

		app.get("/requestData", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx);
			if (uInfo === false) return;
			// console.log(uInfo);
			try {
				delete uInfo.password;
				// delete uInfo._id;
				// res.setHeader(
				// 	"Content-Disposition",
				// 	"attachment; filename=user-data.json;"
				// );
				res.json(uInfo).send();
			} catch {
				res.sendStatus(500);
			}
		});

		app.post("/changePass", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx);
			if (uInfo === false) return;
			// console.log(uInfo);
			const pwd = req.body.pass;
			if (!pwd) res.sendStatus(400);
			const hashed = bcrypt.hashSync(pwd, 10);
			try {
				await uAuthClx.updateOne(
					{ _id: uInfo._id },
					{
						$set: {
							password: hashed,
						},
					}
				);
				res.sendStatus(200);
			} catch {
				res.sendStatus(500);
			}
		});

		app.post("/deleteAccount", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx);
			if (uInfo === false) return;
			// console.log(uInfo);
			try {
				await uAuthClx.deleteOne({ _id: uInfo._id });
				res.clearCookie("authToken");
				res.sendStatus(200);
			} catch {
				res.sendStatus(500);
			}
		});

		app.post("/postFocus", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx);
			if (uInfo === false) return;

			const startTime = req.body.startTime;
			const endTime = req.body.endTime;
			if (!startTime || !endTime) return res.sendStatus(400);

			try {
				await uAuthClx.updateOne(
					{ username: uInfo.username }, // Filter to get doc
					// Update document
					{
						$push: {
							focusList: `${startTime}|${endTime}`,
						},
					},
					{ upsert: true }
				);
				res.sendStatus(200);
			} catch {
				res.sendStatus(500);
			}
		});

		app.get("/getToDos", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx);
			if (uInfo === false) return;
			res.send({ toDos: uInfo.toDos });
		});

		app.post("/addToDo", async (req, res) => {
			const uInfo = await verify(req, res, uAuthClx);
			if (uInfo === false) return;
			const username = uInfo.username;
			try {
				switch (req.body.type) {
					case "add": {
						const toDo = req.body.toDo;
						if (!toDo) return res.sendStatus(400);
						uAuthClx.updateOne(
							{ username: username }, // Filter to get document
							// Update doc
							{
								$push: {
									toDos: {
										name: toDo,
										done: false,
									},
								},
							},
							{ upsert: true }
						);
						break;
					}
					case "update": {
						const toDo = req.body.toDo;
						if (!toDo || typeof req.body.done === "undefined")
							return res.sendStatus(400);
						const updateIndex = uInfo.toDos.findIndex(
							(todo) => todo.name === toDo
						);
						uAuthClx.updateOne(
							{
								username: username,
							},
							{
								$set: {
									["toDos." + updateIndex + ".done"]:
										req.body.done,
								},
							}
						);
						break;
					}
					case "delete": {
						const toDo = req.body.toDo;
						if (!toDo) return res.sendStatus(400);

						const deleteIndex = uInfo.toDos.findIndex(
							(todo) => todo.name === toDo
						);
						if (deleteIndex > -1) {
							// only splice array when item is found
							uInfo.toDos.splice(deleteIndex, 1); // 2nd parameter means remove one item only
						} else {
							res.sendStatus(404);
							break;
						}
						uAuthClx.updateOne(
							{ username: username },
							{
								$set: {
									toDos: uInfo.toDos,
								},
							}
						);
						break;
					}
					default:
						res.sendStatus(400);
				}
				if (res.headersSent === false) res.sendStatus(200);
			} catch {
				if (res.headersSent === false) res.sendStatus(500);
			}
		});

		app.post("/login", async (req, res) => {
			let username = req.body.username;
			const password = req.body.password;
			if (!username || !password) {
				res.render("error", {err: "Username AND/OR Password is missing. Both Username AND Password are required."});
				return;
			}
			username = username.toLowerCase();

			const uInfo = await uAuthClx.findOne({ username: username });
			if (uInfo) {
				if (bcrypt.compareSync(password, uInfo.password)) {
					// res.sendStatus(200);
					setCookie(uInfo._id, res);
				} else {
					res.render("error", {
						err: "Wrong Username OR Password"
					});
				}
			} else {
				res.render("error", {
					err: "Wrong Username OR Password",
				});
			}
		});

		app.post("/sign-up", async (req, res) => {
			let username = req.body.username;
			let password = req.body.password;
			if (!username || !password) {
				res.render("error", {
					err: "Please provide a username (between 1 and 64 characters inclusive) AND password (between 8 and 72 characters inclusive)"
				});
				return;
			}
			username = username.toLowerCase();

			if (
				username.length < 1 ||
				username.length > 64 ||
				password.length < 8 ||
				password.length > 72
			) {
				res.render("error", {
					err: "Please provide a username (between 1 and 64 characters inclusive) AND password (between 8 and 72 characters inclusive). No spaces are allowed.",
				});
			}

			const uInfo = await uAuthClx.findOne({ username: username });
			if (uInfo !== null) {
				res.render("error", {
					err: "Username already exists! We're sorry, please try another one."
				})
				return;
			}

			const hashed = bcrypt.hashSync(password, 10);
			const insertionRes = await uAuthClx.insertOne({
				username: username,
				password: hashed,
			});
			setCookie(insertionRes.insertedId, res);
		});

		// Since this is the last non-error-handling
		// middleware use()d, we assume 404, as nothing else
		// responded.
		// https://stackoverflow.com/a/9802006

		app.use(function (req, res, next) {
			res.redirect("/");
		});

		app.listen(3000);
	} catch (e) {
		console.trace(e);
	}
}

run();
