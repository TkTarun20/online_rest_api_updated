const crypto = require("crypto");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jose = require("jose");
const otpGenerator = require("otp-generator");
const { matchedData, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");

const db = require("../models");
const orderEmitter = require("../emitters/order_emitter");
const addJobs = require("../message_queues/queue");
const {
    convertToMongooseObjectID,
    converImageToBase64Data,
    uploadImage,
    deleteImage,
    getImageInfo,
} = require("../utils");

const DELIVERY_CHARGE = 20;

// email helper
async function sendEmail(recepient, subject, body) {
    // Create a transporter object
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // use SSL
        auth: {
            user: process.env.SENDER_EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    // Configure the mailoptions object
    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: recepient,
        subject,
        html: body,
    };

    // Send the email
    return transporter.sendMail(mailOptions);
}

const deliveryCharge = async (req, res, next) => {
    try {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // in reality get user delivery address details from the
        // client and calculate the distance between the user and
        // restaurant and on the basis of distance calculated
        // find the actual delivery charge from the database

        // for now just take the fix delivery charge of Rs. 20
        res.status(200).json({
            message: "Delivery charge is fetched successfully!",
            data: DELIVERY_CHARGE,
        });
    } catch (error) {
        next(error);
    }
};

const registerUser = async (req, res, next) => {
    try {
        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });
        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { first_name, last_name, email, mobile, password } = matchedData(
            req,
            { locations: ["body"] }
        );

        // check if a user with entered email or mobile already exists
        const user = await db.User.find({}).or([{ email }, { mobile }]);

        if (user.length > 0) {
            const errors = {
                form: {
                    errorType: "global",
                    message: "Entered email or mobile number is not allowed!",
                    path: "",
                },
            };

            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // register/create new user
        await db.User.create({
            first_name,
            ...(last_name && { last_name }),
            email,
            mobile,
            password: hashedPassword,
        });

        res.status(201).json({
            message: "New user is registered successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const generateLoginOTP = async (req, res, next) => {
    try {
        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });
        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();

            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { email } = matchedData(req, { locations: ["body"] });

        // check if the user with given email exists
        const user = await db.User.findOne({ email }, "email first_name");

        if (!user) {
            const errors = {
                form: {
                    errorType: "global",
                    message: "E-mail entered is not registered",
                    path: "",
                },
            };

            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        // delete old otp records of a user, if any
        await db.Otp.deleteMany({ email });

        // generate otp and hash it
        const otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        const hashedOtp = await bcrypt.hash(otp, 12);

        // store otp with other details in the database
        await db.Otp.create({
            email,
            otp: hashedOtp,
        });

        // send this OTP through email (for testing log to the console)
        const mailBody = `
            <div
                style="
                    font-family: Verdana, Arial, Helvetica, sans-serif;
                    font-size: 1rem;
                    background-color: #f1f0f0;
                    padding: 1.5rem 0;
                "
            >
                <div
                    style="
                        max-width: 26.25rem;
                        border: 1px solid #ccc;
                        background-color: #fff;
                        padding: 1.5rem;
                        margin: 0 auto;
                    "
                >
                    <h1
                        style="
                            font-size: 1.25rem;
                            color: #191006;
                            margin: 0 0 1.25rem;
                        "
                    >
                        Login via OTP
                    </h1>
                    <p
                        style="
                            line-height: 1.4;
                            color: #191006;
                            padding: 0;
                            margin: 0 0 1rem 0;
                        "
                    >
                        Hi ${user.first_name},
                    </p>
                    <p
                        style="
                            line-height: 1.4;
                            color: #191006;
                            padding: 0;
                            margin: 0 0 1rem 0;
                        "
                    >
                        Use the 4-digit OTP code below to log in to your account.
                    </p>
                    <p
                        style="
                            line-height: 1.4;
                            
                            color: #191006;
                            
                            padding: 0;
                            margin: 0 0 1.5rem 0;
                        "
                    >
                        This code expires in 5 minutes.
                    </p>
                    <p style="text-align: center; border: 1px solid #f9a33d; background-color: #fef6ec; padding: 0.75rem; margin: 0 0 1.5rem 0">
                        <strong style="font-size: 1.5rem; font-weight: 500; letter-spacing: 2px; color: #191006;">${otp}</strong>
                    </p>
                    <p style="color: #191006; margin: 0;">Didn't request this code? <a href="#" style="color: #956225;">Contact us</a>.</p>
                    <hr style="margin: 1.5rem 0" />
                    <div style="font-size: 0.75rem">
                        <strong style="font-weight: normal; color: #191006"
                            ><span style="font-weight: 600; color: #191006"
                                >Note:</span
                            >
                            This is a system generated email. Do not reply to this
                            email address!</strong
                        >
                    </div>
                </div>
            </div>
        `;

        await sendEmail(user.email, "Account Log In via OTP", mailBody);

        res.status(201).json({
            message: "Otp is sent to the email successfully!",
            data: email,
        });
    } catch (error) {
        next(error);
    }
};

const resendLoginOTP = async (req, res, next) => {
    try {
        const { email } = req.body;

        // check if the user with given email exists
        const user = await db.User.findOne({ email }, "email first_name");

        if (!user) {
            return res.status(400).json({
                message: "Malformed request!",
            });
        }

        // delete old otp records of a user, if any
        await db.Otp.deleteMany({ email });

        // generate otp and hash it
        const otp = otpGenerator.generate(4, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        const hashedOtp = await bcrypt.hash(otp, 12);

        // store otp with other details in the database
        await db.Otp.create({
            email,
            otp: hashedOtp,
        });

        // send this OTP through email (for testing log to the console)
        const mailBody = `
            <div
                style="
                    font-family: Verdana, Arial, Helvetica, sans-serif;
                    font-size: 1rem;
                    background-color: #f1f0f0;
                    padding: 1.5rem 0;
                "
            >
                <div
                    style="
                        max-width: 26.25rem;
                        border: 1px solid #ccc;
                        background-color: #fff;
                        padding: 1.5rem;
                        margin: 0 auto;
                    "
                >
                    <h1
                        style="
                            font-size: 1.25rem;
                            color: #191006;
                            margin: 0 0 1.25rem;
                        "
                    >
                        Login via OTP
                    </h1>
                    <p
                        style="
                            line-height: 1.4;
                            color: #191006;
                            padding: 0;
                            margin: 0 0 1rem 0;
                        "
                    >
                        Hi ${user.first_name},
                    </p>
                    <p
                        style="
                            line-height: 1.4;
                            color: #191006;
                            padding: 0;
                            margin: 0 0 1rem 0;
                        "
                    >
                        Use the 4-digit OTP code below to log in to your account.
                    </p>
                    <p
                        style="
                            line-height: 1.4;
                            
                            color: #191006;
                            
                            padding: 0;
                            margin: 0 0 1.5rem 0;
                        "
                    >
                        This code expires in 5 minutes.
                    </p>
                    <p style="text-align: center; border: 1px solid #f9a33d; background-color: #fef6ec; padding: 0.75rem; margin: 0 0 1.5rem 0">
                        <strong style="font-size: 1.5rem; font-weight: 500; letter-spacing: 2px; color: #191006;">${otp}</strong>
                    </p>
                    <p style="color: #191006; margin: 0;">Didn't request this code? <a href="#" style="color: #956225;">Contact us</a>.</p>
                    <hr style="margin: 1.5rem 0" />
                    <div style="font-size: 0.75rem">
                        <strong style="font-weight: normal; color: #191006"
                            ><span style="font-weight: 600; color: #191006"
                                >Note:</span
                            >
                            This is a system generated email. Do not reply to this
                            email address!</strong
                        >
                    </div>
                </div>
            </div>
        `;

        await sendEmail(user.email, "Account Log In via OTP", mailBody);

        res.status(201).json({
            message: "Otp is sent to the user successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const loginUserViaOTP = async (req, res, next) => {
    try {
        const result = validationResult(req);

        if (!result.isEmpty()) {
            return res.status(401).json({
                message: "Invalid OTP!",
            });
        }

        const { otp } = matchedData(req, { locations: ["body"] });
        const { email } = req.body;

        // check if the user with given email exists
        const user = await db.User.findOne({ email }, "-__v");

        if (!user) {
            return res.status(400).json({
                message: "Malformed request!",
            });
        }

        // fetch OTP from the database with the given email
        const otpDoc = await db.Otp.findOne({ email });

        if (!otpDoc) {
            return res.status(400).json({
                message: "Malformed request!",
            });
        }

        // check OTP
        const match = await bcrypt.compare(otp, otpDoc.otp);
        if (!match) {
            return res.status(401).json({
                message: "Invalid OTP!",
            });
        }

        // if OTP is correct but expired, then unauthenticate the user
        if (otpDoc.expiry_at < Date.now()) {
            return res.status(410).json({
                message: "OTP expired!",
            });
        }

        // if OTP is correct and not expired, then log in a user
        // jwt token
        const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);
        const alg = "HS256";
        const jwtPayload = {
            userId: user._id.toString(),
            role: user.role,
        };

        const jwtToken = await new jose.SignJWT(jwtPayload)
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime(`10800 secs`)
            .sign(encodedSecret);

        res.status(200).json({
            message: "User is logged in successfully!",
            data: {
                id: user._id.toString(),
                full_name: user["full_name"],
                image: user.image,
                email: user.email,
                role: user.role,
                access_token: jwtToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

const loginUserViaPassword = async (req, res, next) => {
    try {
        const result = validationResult(req);

        if (!result.isEmpty()) {
            return res.status(401).json({
                message: "Invalid credentials!",
            });
        }

        const { email, password } = matchedData(req, {
            locations: ["body"],
        });

        // check if the user with given email exists
        const user = await db.User.findOne({ email }, "-__v");

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials!",
            });
        }

        // check password
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({
                message: "Invalid credentials!",
            });
        }

        // jwt token
        const encodedSecret = new TextEncoder().encode(process.env.JWT_SECRET);
        const alg = "HS256";
        const jwtPayload = {
            userId: user._id.toString(),
            role: user.role,
        };

        const jwtToken = await new jose.SignJWT(jwtPayload)
            .setProtectedHeader({ alg })
            .setIssuedAt()
            .setExpirationTime(`10800 secs`)
            .sign(encodedSecret);

        res.status(200).json({
            message: "User is logged in successfully!",
            data: {
                id: user._id.toString(),
                full_name: user["full_name"],
                image: user.image,
                email: user.email,
                role: user.role,
                access_token: jwtToken,
            },
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);

        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });
        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { old_password, new_password } = matchedData(req, {
            locations: ["body"],
        });

        // check old password is correct or not
        const match = await bcrypt.compare(old_password, user.password);

        // if not, inform the client to enter correct password
        if (!match) {
            const errors = {
                old_password: {
                    errorType: "field",
                    message: "Wrong password entered",
                    path: "old_password",
                },
            };

            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        // if yes, update the password hash to new password hash
        const newHashedPassword = await bcrypt.hash(new_password, 12);
        user.password = newHashedPassword;
        await user.save();

        res.status(201).end();
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });

        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { email } = matchedData(req, {
            locations: ["body"],
        });

        const user = await db.User.findOne({ email }, "email");

        if (!user) {
            const errors = {
                form: {
                    errorType: "global",
                    message: "E-mail entered is not registered!",
                    path: "",
                },
            };

            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        // delete all user's previous token data if exists
        await db.UserToken.deleteMany({ user_id: user._id });

        // generate url token and hash it
        const token = crypto.randomBytes(20).toString("hex");
        const urlToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        await db.UserToken.create({ user_id: user._id, token: urlToken });

        const resetUrl = `${process.env.ALLOWED_DOMAIN}/reset-password?id=${user._id}&token=${urlToken}`;

        const mailBody = `
            <div
            style="
                font-family: Verdana, Arial, Helvetica, sans-serif;
                font-size: 1rem;
                background-color: #f1f0f0;
                padding: 1.5rem 0;
            "
        >
            <div
                style="
                    max-width: 26.25rem;
                    border: 1px solid #ccc;
                    background-color: #fff;
                    padding: 1.5rem;
                    margin: 0 auto;
                "
            >
                <h1
                    style="
                        font-size: 1.25rem;
                        color: #191006;
                        margin: 0 0 1.25rem;
                    "
                >
                    Reset your password
                </h1>
                <p
                    style="
                        line-height: 1.4;
                        color: #191006;
                        padding: 0;
                        margin: 0 0 1.5rem 0;
                    "
                >
                    We have received a request to reset your password. Please
                    reset your password by clicking on the button below within
                    the next 5 minutes.
                </p>
                <div style="margin-bottom: 1.5rem">
                    <a
                        href="${resetUrl}"
                        style="
                            display: inline-block;
                            border-radius: 5px;
                            color: #191006;
                            text-decoration: none;
                            background-color: #f9a33d;
                            padding: 0.5rem 0.75rem;
                        "
                        >Reset password</a
                    >
                </div>

                <p
                    style="
                        line-height: 1.4;
                        color: #191006;
                        padding: 0;
                        margin: 0 0 1rem;
                    "
                >
                    If you are unable to click the above button, copy & paste
                    the following URL into your address bar:
                </p>
                <a href="${resetUrl}" style="display: inline-block"
                    >${resetUrl}</a
                >
                <hr style="margin: 1.5rem 0" />
                <div style="font-size: 0.75rem">
                    <strong style="font-weight: normal; color: #191006"
                        ><span style="font-weight: 600; color: #191006"
                            >Note:</span
                        >
                        This is a system generated email. Do not reply to this
                        email address!</strong
                    >
                </div>
            </div>
        </div>
        `;

        // send this url through email
        await sendEmail(user.email, "Reset Password Link", mailBody);

        res.status(201).json({
            message: "Reset Password link has been sent to your email!",
        });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });

        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { password, confirm_password: confirmPassword } = matchedData(
            req,
            {
                locations: ["body"],
            }
        );

        const { url_token: urlToken, user_id: userId } = req.body;

        // if confirm new password is not equal to new password
        if (password !== confirmPassword) {
            const errors = {
                confirm_password: {
                    errorType: "field",
                    message:
                        "Confirm new password and new password do not match",
                    path: "confirm_password",
                },
            };

            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        if (!urlToken || !userId) {
            return res.status(400).json({
                message: "Invalid request!",
            });
        }

        // check token and its expiry
        const tokenData = await db.UserToken.findOne({
            user_id: convertToMongooseObjectID(userId),
        });

        if (!tokenData) {
            return res.status(400).json({
                message: "Invalid request!",
            });
        }

        if (urlToken !== tokenData.token) {
            return res.status(400).json({
                message: "Invalid request!",
            });
        }

        // if reset password link has expired
        if (tokenData.expiry_at < Date.now()) {
            return res.status(410).json({
                message: "Reset password link has been expired!",
            });
        }

        // hash new password
        const newHashedPassword = await bcrypt.hash(password, 12);

        // using transactions
        await mongoose.connection.transaction(async () => {
            // update password in database
            await db.User.findByIdAndUpdate(convertToMongooseObjectID(userId), {
                password: newHashedPassword,
            });

            // delete that token data after updating password
            await db.UserToken.deleteMany({ userId: tokenData.user_id });
        });

        res.status(200).json({
            message: "Password has been reset successfully!",
        });
    } catch (error) {
        next(error);
    }
};

const getUserInfo = async (req, res, next) => {
    try {
        let userImageURL;

        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(
            userId,
            "-password -role -__v"
        ).populate("cart.food_item");

        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // check user image exists or not
        if (user.image && !user.image.includes("avatars")) {
            // get cloudinary image url using 'image' stored
            // in users collection if image is not an avatar
            const imageInfo = await getImageInfo(user.image);
            userImageURL = imageInfo["secure_url"];
        } else {
            // avatar path stored as 'image'
            userImageURL = user.image;
        }

        res.status(200).json({
            message: "User's details are fetched successfully!",
            data: {
                id: user._id,
                first_name: user["first_name"],
                last_name: user["last_name"],
                full_name: user["full_name"],
                email: user.email,
                mobile: user.mobile,
                image: userImageURL,
                favorites: user.favorites,
                cart: user.cart,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateUserInfo = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });
        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { first_name, last_name, email, mobile } = matchedData(req, {
            locations: ["body"],
        });

        // check new email provided already exists or not
        if (email !== user.email) {
            const existingUser = await db.User.findOne({ email });

            if (existingUser) {
                const errors = {
                    form: {
                        errorType: "global",
                        message: "Entered email is not allowed!",
                        path: "",
                    },
                };

                return res.status(422).json({
                    message: "Form Validation Errors",
                    data: errors,
                });
            }
        }

        // check new mobile provided already exists or not
        if (mobile !== user.mobile) {
            const existingUser = await db.User.findOne({ mobile });

            if (existingUser) {
                const errors = {
                    form: {
                        errorType: "global",
                        message: "Entered mobile number is not allowed!",
                        path: "",
                    },
                };

                return res.status(422).json({
                    message: "Form Validation Errors",
                    data: errors,
                });
            }
        }

        user["first_name"] = first_name;
        user["last_name"] = last_name;
        user.email = email;
        user.mobile = mobile;

        await user.save();

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const getUserFavorites = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId, "favorites").populate(
            "favorites",
            "name image description type"
        );

        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        res.status(200).json({
            message: "User's favorites are fetched successfully!",
            data: user.favorites,
        });
    } catch (error) {
        next(error);
    }
};

const updateUserFavorites = async (req, res, next) => {
    try {
        const foodItemId = convertToMongooseObjectID(req.body.foodItemId);
        const message = req.body.message;

        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        if (message === "add") {
            user.favorites.push(foodItemId);
        } else if (message === "remove") {
            user.favorites.pull(foodItemId);
        } else {
            return res.status(400).json({
                message: "Malformed request",
            });
        }

        await user.save();

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const updateUserImage = async (req, res, next) => {
    try {
        const { image: avatarName } = req.body;
        const imageFile = req.file;

        let image;
        let errors;

        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // form field validation
        if (!avatarName && !imageFile) {
            errors = {
                image: {
                    errorType: "field",
                    message: ["This field is required"],
                    path: "image",
                },
            };
        }

        if (avatarName) {
            const isMatch = /^avatar-[1-8][.]svg$/.test(avatarName);

            if (!isMatch) {
                errors = {
                    image: {
                        errorType: "field",
                        message: ["Invalid avatar file"],
                        path: "image",
                    },
                };
            }
        }

        if (imageFile) {
            // check image type
            if (
                imageFile.mimetype !== "image/jpeg" &&
                imageFile.mimetype !== "image/png" &&
                imageFile.mimetype !== "image/svg"
            ) {
                errors = {
                    image: {
                        errorType: "field",
                        message: ["Invalid file format"],
                        path: "image",
                    },
                };
            }

            // check file size
            if (imageFile.size > 1 * 1024 * 1024) {
                errors = {
                    image: {
                        errorType: "field",
                        message: Array.isArray(errors?.image?.message)
                            ? errors.image.message.concat(
                                  "File size is greater than 1MB"
                              )
                            : ["File size is greater than 1MB"],
                        path: "image",
                    },
                };
            }
        }

        if (errors) {
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        if (avatarName) {
            // save avatar as image in database
            // if the uploaded data is an avatar
            image = path.join("ck_avatars", avatarName);
        } else {
            // else save image in cloudinary and then save
            // the returned public_id from cloudinary as
            // image in database

            // upload image to cloudinary using base64 encoded data url of image
            const imageBase64Uri = converImageToBase64Data(imageFile);

            const userName = user["full_name"].toLowerCase().replace(" ", "-");

            const imageOptions = {
                public_id_prefix: userName,
                display_name: `${userName}-${userMobile}`,
                asset_folder: "ck_user_avatars",
                allowed_formats: ["jpg", "png", "svg"],
            };

            const uploadRes = await uploadImage(imageBase64Uri, imageOptions);

            // image path to store in the database
            image = uploadRes.public_id;
        }

        // delete image from cloudinary if image in user database exists and
        // consists of the public_id returned from the cloudinary
        // (i.e. delete previous uploaded image from cloudinary while uploading
        // new image if previous image is not an avatar)
        if (user.image && !user.image.startsWith("ck_avatars")) {
            await deleteImage(user.image);
        }

        // save the new image_id in the database
        user.image = image;
        await user.save();

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const deleteUserImage = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userImagePath = user.image;

        if (!userImagePath) {
            return res.status(404).json({
                message: "Specified image does not exist!",
            });
        }

        user.image = "";

        // delete image from cloudinary if image_id in user database
        // consists of the public_id returned from the cloudinary
        // (i.e. delete image from cloudinary also if image is
        // not an avatar)
        if (!userImagePath.startsWith("ck_avatars")) {
            await deleteImage(userImagePath);
        }

        // save the user
        await user.save();

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const getUserAddresses = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userAddresses = await db.Address.find(
            { user_id: userId },
            "-__v"
        );

        res.status(200).json({
            message: "User's addresses are fetched successfully!",
            data: userAddresses,
        });
    } catch (error) {
        next(error);
    }
};

const createUserAddress = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });
        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { label, house, locality, landmark, city, state, pincode } =
            matchedData(req, {
                locations: ["body"],
            });

        // if existing addresses count is 0, then
        // mark this new address as default address
        const addressCount = await db.Address.countDocuments({
            user_id: userId,
        });

        const userAddress = await db.Address.create({
            label,
            house,
            locality,
            landmark,
            city,
            state,
            pincode,
            user_id: userId,
            ...(addressCount === 0 && { is_default: true }),
        });

        res.status(201).json({
            message: "User's new address is added successfully!",
            data: userAddress._id,
        });
    } catch (error) {
        next(error);
    }
};

const getUserAddress = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);
        const addressId = convertToMongooseObjectID(req.params.addressId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userAddress = await db.Address.findById(addressId);

        // check user address exists or not
        if (!userAddress) {
            return res.status(404).json({
                message: "Specified address does not exist!",
            });
        }

        res.status(200).json({
            message: "User's address is fetched successfully!",
            data: userAddress,
        });
    } catch (error) {
        next(error);
    }
};

const updateUserAddress = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);
        const addressId = convertToMongooseObjectID(req.params.addressId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const newValidationResult = validationResult.withDefaults({
            formatter: (error) => {
                return {
                    errorType: error.type,
                    message: error.msg,
                    path: error.path,
                };
            },
        });
        const result = newValidationResult(req);

        if (!result.isEmpty()) {
            const errors = result.mapped();
            return res.status(422).json({
                message: "Form Validation Errors",
                data: errors,
            });
        }

        const { label, house, locality, landmark, city, state, pincode } =
            matchedData(req, {
                locations: ["body"],
            });

        await db.Address.findByIdAndUpdate(addressId, {
            label,
            house,
            locality,
            landmark,
            city,
            state,
            pincode,
        });

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const markDefaultAddress = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);
        const addressId = convertToMongooseObjectID(req.params.addressId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // check afterwards
        const result = await db.Address.bulkWrite([
            {
                updateOne: {
                    filter: { user_id: userId, is_default: true },
                    update: { is_default: false },
                },
            },
            {
                updateOne: {
                    filter: { _id: addressId },
                    update: { is_default: true },
                },
            },
        ]);

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const deleteUserAddress = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);
        const addressId = convertToMongooseObjectID(req.params.addressId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // calculate user's total num. of addresses and check
        // the address to be deleted is not the default address
        // if user have more than 1 delivery address
        const addressCount = await db.Address.countDocuments();

        if (addressCount > 1) {
            const deletedAddress = await db.Address.findOneAndDelete({
                _id: addressId,
                is_default: false,
            });

            if (!deletedAddress) {
                return res.status(400).json({
                    message: "Malformed request!",
                });
            }
        } else {
            await db.Address.findByIdAndDelete(addressId);
        }

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const getUserCart = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId, "cart").populate(
            "cart.food_item",
            "-description -category_id -created_at -updated_at -__v"
        );
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        res.status(200).json({
            message: "User's cart is fetched successfully!",
            data: user.cart,
        });
    } catch (error) {
        next(error);
    }
};

const addItemsToUserCart = async (req, res, next) => {
    const foodItem = req.body;
    const quantity = 1;

    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId, "cart");
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // check whether the food item with the specified variant
        // is already present or not and then update cart accordingly
        const cartItemIdx = user.cart.findIndex(
            (cartItem) =>
                cartItem["food_item"].toString() === foodItem.id &&
                cartItem.variant === foodItem.variant
        );

        if (cartItemIdx !== -1) {
            // if present then increase its quantity
            const cartItemCopy = user.cart[cartItemIdx];
            cartItemCopy.quantity += quantity;
            const cartCopy = [...user.cart];
            cartCopy[cartItemIdx] = cartItemCopy;
            user.cart = cartCopy;
        } else {
            // if not present then add the food item as a new entry
            user.cart.push({
                food_item: convertToMongooseObjectID(foodItem.id),
                variant: foodItem.variant,
                quantity: quantity,
            });
        }

        const updatedUser = await user.save();

        res.status(201).json({
            message: "Food item is added to the cart successfully!",
            data: updatedUser.cart,
        });
    } catch (error) {
        next(error);
    }
};

const updateCartItemQty = async (req, res, next) => {
    const {
        id: foodId,
        variant: foodVariant,
        quantity: foodQuantity,
    } = req.body;

    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId, "cart");
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const cartItemIdx = user.cart.findIndex(
            (cartItem) =>
                cartItem["food_item"].toString() === foodId &&
                cartItem.variant === foodVariant
        );

        const copyCartItem = user.cart[cartItemIdx];
        copyCartItem.quantity += foodQuantity;

        const copyCart = [...user.cart];
        copyCart[cartItemIdx] = copyCartItem;

        user.cart = copyCart;
        await user.save();

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const updateUserCart = async (req, res, next) => {
    const { cartItemId, updatedVariant: updatedFoodVariant } = req.body;

    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId, "cart");
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const cartItemToModify = user.cart.id(
            convertToMongooseObjectID(cartItemId)
        );

        if (!cartItemToModify) {
            return res.status(404).json({
                message: "Could not update the requested resource!",
            });
        }

        // check if the updated cart item with specified variant
        // is already present in the cart or not
        const cartItemIdx = user.cart.findIndex(
            (cartItem) =>
                cartItem["food_item"].toString() ===
                    cartItemToModify["food_item"].toString() &&
                cartItem.variant === updatedFoodVariant
        );

        // using transaction
        await mongoose.connection.transaction(async () => {
            if (cartItemIdx !== -1) {
                // if present then increase its quantity
                const cartItemCopy = user.cart[cartItemIdx];
                cartItemCopy.quantity += cartItemToModify.quantity;
                const cartCopy = [...user.cart];
                cartCopy[cartItemIdx] = cartItemCopy;
                user.cart = cartCopy;

                // delete
                cartItemToModify.deleteOne();
            } else {
                // if not present then update the cart item
                // with the new varaint of the food item
                cartItemToModify.set({
                    food_item: cartItemToModify["food_item"],
                    variant: updatedFoodVariant,
                    quantity: cartItemToModify.quantity,
                });
            }

            await user.save();
        });

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const deleteUserCartItem = async (req, res, next) => {
    const foodId = req.query.foodId;
    const foodVariant = +req.query.foodVariant;

    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId, "cart");
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const modifiedCart = user.cart.filter(
            (cartItem) =>
                cartItem["food_item"].toString() !== foodId ||
                cartItem.variant !== foodVariant
        );

        user.cart = modifiedCart;
        await user.save();

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const createCheckout = async (req, res, next) => {
    try {
        let deliveryDiscount = 0;

        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);
        const addressId = convertToMongooseObjectID(req.body.addressId);

        // check user exists or not
        const user = await db.User.findById(userId).populate("cart.food_item");
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // fetch user's specified address for delivery
        const userAddress = await db.Address.findById(addressId);
        if (!userAddress) {
            return res.status(404).json({
                message: "Specified address does not exist..!!",
            });
        }

        // prepare order data
        const userDetails = {
            user_id: user._id,
            email: user.email,
            mobile: user.mobile,
        };

        const orderItems = user.cart.map((item) => {
            return {
                food_item_id: item.food_item._id,
                name: item.food_item.name,
                image: item.food_item.image,
                description: item.food_item.description,
                type: item.food_item.type,
                variant: item.food_item.variants[item.variant],
                quantity: item.quantity,
            };
        });

        const totalItemsAmount = orderItems.reduce((acc, item) => {
            const itemAmount = item.variant.price * item.quantity;
            return acc + itemAmount;
        }, 0);

        // calculate order total amount (including delivery charge and delivery discount)
        const totalAmount =
            totalItemsAmount + DELIVERY_CHARGE - deliveryDiscount;

        const deliveryAddress = {
            house: userAddress.house,
            locality: userAddress.locality,
            city: userAddress.city,
            state: userAddress.state,
            pincode: userAddress.pincode,
            ...(userAddress.landmark && { landmark: userAddress.landmark }),
        };

        // create an order
        const order = await db.Order.create({
            order_items: orderItems,
            delivery_address: deliveryAddress,
            user_details: userDetails,
            delivery_amount: DELIVERY_CHARGE,
            delivery_discount: deliveryDiscount,
            total_amount: totalAmount,
        });

        res.status(201).json({
            message: "Checkout is created successfully!",
            data: {
                orderId: order._id,
                totalAmount: order.total_amount,
            },
        });
    } catch (error) {
        next(error);
    }
};

const makePayment = async (req, res, next) => {
    try {
        const orderId = req.body.orderId;
        const paymentMethod = req.body.paymentMethod;
        const orderAmount = +req.body.orderAmount;

        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId).populate("cart.food_item");
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // fetch the order and check if it exists
        const userOrder = await db.Order.findById(
            convertToMongooseObjectID(orderId)
        );

        if (!userOrder) {
            return res.status(404).json({
                message: "Specified order does not exist!",
            });
        }

        // if the request data is corrupt,
        // it means the request is malformed
        if (userOrder.total_amount !== orderAmount) {
            // malformed request
            return res.status(400).json({
                state: "invalid",
                message: "Malformed request",
            });
        }

        // if request data is valid then
        // check if the order session is expired,
        // if expired, inform the client about it
        if (userOrder.expired_at < Date.now()) {
            return res.status(410).json({
                state: "expired",
                message: "Order session is expired!",
            });
        }

        // if not expired, update the order and its payment status
        if (userOrder.total_amount === orderAmount) {
            // IMITATE PAYMENT GATEWAY
            const paymentFailureChance = Math.random();

            // if failure chance <= 0.9, payment successful
            if (paymentFailureChance <= 0.9) {
                userOrder.order_status = "paid";
                userOrder.payment_method = paymentMethod;
                userOrder.payment_status = "paid";
                userOrder.invoice_id = orderId;

                // using transactions
                await mongoose.connection.transaction(async () => {
                    await userOrder.save();

                    // cart
                    user.cart = [];
                    await user.save();

                    await addJobs("confirm", { orderId: orderId });
                });

                return res.status(200).json({
                    message: "Payment is successful!",
                    data: {
                        orderId: userOrder._id,
                    },
                });
            }

            // if failure chance > 0.9, payment failed
            userOrder.payment_method = paymentMethod;
            userOrder.payment_status = "failed";

            await userOrder.save();

            res.status(500).json({
                message: "Payment failed!",
                data: {
                    orderId: userOrder._id,
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

const getUserOrders = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // fetch all orders of a user (either paid or failed)
        const userOrders = await db.Order.find({
            "user_details.user_id": userId,
        })
            .in("payment_status", ["paid", "failed"])
            .sort({ created_at: -1 });

        res.status(200).json({
            message: "User's orders fetched successfully!",
            data: userOrders,
        });
    } catch (error) {
        next(error);
    }
};

const getUserOrder = async (req, res, next) => {
    try {
        // check user is authorized or not
        if (req.userId !== req.params.userId) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        const userId = convertToMongooseObjectID(req.params.userId);
        const orderId = convertToMongooseObjectID(req.params.orderId);

        // check user exists or not
        const user = await db.User.findById(userId);
        if (!user) {
            return res.status(403).json({
                message: "Unauthorized access!",
            });
        }

        // fetch particular order of a user
        const userOrder = await db.Order.findById(orderId, "-__v");

        // check order exists or not
        if (!userOrder) {
            return res.status(404).json({
                message: "Specified order does not exist!",
            });
        }

        // while processing order, if any of the operation fails,
        // we will wait for 5 mins intentionally to make sure that
        // job has been failed in the queue and check if
        // the last entry in the orders collection has not been
        // updated since the 5 mins time elapsed, so we emit
        // the 'failed' event to update the 'order_status' to
        // "failed" state and fail the order in orders collection to
        // avoid infinite polling from the client
        if (
            Date.now() - userOrder.updated_at > 5 * 60 * 1000 &&
            !userOrder.order_fulfilled &&
            userOrder.payment_status === "paid" &&
            userOrder.order_status !== "failed"
        ) {
            orderEmitter.emit("failed", userOrder._id);
        }

        res.status(200).json({
            message: "User's order fetched successfully!",
            data: userOrder,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    deliveryCharge,
    registerUser,
    generateLoginOTP,
    resendLoginOTP,
    loginUserViaOTP,
    loginUserViaPassword,
    changePassword,
    forgotPassword,
    resetPassword,
    getUserInfo,
    updateUserInfo,
    getUserFavorites,
    updateUserFavorites,
    updateUserImage,
    deleteUserImage,
    getUserAddresses,
    createUserAddress,
    getUserAddress,
    updateUserAddress,
    markDefaultAddress,
    deleteUserAddress,
    getUserCart,
    addItemsToUserCart,
    updateCartItemQty,
    updateUserCart,
    deleteUserCartItem,
    createCheckout,
    makePayment,
    getUserOrders,
    getUserOrder,
};
