const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");
const authenticated = require("../middlewares/authenticated");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.get("/cart", authenticated, shopController.getCart);

router.post("/cart", authenticated, shopController.postCart);

router.post(
  "/cart-delete-item",
  authenticated,
  shopController.postCartDeleteProduct
);

router.get("/checkout", authenticated, shopController.getCheckout);

router.get(
  "/checkout/success",
  authenticated,
  shopController.getCheckoutSuccess
);

router.get("/checkout/cancel", authenticated, shopController.getCheckout);

router.get("/orders", authenticated, shopController.getOrders);

router.get("/orders/:orderId", authenticated, shopController.getOrderInvoice);

module.exports = router;
