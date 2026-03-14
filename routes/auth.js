let express = require("express");
let router = express.Router();
let userController = require("../controllers/users");
let {
  RegisterValidator,
  validatedResult,
  ChangePasswordValidator,
} = require("../utils/validator");
let bcrypt = require("bcrypt");
let jwt = require("jsonwebtoken");
const { check } = require("express-validator");
const { checkLogin } = require("../utils/authHandler");
const fs = require("fs");
const path = require("path");
const privateKey = fs.readFileSync(
  path.join(__dirname, "../utils/keys/private.pem"),
  "utf-8",
);
router.post(
  "/register",
  RegisterValidator,
  validatedResult,
  async function (req, res, next) {
    try {
      let { username, password, email } = req.body;
      let newUser = await userController.CreateAnUser(
        username,
        password,
        email,
        "69b2763ce64fe93ca6985b56",
      );
      res.send(newUser);
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  },
);
router.post("/login", async function (req, res, next) {
  try {
    let { username, password } = req.body;
    let user = await userController.FindUserByUsername(username);
    if (!user) {
      return res.status(404).send({
        message: "thong tin dang nhap khong dung",
      });
    }
    if (!user.lockTime || user.lockTime < Date.now()) {
      if (bcrypt.compareSync(password, user.password)) {
        user.loginCount = 0;
        await user.save();
        let token = jwt.sign({ id: user._id }, privateKey, {
          algorithm: "RS256",
          expiresIn: "1h",
        });
        return res.send(token);
      } else {
        user.loginCount++;
        if (user.loginCount == 3) {
          user.loginCount = 0;
          user.lockTime = new Date(Date.now() + 60 * 60 * 1000);
        }
        await user.save();
        return res.status(404).send({
          message: "thong tin dang nhap khong dung",
        });
      }
    } else {
      return res.status(404).send({
        message: "user dang bi ban",
      });
    }
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});
router.get("/me", checkLogin, function (req, res, next) {
  return res.status(200).send(req.user);
});
//  doi mat khau vaf check login de doi mat khau

router.post(
  "/changepassword",
  checkLogin,
  ChangePasswordValidator,
  validatedResult,
  async function (req, res, next) {
    try {
      let { oldPassword, newPassword } = req.body;

      if (bcrypt.compareSync(oldPassword, req.user.password)) {
        req.user.password = newPassword;
        await req.user.save();
        return res.send({ message: "doi mat khau thanh cong" });
      } else {
        return res.status(400).send({ message: "mat khau cu khong dung" });
      }
    } catch (error) {
      return res.status(500).send({ message: error.message });
    }
  },
);

module.exports = router;
