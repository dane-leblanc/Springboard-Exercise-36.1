const express = require("express");
const router = new express.Router();
const Message = require("../models/message");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureCorrectUser,
} = require("../middleware/auth.js");
const ExpressError = require("../expressError");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/

router.get("/:id", ensureCorrectUser, async function (req, res, next) {
  try {
    const token = jwt.verify(req.body._token, SECRET_KEY);
    const username = token.username;
    let message = await Message.get(req.params.id);

    if (
      message.from_user.username !== username &&
      message.to_user.username !== username
    ) {
      throw new ExpressError(
        "You are not authorized to view this message",
        400
      );
    }
    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/

router.post("/", ensureLoggedIn, async function (req, res, next) {
  try {
    let { from_username, to_username, body } = req.body;
    if (!from_username || !to_username || !body) {
      throw new ExpressError(
        "You have not provided enough information to create a message",
        400
      );
    }
    let message = await Message.create();
    return res.json(message);
  } catch (err) {
    return next(err);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", ensureLoggedIn, async function (req, res, next) {
  try {
    const id = req.params.id;
    const username = req.user.username;
    const query = await db.query(
      `SELECT * FROM messages
             WHERE id=$1
             AND to_username=$2`,
      [id, username]
    );
    if (!query.rows.length) {
      throw new ExpressError(
        "You are not the intended recipient of this message",
        400
      );
    }
    const markAsRead = await Message.markRead(id);
    return res.json(markAsRead);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
