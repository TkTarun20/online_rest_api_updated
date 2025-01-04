const { Worker, QueueEvents } = require("bullmq");
const addJobs = require("./queue");
const db = require("../models");
const { convertToMongooseObjectID } = require("../utils");

const orderWorker = new Worker(
    "Order",
    async (job) => {
        let order;

        switch (job.name) {
            case "confirm":
                // accepting order
                await new Promise((resolve) => setTimeout(resolve, 10000));

                order = await db.Order.findById(
                    convertToMongooseObjectID(job.data.orderId)
                );
                order.order_status = "confirmed";
                await order.save();

                await addJobs("cook", job.data);

                return `Order ${job.data.orderId} is confirmed!`;

            case "cook":
                // cooking food
                await new Promise((resolve) => setTimeout(resolve, 10000));

                order = await db.Order.findById(
                    convertToMongooseObjectID(job.data.orderId)
                );

                order.order_status = "cooked";
                await order.save();

                await addJobs("deliver", job.data);

                return `Order ${job.data.orderId} is ready!`;

            case "deliver":
                // delivering order
                await new Promise((resolve) => setTimeout(resolve, 10000));

                order = await db.Order.findById(
                    convertToMongooseObjectID(job.data.orderId)
                );

                order.order_fulfilled = true;
                order.order_status = "completed";
                order.delivered_at = Date.now();
                await order.save();

                return `Order ${job.data.orderId} is delivered!`;
        }
    },
    {
        connection: {
            host: process.env.REDIS_HOST_URL,
            port: process.env.REDIS_PORT,
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
        },
        concurrency: 4,
        autorun: false,
    }
);

orderWorker.on("error", (error) => {
    console.error("Worker error: ", error);
});

const queueEvents = new QueueEvents("Order", {
    connection: {
        host: process.env.REDIS_HOST_URL,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
    },
});

queueEvents.on("completed", ({ jobId, returnvalue }) => {
    console.log(`JobId: ${jobId} | Message: ${returnvalue}`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.log(`Job id - ${jobId} has failed with reason ${failedReason}`);
});

module.exports = orderWorker;
