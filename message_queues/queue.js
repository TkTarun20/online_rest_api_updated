const { Queue } = require("bullmq");

const orderQueue = new Queue("Order", {
    connection: {
        host: process.env.REDIS_HOST_URL,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        enableOfflineQueue: false,
    },
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 10,
    },
});

async function addJobs(name, jobData) {
    const globalConcurrency = await orderQueue.getGlobalConcurrency();
    if (globalConcurrency !== 4) {
        await orderQueue.setGlobalConcurrency(4);
    }

    const addedJob = await orderQueue.add(name, jobData);

    console.log(
        `Job with id - ${addedJob.id} containing order id - ${addedJob.data.orderId} is added to the queue!`
    );
}

module.exports = addJobs;
