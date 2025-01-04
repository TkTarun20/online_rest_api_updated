const express = require("express");

const adminController = require("../controllers/admin");
const { passwordLoginSchema } = require("../validation");
const { authAdmin } = require("../middleware");

const router = express.Router();

// GET /admin/login (route for logging in admin via password)
router.post("/login", passwordLoginSchema, adminController.login);

// GET /admin/logout (route for logging out admin)
router.get("/logout", authAdmin, adminController.logout);

// GET /admin/categories (route for fetching all categories)
router.get("/categories", authAdmin, adminController.getCategories);

// POST /admin/category (route for creating a new category)
router.post("/category", authAdmin, adminController.createCategory);

// GET /admin/categories/categoryId (route for fetching a particular category)
router.get("/categories/:categoryId", authAdmin, adminController.getCategory);

// GET /admin/food_items (route for fetching all food items)
router.get("/food_items", authAdmin, adminController.getFoodItems);

// POST /admin/food_item (route for creating a new food item)
router.post("/food_item", authAdmin, adminController.createFoodItem);

// GET /admin/food_items/foodItemId (route for fetching a particular food item)
router.get("/food_items/:foodItemId", authAdmin, adminController.getFoodItem);

module.exports = router;
