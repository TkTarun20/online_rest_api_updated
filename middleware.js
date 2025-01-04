const jose = require("jose");

const orderWorker = require("./message_queues/worker");

const authUser = async function (req, res, next) {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            const error = new Error("Unauthenticated! Login to continue.");
            error.status = 401;
            throw error;
        }
        const jwtToken = authHeader.split(" ")[1];

        if (!jwtToken) {
            const error = new Error("Unauthenticated! Login to continue.");
            error.status = 401;
            throw error;
        }

        const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);

        const { payload: decodedTokenPayload } = await jose.jwtVerify(
            jwtToken,
            encodedSecret
        );

        const userId = decodedTokenPayload.userId;
        req.userId = userId;

        next();
    } catch (error) {
        next(error);
    }
};

const authAdmin = async function (req, res, next) {
    try {
        const tokenCookie = req.get("Cookie");

        if (!tokenCookie) {
            const error = new Error("Unauthenticated! Login to continue.");
            error.status = 401;
            throw error;
        }

        const jwtToken = tokenCookie.split("=")[1];

        if (!jwtToken) {
            const error = new Error("Unauthenticated! Login to continue.");
            error.status = 401;
            throw error;
        }

        const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);

        const { payload: decodedTokenPayload } = await jose.jwtVerify(
            jwtToken,
            encodedSecret
        );

        const adminId = decodedTokenPayload.adminId;
        const role = decodedTokenPayload.role;

        req.adminId = adminId;
        req.role = role;

        next();
    } catch (error) {
        next(error);
    }
};

const checkWorkerRun = async function (req, res, next) {
    // start bullmq worker (if not running) to process jobs of
    // 'Order' queue to imitate processing of order after payment
    if (!orderWorker.isRunning()) {
        console.log("Starting worker from middleware!");
        orderWorker.run();
    }

    next();
};

module.exports = {
    authUser,
    authAdmin,
    checkWorkerRun,
};
