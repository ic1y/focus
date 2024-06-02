const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const exphbs = require("express-handlebars");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const key = process.env.jwt_key;
const uri = process.env.mongodb_URI;
const achievements = require("./achievements.json").achievements;

const formatTime = (milliseconds) => {
	let totalSeconds = Math.floor(milliseconds / 1000);
	let hours = Math.floor(totalSeconds / 3600);
	totalSeconds %= 3600;
	let minutes = Math.floor(totalSeconds / 60);
	let seconds = totalSeconds % 60;
	return `${hours > 0 ? hours + "hrs " : ""}${
		minutes > 0 ? minutes + "min " : ""
	}${seconds > 0 ? seconds + "secs" : ""}`;
}

const hps = exphbs.create({
    helpers: {
        // showToDo: function (toDo) {
        //     return `<label><input type="checkbox" ${toDo.done === "on" ? "checked" : ""}><span>${toDo.name}</span></label>`;
        // },
		getAchievements: function (focusData) {
            let totalMin = 0;

            if(focusData) focusData.forEach((timeString) => {
                const [startTime, endTime] = timeString.split("|").map(Number);
                const minutes = Math.floor((endTime - startTime) / 60000);
                totalMin += minutes;
			});
						
			let acvmHtml = "";	
            achievements.forEach((acvm) => {
                const achieved = (totalMin >= acvm.req);
                acvmHtml += `<div>
                <img src="${achieved ? ("/static/acvm/" + acvm.imgSrc) : "/static/acvm/mystery.png"}" class="${
					achieved ? "" : "bw"
				}"><details><summary class="acvmTitle">${acvm.name} ${
					achieved ? "✅" : "🔒"
				}</summary><span>${
					achieved
						? acvm.description
						: "Reach a total focus time of " +
						  formatTime(acvm.req * 60000)
				}</span><br></details></div>`;
			});
			return acvmHtml;
				
        },
        showTime: function (timeData) {
            let [startTime, endTime] = timeData.split("|");
			const milliseconds = endTime - startTime;
            
            let date = new Date(Number(startTime));
            return `On ${date.toLocaleString()}, you focused for ${formatTime(milliseconds)}.`;
        },
    },
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

        app.use("/static", express.static("static"));

        // Configure Handlebars
        app.engine("handlebars", hps.engine);
        app.set("view engine", "handlebars");
        app.set("views", "./views");
        app.get("/", async (req, res) => {
            const token = req.cookies.authToken;
            console.log(token);
            if (!token) {
                return res.redirect("/login");
            }

            try {
                const result = jwt.verify(token, key);
                console.log(result.username);
                const uInfo = await uAuthClx.findOne({
                    username: result.username,
                });
                console.log(uInfo.toDos);
                let totalTime = 0;
                if (uInfo.focusList) {
                    uInfo.focusList.forEach((timeString) => {
						const [startTime, endTime] = timeString
							.split("|")
							.map(Number);
						totalTime += Math.floor((endTime - startTime) / 1000);
					});
                }
                res.render("home", {
                    username: result.username,
                    focusData: uInfo.focusList,
                    toDos: JSON.stringify(uInfo.toDos),
                    totalTime: formatTime(totalTime * 1000)
                });
            } catch (err) {
                console.dir(err);
                return res.sendFile(__dirname + "/login.html");
            }
        });

        app.get("/sign-up", (req, res) => {
            res.sendFile(__dirname + "/sign-up.html");
        });
        app.get("/login", (req, res) => {
            res.sendFile(__dirname + "/login.html");
        });

        function setCookie(username, res) {
            const token = jwt.sign({ username: username }, key);

            // Set the JWT as an HTTP-only cookie
            res.cookie("authToken", token, {
                httpOnly: true, // Accessible only by the server
                secure: true, // Only send over HTTPS
                maxAge: 3600000, // 1 hour expiration
                sameSite: "strict", // Strict same-site policy
            });
            res.redirect("/");
        }

        app.get("/log-out", async (req, res) => {
            res.clearCookie("authToken");
            res.sendFile(__dirname + "/log-out.html");
        });

        app.post("/deleteAccount", async (req, res) => {
            const token = req.cookies.authToken;
            console.log(token);
			if (!token) {
				return res.sendStatus(400);
			}

            try {
				const result = jwt.verify(token, key);
				console.log(result.username);
				const uInfo = await uAuthClx.findOne({
					username: result.username,
                });
                if (typeof uInfo === "undefined") {
                    return res.sendStatus(404);
                } else {
                    try {
                        uAuthClx.deleteOne({ username: result.username })
                        res.clearCookie("authToken");
                        res.sendStatus(200);
                    } catch {
                        return res.sendStatus(500);
                    }
                }
			} catch (err) {
				console.dir(err);
				return res.sendStatus(403);
			}
        })

        app.post("/postFocus", async (req, res) => {
            const token = req.cookies.authToken;

            if (!token) {
                res.sendStatus(400);
            }

            let username = null;

            try {
                result = jwt.verify(token, key);
                username = result.username;
            } catch (err) {
                return res.sendStatus(403);
            }

            const uInfo = await uAuthClx.findOne({ username: username });
            const startTime = req.body.startTime;
            const endTime = req.body.endTime;
            if (!startTime || !endTime) return res.sendStatus(400);

            if (typeof uInfo === "undefined") return res.sendStatus(404);;
            try {
                uAuthClx.updateOne(
                    { username: username }, // Filter to get doc
                    // Update document
                    {
                        $push: {
                            focusList: `${startTime}|${endTime}`,
                        },
                    },
                    { upsert: true }
                );
            } catch {
                res.sendStatus(500);
            }
            res.sendStatus(200);
        });

        app.get("/getToDos", async (req, res) => {
            const token = req.cookies.authToken;

			if (!token) {
				res.sendStatus(400);
			}

			let username = null;

			try {
				result = jwt.verify(token, key);
				username = result.username;
			} catch (err) {
				return res.sendStatus(403);
			}

            const uInfo = await uAuthClx.findOne({ username: username });

			if (typeof uInfo === "undefined") return res.sendStatus(404);
            
            // if (uInfo.toDos.length > 0) {
                res.send({toDos: uInfo.toDos });
            // } else {
                // res.send({toDos: []})
            // }
        })

        app.post("/addToDo", async (req, res) => {
			const token = req.cookies.authToken;

			if (!token) {
				res.sendStatus(400);
			}

			let username = null;

			try {
				result = jwt.verify(token, key);
				username = result.username;
			} catch (err) {
				return res.sendStatus(403);
			}

            const uInfo = await uAuthClx.findOne({ username: username });

			if (typeof uInfo === "undefined") return res.sendStatus(404);
            try {
                switch (req.body.type) {
                    case "add":
                    {
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
                    case "update":
                    {
                        const toDo = req.body.toDo;
                        if (!toDo) return res.sendStatus(400);
                        const updateIndex = uInfo.toDos.findIndex(todo => todo.name === toDo);
                        uAuthClx.updateOne(
                            {
                                username: username,
                            },
                            {
                                $set: {
                                    ["toDos." + updateIndex + ".done"]: req.body.done
                                }
                            }
                        )
                        break;
                    }
                    case "delete":
                    {
                        const toDo = req.body.toDo;
                        if (!toDo) return res.sendStatus(400);
                
                        const deleteIndex = uInfo.toDos.findIndex((todo) => todo.name === toDo);
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
                                    toDos: uInfo.toDos
                                }
                            }
                        );
                        break;
                    }
                    default:
                        res.sendStatus(400);
                        
                }
    			res.sendStatus(200);
                   
            } catch {
                res.sendStatus(500);
            }
		});


        app.post("/login", async (req, res) => {
            let username = req.body.username;
            const password = req.body.password;
            if (!username || !password) return;
            username = username.toLowerCase();

            const uInfo = await uAuthClx.findOne({ username: username });
            if (uInfo) {
                if (bcrypt.compareSync(password, uInfo.password)) {
                    // res.sendStatus(200);
                    setCookie(username, res);
                } else {
                    res.send("Wrong Username/Password");
                }
            } else {
                res.send("Wrong Username/Password");
            }
        });

        app.post("/sign-up", async (req, res) => {
            let username = req.body.username;
            const password = req.body.password;
            if (!username || !password) return;
            username = username.toLowerCase();

            const uInfo = await uAuthClx.findOne({ username: username });
            if (uInfo) {
                res.send("username already exists");
                return;
            }

            const hashed = bcrypt.hashSync(password, 10);
            console.log(password, hashed);
            uAuthClx.insertOne({
                username: username,
                password: hashed,
            });
            setCookie(username, res);
        });

        app.listen(3000);
    } catch (e) {
        console.error(e);
    }
}

run();
