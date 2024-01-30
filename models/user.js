const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
  },
});

userSchema.methods.addToCart = function (product) {
  const productIndex = this.cart?.items?.findIndex(
    (prod) => prod.productId.toString() === product._id.toString()
  );
  const updatedItems = [...this.cart?.items];

  if (productIndex >= 0) {
    updatedItems[productIndex].quantity =
      updatedItems[productIndex].quantity + 1;
  } else {
    updatedItems.push({ productId: product._id, quantity: 1 });
  }

  this.cart.items = updatedItems;
  return this.save();
};

userSchema.methods.deleteProductFromCart = function (productId) {
  this.cart.items = this.cart.items.filter(
    (item) => item.productId.toString() !== productId.toString()
  );

  return this.save();
};

module.exports = mongoose.model("User", userSchema);
