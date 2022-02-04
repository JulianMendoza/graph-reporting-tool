const { default: userEvent } = require("@testing-library/user-event");
const bcrypt = require("bcrypt");
const { ColumnSet } = require("pg-promise");
const connect = require("./connect");
const db = connect.db;
const app = connect.app;
const PORT = connect.PORT;
const express = connect.express;
const cookieParser = require("cookie-parser");
app.use(cookieParser());
const router = express.Router();
router.post("/register", (req, res) => {
  const body = req.body;
  const salt = bcrypt.genSaltSync(10);
  pass = bcrypt.hashSync(body.password, salt);
  db.any(
    "INSERT INTO secret(email,hash) values ('" +
      body.email +
      "','" +
      pass +
      "');"
  ).catch((error) => {
    console.error("Error:", error);
  });
});
router.post("/access", (req, res) => {
  //req.body
  //body.sessionID
  console.log(req.cookies);
});
router.post("/compare", (req, res) => {
  let roles = {};
  const body = req.body;
  db.any("SELECT hash from secret where email ='" + body.email + "';")
    .then((rows) => {
      if (rows.length > 0) {
        var result = bcrypt.compareSync(body.password, rows[0].hash);
        if (result) {
          db.any(
            "update secret set uid ='" +
              req.sessionID +
              "' where email ='" +
              body.email +
              "';"
          );
          db.any(
            "SELECT 1 FROM admins WHERE email = '" + body.email + "';"
          ).then((rows) => {
            roles["Admin"] = rows;
            db.any(
              "SELECT (course, number, section) FROM instructors WHERE email = '" +
                body.email +
                "';"
            ).then((rows) => {
              roles["Instructor"] = rows;
              db.any(
                "SELECT dep_name FROM departments WHERE email = '" +
                  body.email +
                  "';"
              )
                .then((rows) => {
                  roles["Department Head"] = rows;
                })
                .then(() => {
                  if (roles["Admin"].length > 0) {
                    res.cookie("admin", "true");
                  }
                  if (roles["Instructor"].length > 0) {
                    res.cookie("instructor", "true");
                  }
                  if (roles["Department Head"].length > 0) {
                    res.cookie("department", "true");
                  }
                  res.cookie("sessionID", req.sessionID);
                  res.json(roles);
                });
            });
          });
        } else {
          console.log("Password wrong");
          res.sendStatus(403);
        }
      } else {
        res.sendStatus(403);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});

module.exports = router;
