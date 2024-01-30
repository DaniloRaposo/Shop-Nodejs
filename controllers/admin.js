const Product = require("../models/product");
const { validationResult } = require("express-validator");

const deleteFile = require("../util/files");

const NUMBER_ITEMS_PAGE = 3;

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    handlePostError: false,
    errorMessage: null,
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);

  if (!errors.isEmpty() || !image) {
    const errorMessage = !image
      ? "Attached file is not a image"
      : errors.array()[0].msg;

    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      handlePostError: true,
      product: {
        title: title,
        description: description,
        price: price,
      },
      errorMessage: errorMessage,
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.session.user?._id,
  });

  product
    .save()
    .then(() => {
      res.redirect("/");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }

      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        handlePostError: false,
        product: product,
        errorMessage: null,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const errors = validationResult(req);
  const image = req.file;

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      handlePostError: true,
      product: {
        title: req.body.title,
        price: req.body.price,
        description: req.body.description,
        _id: prodId,
      },
      errorMessage: errors.array()[0].msg,
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }

      product.title = req.body.title;
      product.price = req.body.price;
      product.description = req.body.description;
      if (image) {
        deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }

      return product.save().then(() => {
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  const page = Number(req.query.page) || 1;
  let numberProducts;

  Product.find({ userId: req.user._id })
    .countDocuments()
    .then((numberDocuments) => {
      numberProducts = numberDocuments;

      return Product.find({ userId: req.user._id })
        .skip((page - 1) * NUMBER_ITEMS_PAGE)
        .limit(NUMBER_ITEMS_PAGE);
    })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
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

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.status(500).json({ message: "Product not found" });
      }

      deleteFile(product.imageUrl);

      return Product.deleteOne({ _id: prodId, userId: req.user._id }).then(
        () => {
          res.status(200).json({ message: "Success" });
        }
      );
    })
    .catch((err) => {
      res.status(500).json({ message: "An error has occurred" });
    });
};
