const moment = require("moment");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const stripe = require("stripe")(process.env.PRIVATE_STRIPE_KEY);

const Product = require("../models/product");
const Order = require("../models/order");

const NUMBER_ITEMS_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = Number(req.query.page) || 1;
  let numberProducts;

  Product.find()
    .countDocuments()
    .then((numberDocuments) => {
      numberProducts = numberDocuments;

      return Product.find()
        .skip((page - 1) * NUMBER_ITEMS_PAGE)
        .limit(NUMBER_ITEMS_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
        pageSelected: page,
        numberPages: Math.ceil(numberProducts / NUMBER_ITEMS_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = Number(req.query.page) || 1;
  let numberProducts;

  Product.find()
    .countDocuments()
    .then((numberDocuments) => {
      numberProducts = numberDocuments;

      return Product.find()
        .skip((page - 1) * NUMBER_ITEMS_PAGE)
        .limit(NUMBER_ITEMS_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        pageSelected: page,
        numberPages: Math.ceil(numberProducts / NUMBER_ITEMS_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: user.cart.items,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;

  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;

  req.user
    .deleteProductFromCart(prodId)
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products;

  req.user
    .populate("cart.items.productId")
    .then((user) => {
      products = user.cart.items;

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => ({
          price_data: {
            unit_amount: p.productId.price * 100,
            currency: "usd",
            product_data: {
              name: p.productId.title,
              description: p.productId.description,
            },
          },
          quantity: p.quantity,
        })),
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/checkout/success`,
        cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`,
      });
    })
    .then((session) => {
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        total: products
          .map((item) => item.productId.price * item.quantity)
          .reduce((previous, current) => previous + current, 0),
        sessionId: session.id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  const order = new Order({
    items: req.user.cart.items,
    user: req.user._id,
  });

  order
    .save()
    .then(() => {
      req.user.cart.items = [];
      return req.user.save();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  const error = req.flash("error");

  Order.find({ user: req.user })
    .populate("items.productId")
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        errorMessage: error.length > 0 ? error[0] : null,
        orders: orders.map((order) => {
          order.created = moment(order.createdAt).format("DD/MM/YYYY, HH:mm");
          return order;
        }),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrderInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = "invoice-" + orderId + ".pdf";

  Order.findById(orderId)
    .populate("items.productId")
    .then((order) => {
      if (!order) {
        req.flash("error", "Invalid order");
        return res.redirect("/orders");
      } else if (order.user.toString() !== req.user._id.toString()) {
        req.flash("error", "Unauthorized user");
        return res.redirect("/orders");
      }
      const pdfDoc = new PDFDocument();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
      pdfDoc.pipe(
        fs.createWriteStream(path.join("data", "invoices", invoiceName))
      );
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", { underline: true });
      pdfDoc.text("---------------------------------");
      order.items.forEach((item) => {
        return pdfDoc
          .fontSize(14)
          .text(`${item.productId.title} - (${item.quantity})`);
      });

      pdfDoc.end();
    })
    .catch((err) => {
      return next(err);
    });
};
