const express = require("express");
const app = express();

const cors = require("cors");
app.use(cors({ origin: "http://localhost:3000" }));

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const cookieParser = require("cookie-parser");
app.use(cookieParser());

require("dotenv").config();
const { connect } = require("mongoose");
connect(process.env.DB, { dbName: process.env.DB_NAME });

app.use("/api", require("./api"));

app.listen(3001, () => console.log("Serveur en ligne !"));