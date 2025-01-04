const CategoryModel = require("./category");
const FoodItemModel = require("./food_item");
const UserModel = require("./user");
const UserTokenModel = require("./user_token");
const AddressModel = require("./address");
const OrderModel = require("./order");
const OtpModel = require("./otp");

module.exports = {
    Category: CategoryModel,
    FoodItem: FoodItemModel,
    User: UserModel,
    UserToken: UserTokenModel,
    Address: AddressModel,
    Order: OrderModel,
    Otp: OtpModel,
};
