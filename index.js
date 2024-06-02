const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
                <img alt="${acvm.name}" src="${achieved ? ("/static/acvm/" + acvm.imgSrc) : "/static/acvm/mystery.png"}" class="${
					achieved ? "" : "bw"
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

const verify = async (req, res, Clx, deferLogin) => {
    const token = req.cookies.authToken;

    if (!token) {
        if (deferLogin === true) {
            res.redirect("/login");
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
        res.sendStatus(403);
        return false;
    }
    id = ObjectId.createFromHexString(id);
    const uInfo = await Clx.findOne({ _id: id});
    if (uInfo === null) {
        res.sendStatus(404);
        return false;
    }
    return uInfo;
}

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

        app.use(function (req, res, next) {
			res.setHeader(
				"Content-Security-Policy",
				"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'self' cdn.jsdelivr.net; connect-src 'self'; frame-src www.youtube-nocookie.com;"
			);
            res.setHeader(
				"Strict-Transport-Security",
				"max-age=31536000"
            );
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "DENY");

			next();
		});

        // Configure Handlebars
        app.engine("handlebars", hps.engine);
        app.set("view engine", "handlebars");
        app.set("views", "./views");
        app.get("/", async (req, res) => {
            const uInfo = await verify(req, res, uAuthClx, true);
            if (uInfo === false) return;
            try {
                
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
                    username: uInfo.username,
                    focusData: uInfo.focusList,
                    totalTime: formatTime(totalTime * 1000)
                });
            } catch (err) {
                res.sendFile(__dirname + "/login.html");
                return;
            }
        });

        ["sign-up", "login", "deleted"].forEach(path => {
            app.get(`/${path}`, (req, res) => {
                res.sendFile(`${__dirname}/${path}.html`)
            })
        })

        function setCookie(id, res) {
            const token = jwt.sign({ id: id.toString() }, key);

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
            const uInfo = await verify(req, res, uAuthClx)
            console.log(uInfo)
            try {
                uAuthClx.deleteOne({ _id: uInfo._id });
                res.clearCookie("authToken");
                res.sendStatus(200);
            } catch {
                res.sendStatus(500);
            }
        })

        app.post("/postFocus", async (req, res) => {

            const uInfo = await verify(req, res, uAuthClx);

            const startTime = req.body.startTime;
            const endTime = req.body.endTime;
            if (!startTime || !endTime) return res.sendStatus(400);

            try {
                uAuthClx.updateOne(
                    { username: uInfo.username }, // Filter to get doc
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

            const uInfo = await verify(req, res, uAuthClx);
            res.send({toDos: uInfo.toDos });

        })

        app.post("/addToDo", async (req, res) => {
            const uInfo = await verify(req, res, uAuthClx);
            const username = uInfo.username;
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
                        if (!toDo || typeof req.body.done === "undefined") return res.sendStatus(400);
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
            if (!username || !password) {
                res.send("Please provide a username AND password");
                return;
            };
            username = username.toLowerCase();

            const uInfo = await uAuthClx.findOne({ username: username });
            if (uInfo) {
                if (bcrypt.compareSync(password, uInfo.password)) {
                    // res.sendStatus(200);
                    setCookie(uInfo._id, res);
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
            if (!username || !password) {
                res.send("Please provide a username AND password");
                return;                

            };
            username = username.toLowerCase();

            const uInfo = await uAuthClx.findOne({ username: username });
            if (uInfo) {
                res.send("Username already exists");
                return;
            }

            const hashed = bcrypt.hashSync(password, 10);
            // console.log(password, hashed);
            const insertionRes = await uAuthClx.insertOne({
                username: username,
                password: hashed,
            });
            setCookie(insertionRes.insertedId, res);
        });

        app.listen(3000);
    } catch (e) {
        console.error("Error: " + e);
    }
}

run();
