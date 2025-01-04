const { checkSchema } = require("express-validator");

// custom validation function
function customMatches(pattern) {
    function matchesEmptyOrNonEmpty(value) {
        if (value.length > 0) {
            if (pattern.test(value)) return true;
            return false;
        }
        return true;
    }
    return matchesEmptyOrNonEmpty;
}

// custom sanitizer functions
function toCapitalizeSanitizer(value) {
    if (value.length > 0) {
        const sanitizedValue =
            value[0].toUpperCase() + value.slice(1).toLowerCase();
        return sanitizedValue;
    }
    return value;
}

function toPascalCaseSanitizer(value) {
    if (value.length > 0) {
        const wordArray = value.split(" ");
        const capitalizedWordArray = wordArray.map(
            (word) => word[0].toUpperCase() + word.slice(1).toLowerCase()
        );

        const sanitizedValue = capitalizedWordArray.join(" ");
        return sanitizedValue;
    }
    return value;
}

// SCHEMAS
const registerSchema = checkSchema(
    {
        first_name: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "First name is required",
            },
            matches: {
                options: /^[A-Za-z]+$/,
                bail: true,
                errorMessage: "Only alphabets without spaces are allowed",
            },
            customSanitizer: {
                options: toCapitalizeSanitizer,
            },
        },
        last_name: {
            trim: true,
            custom: {
                options: customMatches(/^[A-Za-z]+$/),
                bail: true,
                errorMessage: "Only alphabets without spaces are allowed",
            },
            customSanitizer: {
                options: toCapitalizeSanitizer,
            },
        },
        email: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "E-mail is required",
            },
            toLowerCase: true,
            isEmail: {
                bail: true,
                errorMessage: "Invalid e-mail format",
            },
        },
        mobile: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Mobile number is required",
            },
            isMobilePhone: {
                options: "en-IN",
                bail: true,
                errorMessage:
                    "Must start with either 6, 7, 8 or 9 and contain digits only",
            },
        },
        password: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Password is required",
            },
            isLength: {
                options: { min: 8, max: 128 },
                bail: true,
                errorMessage:
                    "Password length must be in the range of 8-128 characters",
            },
            matches: {
                options:
                    /(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}/,
                bail: true,
                errorMessage: "Invalid password format",
            },
        },
    },
    ["body"]
);

const passwordLoginSchema = checkSchema(
    {
        email: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "E-mail is required",
            },
            toLowerCase: true,
            isEmail: {
                bail: true,
                errorMessage: "Invalid e-mail format",
            },
        },
        password: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Password is required",
            },
        },
    },
    ["body"]
);

const otpLoginSchema = checkSchema(
    {
        otp: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "OTP is required",
            },
            matches: {
                options: /^[0-9]{4}$/,
                bail: true,
                errorMessage: "Invalid OTP",
            },
        },
    },
    ["body"]
);

const changePasswordSchema = checkSchema(
    {
        old_password: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Old password is required",
            },
        },
        new_password: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "New password is required",
            },
            isLength: {
                options: { min: 8, max: 128 },
                bail: true,
                errorMessage:
                    "Password length must be in the range of 8-128 characters",
            },
            matches: {
                options:
                    /(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}/,
                bail: true,
                errorMessage: "Invalid password format",
            },
        },
    },
    ["body"]
);

const emailSchema = checkSchema(
    {
        email: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "E-mail is required",
            },
            toLowerCase: true,
            isEmail: {
                bail: true,
                errorMessage: "Invalid e-mail format",
            },
        },
    },
    ["body"]
);

const resetPasswordSchema = checkSchema(
    {
        password: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "New password is required",
            },
            isLength: {
                options: { min: 8, max: 128 },
                bail: true,
                errorMessage:
                    "Password length must be in the range of 8-128 characters",
            },
            matches: {
                options:
                    /(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}/,
                bail: true,
                errorMessage: "Invalid password format",
            },
        },
        confirm_password: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Confirm new password is required",
            },
        },
    },
    ["body"]
);

const mobileSchema = checkSchema({
    mobile: {
        trim: true,
        notEmpty: {
            bail: true,
            errorMessage: "Mobile number is required",
        },
        isMobilePhone: {
            options: "en-IN",
            bail: true,
            errorMessage:
                "Must start with either 6, 7, 8 or 9 and contain digits only",
        },
    },
});

const infoSchema = checkSchema(
    {
        first_name: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "First name is required",
            },
            matches: {
                options: /^[A-Za-z]+$/,
                bail: true,
                errorMessage: "Only alphabets are allowed",
            },
            customSanitizer: {
                options: toCapitalizeSanitizer,
            },
        },
        last_name: {
            trim: true,
            custom: {
                options: customMatches(/^[A-Za-z]+$/),
                bail: true,
                errorMessage: "Only alphabets are allowed",
            },
            customSanitizer: {
                options: toCapitalizeSanitizer,
            },
        },
        email: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "E-mail is required",
            },
            toLowerCase: true,
            isEmail: {
                bail: true,
                errorMessage: "Invalid e-mail format",
            },
        },
        mobile: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Mobile number is required",
            },
            isMobilePhone: {
                options: "en-IN",
                bail: true,
                errorMessage:
                    "Must start with either 6, 7, 8 or 9 and contain digits only",
            },
        },
    },
    ["body"]
);

const addressSchema = checkSchema(
    {
        label: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Address label is required",
            },
            matches: {
                options: /^(Home|Work|Other)$/i,
                bail: true,
                errorMessage:
                    "Select address label from available options only",
            },
            toLowerCase: true,
        },
        house: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Building / Flat / Apartment No. is required",
            },
            matches: {
                options: /^[A-Za-z0-9][A-Za-z0-9.,-/ ]*$/i,
                bail: true,
                errorMessage:
                    "Only alphabets, digits, spaces and characters such as .-/, are allowed",
            },
        },
        locality: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Locality is required",
            },
            matches: {
                options: /^[A-Za-z0-9][A-Za-z0-9.,-/ ]*$/i,
                bail: true,
                errorMessage:
                    "Only alphabets, digits, spaces and characters such as .-/, are allowed",
            },
        },
        landmark: {
            trim: true,
            custom: {
                options: customMatches(/^[A-Za-z0-9][A-Za-z0-9.,-/ ]*$/i),
                bail: true,
                errorMessage:
                    "Only alphabets, digits, spaces and characters such as .-/, are allowed",
            },
        },
        city: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "City is required",
            },
            customSanitizer: {
                options: toCapitalizeSanitizer,
            },
            equals: {
                options: "Bhopal",
                bail: true,
                errorMessage: "We don't deliver outside Bhopal, Madhya Pradesh",
            },
        },
        state: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "State is required",
            },
            customSanitizer: {
                options: toPascalCaseSanitizer,
            },
            equals: {
                options: "Madhya Pradesh",
                bail: true,
                errorMessage: "We don't deliver outside Bhopal, Madhya Pradesh",
            },
        },
        pincode: {
            trim: true,
            notEmpty: {
                bail: true,
                errorMessage: "Pincode is required",
            },
            matches: {
                options: /^46[0-9]{4}$/,
                bail: true,
                errorMessage:
                    "Must start with 46 and contain exactly six digits",
            },
            matches: {
                options: /^46[23][0-9]{3}$/,
                bail: true,
                errorMessage: "Third digit in pincode must be either 2 or 3",
            },
        },
    },
    ["body"]
);

module.exports = {
    registerSchema,
    passwordLoginSchema,
    otpLoginSchema,
    changePasswordSchema,
    emailSchema,
    resetPasswordSchema,
    mobileSchema,
    infoSchema,
    addressSchema,
};
