const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const moment = require("moment");
const { validationResult } = require("express-validator");

const User = require("../models/user");
const user = require("../models/user");

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: {
    user: process.env.EMAIL_NODEMAIL_TRANSPORTER,
    pass: process.env.PASSWORD_NODEMAIL_TRANSPORTER,
  },
});

exports.getLogin = (req, res, next) => {
  const errorFlash = req.flash("error");

  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: errorFlash.length > 0 ? errorFlash[0] : null,
    oldEmail: "",
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldEmail: email,
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password",
          oldEmail: email,
        });
      }

      bcrypt.compare(password, user.password).then((compareResult) => {
        if (compareResult) {
          req.session.user = user;
          req.session.save((err) => {
            if (err) {
              console.log(err);
            }

            return res.redirect("/");
          });
        } else {
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Invalid email or password",
            oldEmail: email,
          });
        }
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }

    res.redirect("/");
  });
};

exports.getSignup = (req, res, next) => {
  const errorFlash = req.flash("error");

  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: errorFlash.length > 0 ? errorFlash[0] : null,
    oldEmail: "",
  });
};

exports.postSignup = (req, res, next) => {
  const HASH_SALT = 12;
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldEmail: email,
    });
  }

  bcrypt
    .hash(password, HASH_SALT)
    .then((hashPassword) => {
      const user = new User({
        email: email,
        password: hashPassword,
        cart: { items: [] },
      });

      return user.save();
    })
    .then(() => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getReset = (req, res, next) => {
  const errorFlash = req.flash("error");

  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: errorFlash.length > 0 ? errorFlash[0] : null,
  });
};

exports.postReset = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/reset", {
      path: "/reset",
      pageTitle: "Reset Password",
      errorMessage: errors.array()[0].msg,
    });
  }

  crypto.randomBytes(32, (err, buff) => {
    if (err) {
      req.flash("error", "An error has occurred");
      return res.redirect("/reset");
    }

    const token = buff.toString("hex");

    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "An user with that email has not been found");
          return res.redirect("/reset");
        }

        user.resetToken = token;
        user.resetTokenExpiration = moment().add(30, "minutes").toDate();
        user.save().then(() => {
          res.redirect("/");
          transport.sendMail({
            from: process.env.EMAIL_NODEMAIL_TRANSPORTER,
            to: req.body.email,
            subject: "Password Reset",
            html: `
              <p>A password reset of your email account was requested</p>
              <p>To reset password, click in this <a href="${
                req.protocol
              }://${req.get("host")}/reset/${token}">link</a></p>
            `,
          });
        });
      })
      .catch((err) => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
  });
};

exports.getResetPassword = (req, res, next) => {
  const token = req.params.token;
  const error = req.flash("error");

  User.findOne({ resetToken: token })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid token");
        return res.redirect("/login");
      } else if (moment().diff(moment(user.resetTokenExpiration)) > 0) {
        req.flash("error", "your reset token has expired");
        return res.redirect("/login");
      }

      res.render("auth/password", {
        path: "/reset-password",
        pageTitle: "Reset Password",
        token: token,
        errorMessage: error.length > 0 ? error[0] : null,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postResetPassword = (req, res, next) => {
  const HASH_SALT = 12;

  const token = req.body.token;
  const password = req.body.password;
  const errors = validationResult(req);
  let currentUser;

  if (!errors.isEmpty()) {
    req.flash("error", errors.array()[0].msg);
    return res.redirect(`/reset/${token}`);
  }

  User.findOne({ resetToken: token })
    .then((user) => {
      currentUser = user;

      currentUser.resetToken = null;
      currentUser.resetTokenExpiration = null;

      return bcrypt.hash(password, HASH_SALT);
    })
    .then((hashPassword) => {
      currentUser.password = hashPassword;

      return currentUser.save();
    })
    .then(() => {
      res.redirect("/login");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};
