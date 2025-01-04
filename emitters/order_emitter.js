const { EventEmitter } = require("events");
const db = require("../models");

class OrderEmitter extends EventEmitter {}
const orderEmitter = new OrderEmitter({ captureRejections: true });

orderEmitter.on("failed", async function (orderId) {
    const order = await db.Order.findById(orderId);

    order.order_status = "failed";
    order.refund.status = "paid";
    order.refund.amount = order.total_amount;
    order.refund.refunded_at = new Date();
    await order.save();
});

orderEmitter.on("error", function (error) {
    console.error(`Order Emitter Error: ${error}`);
});

module.exports = orderEmitter;
