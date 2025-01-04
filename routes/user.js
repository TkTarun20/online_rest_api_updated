const express = require("express");

const db = require("../models");
const { authUser, checkWorkerRun } = require("../middleware");
const userController = require("../controllers/user");
const {
    registerSchema,
    passwordLoginSchema,
    otpLoginSchema,
    emailSchema,
    infoSchema,
    addressSchema,
    changePasswordSchema,
    resetPasswordSchema,
} = require("../validation");

const router = express.Router();

// GET /user/delivery-charge (route for fetching delivery charge)
router.get("/delivery-charge", userController.deliveryCharge);

// POST /user/signup (route for creating/registering a new user)
router.post("/signup", registerSchema, userController.registerUser);

// POST /user/generate-login-otp (route for generating an OTP and sending it via email)
router.post(
    "/generate-login-otp",
    emailSchema,
    userController.generateLoginOTP
);

// POST /user/resend-login-otp (route for regenerating an OTP and sending it via email)
router.post("/resend-login-otp", userController.resendLoginOTP);

// POST /user/login-via-otp (route for logging in a user via otp)
router.post("/login-via-otp", otpLoginSchema, userController.loginUserViaOTP);

// POST /user/login-via-password (route for logging in a user via password)
router.post(
    "/login-via-password",
    passwordLoginSchema,
    userController.loginUserViaPassword
);

// PATCH /user/:userId/change-password (route for changing user's password)
router.patch(
    "/:userId/change-password",
    authUser,
    changePasswordSchema,
    userController.changePassword
);

// POST /user/forgot-password (route for creating reset password token and url, and sending url via email)
router.post("/forgot-password", emailSchema, userController.forgotPassword);

// PATCH /user/reset-password (route for resetting password using reset password link)
router.patch(
    "/reset-password",
    resetPasswordSchema,
    userController.resetPassword
);

// GET /user/userId (route for fetching user details)
router.get("/:userId", authUser, userController.getUserInfo);

// PATCH /user/userId (route for updating user's info)
router.patch("/:userId", authUser, infoSchema, userController.updateUserInfo);

// GET /user/userId/favorites (route for fetching user's favorites)
router.get("/:userId/favorites", authUser, userController.getUserFavorites);

// PATCH /user/userId/favorites (route for updating user's favorites)
router.patch(
    "/:userId/favorites",
    authUser,
    userController.updateUserFavorites
);

// PATCH /user/userId/image (route for updating user's image)
router.patch("/:userId/image", authUser, userController.updateUserImage);

// DELETE /user/userId/image (route for deleting user's image)
router.delete("/:userId/image", authUser, userController.deleteUserImage);

// GET /user/:userId/addresses (route for fetching all addresses of a user)
router.get("/:userId/addresses", authUser, userController.getUserAddresses);

// POST /user/:userId/address (route for creating a user's new address)
router.post(
    "/:userId/address",
    authUser,
    addressSchema,
    userController.createUserAddress
);

// GET /user/:userId/addresses/:addressId (route for getting a particular address of a user for updating it)
router.get(
    "/:userId/addresses/:addressId",
    authUser,
    userController.getUserAddress
);

// PATCH /user/:userId/addresses/:addressId (route for updating a particular address of a user)
router.patch(
    "/:userId/addresses/:addressId",
    authUser,
    addressSchema,
    userController.updateUserAddress
);

// PATCH /user/:userId/addresses/:addressId/markDefault (route for marking a particular address of a user as default)
router.patch(
    "/:userId/addresses/:addressId/markDefault",
    authUser,
    userController.markDefaultAddress
);

// DELETE /user/:userId/addresses/:addressId (route for deleting a particular address of a user)
router.delete(
    "/:userId/addresses/:addressId",
    authUser,
    userController.deleteUserAddress
);

// GET /user/userId/cart (route for fetching user's cart)
router.get("/:userId/cart", authUser, userController.getUserCart);

// POST /user/userId/cart (route for adding food items to a user's cart)
router.post("/:userId/cart", authUser, userController.addItemsToUserCart);

// PATCH /user/userId/cart (route for modifying cart item quantity)
router.patch("/:userId/cart", authUser, userController.updateCartItemQty);

// PUT /user/userId/cart (route for updating cart)
router.put("/:userId/cart", authUser, userController.updateUserCart);

// DELETE /user/userId/cart (route for deleting user's cartitem)
router.delete("/:userId/cart", authUser, userController.deleteUserCartItem);

// POST /user/:userId/create-checkout
router.post(
    "/:userId/create-checkout",
    authUser,
    userController.createCheckout
);

// PATCH /user/:userId/make-payment
router.patch(
    "/:userId/make-payment",
    authUser,
    checkWorkerRun,
    userController.makePayment
);

// GET /user/:userId/orders (route for getting user's orders)
router.get("/:userId/orders", authUser, userController.getUserOrders);

// GET /user/:userId/orders/orderId (route for getting user's particular order)
router.get("/:userId/orders/:orderId", authUser, userController.getUserOrder);

module.exports = router;
