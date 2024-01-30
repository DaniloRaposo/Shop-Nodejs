const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const authenticated = require("../middlewares/authenticated");

const router = express.Router();

// /admin/add-product => GET
router.get("/add-product", authenticated, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", authenticated, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  authenticated,
  [
    body("title", "Title is a required field").isLength({ min: 1 }),
    body("price", "Price is a required field").isNumeric(),
    body("description", "Description is a required field").isLength({ min: 1 }),
  ],
  adminController.postAddProduct
);

router.get(
  "/edit-product/:productId",
  authenticated,
  adminController.getEditProduct
);

router.post(
  "/edit-product",
  authenticated,
  [
    body("title", "Title is a required field").isLength({ min: 1 }),
    body("price", "Price is a required field").isNumeric(),
    body("description", "Description is a required field").isLength({ min: 1 }),
  ],
  adminController.postEditProduct
);

router.delete(
  "/product/:productId",
  authenticated,
  adminController.deleteProduct
);

module.exports = router;
