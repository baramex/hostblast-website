const express = require("express");
const app = express();

require("dotenv").config();
const { connect } = require("mongoose");
connect(process.env.DB, { dbName: process.env.DB_NAME });

app.use("/api", require("./api"));

app.listen(3000, () => console.log("Serveur en ligne !"));