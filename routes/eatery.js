const express = require("express");

const eateryControllers = require("../controllers/eatery");

const router = express.Router();

// GET /eatery/categories (route for fetching all categories with its food items)
router.get("/categories", eateryControllers.getMenu);

// GET /eatery/categories (route for fetching 6 random categories)
router.get("/categories/random", eateryControllers.getRandomCategories);

module.exports = router;
