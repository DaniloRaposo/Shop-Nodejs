const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const authenticated = require("../middlewares/authenticated");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
  "/login",
  body("email", "Please, enter a valid e-mail").isEmail(),
  body("password", "Password too short").isLength({ min: 6 }),
  authController.postLogin
);

router.post("/logout", authenticated, authController.postLogout);

router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  check("email")
    .isEmail()
    .withMessage("Please, enter a valid e-mail")
    .custom(async (value, { req }) => {
      return User.findOne({ email: value }).then((user) => {
        if (user) {
          return Promise.reject("The email is already been used");
        }
      });
    }),
  check("password", "Password too short").isLength({ min: 6 }),
  check("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords needs to match");
    }

    return true;
  }),
  authController.postSignup
);

router.get("/reset", authController.getReset);

router.post(
  "/reset",
  body("email", "Please, enter a valid e-mail").isEmail(),
  authController.postReset
);

router.get("/reset/:token", authController.getResetPassword);

router.post(
  "/reset-password",
  body("password", "Password too short").isLength({ min: 6 }),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords needs to match");
    }

    return true;
  }),
  authController.postResetPassword
);

module.exports = router;
