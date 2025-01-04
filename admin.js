const readline = require("readline/promises");
const { stdin: input, stdout: output, env } = require("process");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const db = require("./models");

let first_name, last_name, email, mobile, password;

const rl = readline.createInterface({ input, output });

const main = async function () {
    try {
        first_name = await rl.question("First Name: ");

        if (!first_name.trim()) {
            rl.close();
            throw new Error("First name is required!");
        }

        last_name = await rl.question("Last Name (optional): ");

        email = await rl.question("Email: ");

        if (!email.trim()) {
            rl.close();
            throw new Error("Email is required!");
        }

        mobile = await rl.question("Mobile: ");

        if (!mobile.trim()) {
            rl.close();
            throw new Error("Mobile no. is required!");
        }

        password = await rl.question("Password: ");

        if (!password.trim()) {
            rl.close();
            throw new Error("Password is required!");
        }

        console.log("Creating admin...");

        rl.close();

        // db connection
        await mongoose.connect(
            `mongodb+srv://${env.MONGODB_USER}:${env.MONGODB_PASSWORD}@cluster0.wmqwfwt.mongodb.net/${env.MONGODB_DB_NAME}?retryWrites=true&w=majority`
        );

        // check if a user with entered email or mobile already exists
        const user = await db.User.find({}).or([{ email }, { mobile }]);

        if (user.length > 0) {
            throw new Error("Entered email or mobile number is not allowed!");
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
            role: "admin",
        });

        console.log("Admin created! Log in to continue.");
    } catch (error) {
        console.log(error.message);
    } finally {
        await mongoose.connection.destroy();
    }
};

main();
