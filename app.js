const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");

const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");
const eateryRoutes = require("./routes/eatery");
const orderWorker = require("./message_queues/worker");

app = express();

// with cloudinary storage
const upload = multer();

// CORS CONFIG
var corsOptions = {
    origin: process.env.ALLOWED_DOMAIN,
};
// cors middleware
app.use(cors(corsOptions));

// body parser middleware
app.use(bodyParser.json());

// static file middleware
app.use(express.static("public"));

// multer (file upload) middleware
app.use(upload.single("image"));

// routes
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);
app.use("/eatery", eateryRoutes);

// error handling middleware
app.use((error, req, res, next) => {
    console.error("Error middleware: ", error);

    const statusCode = error.status || 500;

    res.status(statusCode).json({
        name: error.name,
        message: error.message,
    });
});

// database connection
async function run() {
    try {
        await mongoose.connect(
            `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@cluster0.wmqwfwt.mongodb.net/${process.env.MONGODB_DB_NAME}?retryWrites=true&w=majority`
        );

        // sets the session operation on all operations within a Connection.prototype.transaction()
        mongoose.set("transactionAsyncLocalStorage", true);

        app.listen(process.env.PORT || 3000, () => {
            console.log("App is listening on port 3000..!!");

            // start bullmq worker to process jobs of 'Order' queue
            // to imitate processing of order after payment
            if (!orderWorker.isRunning()) {
                console.log("Starting worker from app!");
                orderWorker.run();
            }
        });
    } catch (error) {
        // error on initial connection
        // (mongoose will not automatically try to reconnect)
        console.error(error);
    }
}
run();

// error after initial connection established
mongoose.connection.on("error", (error) => {
    console.error(`Error occured after initial connection: ${error}`);
});
// various events to listen
mongoose.connection.on("connected", () => console.log("connected"));
mongoose.connection.on("disconnected", () => console.log("disconnected"));
mongoose.connection.on("reconnected", () => console.log("reconnected"));

// graceful shutdown of bullmq worker
const gracefulShutdown = async (signal) => {
    await orderWorker.close();

    // Other asynchronous closings
    process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
