var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const JWT_SECRET = process.env.JWT_SECRET;
const authorization = require("../middleware/authorization")
if (!JWT_SECRET) {
  console.error("JWT_SECRET is not defined in environment variables");
  process.exit(1); // Exit the process with an error code
}

/* GET users listing. */


router.post('/register', function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers.then(users => {
    if (users.length > 0) {
      throw new Error("User already exists");
    }

    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    return req.db.from("users").insert({ email, hash });
  })
  .then(() => {
    res.status(201).json({ success: true, message: "User created" });
  })
  .catch(e => {
    res.status(500).json({ success: false, message: e.message });
  });
});

router.post('/login', function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    });
    return;
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers
    .then(users => {
      if (users.length === 0) {
        throw new Error("User does not exist");
      }

      const user = users[0];
      return bcrypt.compare(password, user.hash).then(match => {
        if (!match) {
          throw new Error("Passwords do not match");
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({
          token,
          token_type: "Bearer",
          expires_in: 60 * 60 * 24
        });
      });
    })
    .catch(e => {
      res.status(500).json({ success: false, message: e.message });
    });
});
router.get('/:email/profile', authorization, function(req, res, next) {
  const requestedEmail = req.params.email; 
  const authenticatedUserEmail = req.user.email; 

  // Check if the requested email matches the authenticated user's email
  const isAuthorized = (requestedEmail === authenticatedUserEmail);

  if (!isAuthorized) {
    
    return res.status(403).json({ error: true, message: "forbidden" });
  }

  req.db.from("users")
    .select("firstname", "lastname", "dob", "address")
    .where("email", "=", requestedEmail)
    .then(user => {
      if (!user || user.length === 0) {
        return res.status(404).json({ error: true, message: "User not found" });
      }

      // Prepare the response object with user profile information
      const userProfile = {
        email: requestedEmail,
        firstName: user[0].firstname,
        lastName: user[0].lastname,   
        dob: user[0].dob,
        address: user[0].address
      };

      res.status(200).json(userProfile); 
    })
    .catch(err => {
      console.error("Error fetching user profile:", err);
      res.status(500).json({ error: true, message: "Failed to fetch user profile" });
    });
});


router.put('/:email/profile', authorization, function(req, res, next) {
  const userEmail = req.params.email; 
  const userId = req.user.id; 

  // Debugs
  console.log("Email from token:", req.user.email);
  console.log("Email from URL parameter:", userEmail);

  // Forbidden
  if (req.user.email !== userEmail) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  // Retrieve updated information from request body
  const { firstName, lastName, dob, address } = req.body;

  // Check for required fields
  if (!firstName || !lastName || !dob || !address) {
    return res.status(400).json({ success: false, message: "Request body incomplete: firstName, lastName, dob, and address are required." });
  }

  // Log the incoming data for debugging
  console.log("Updating user with ID:", userId);
  console.log("Updating data:", { firstName, lastName, dob, address });

  // Perform database update
  req.db.from("users")
    .where("id", "=", userId)
    .update({ firstname: firstName, lastname: lastName, dob, address })
    .then(() => {
      res.status(200).json({ success: true, message: "User information updated successfully" });
    })
    .catch(err => {
      console.error("Database update error:", err);
      res.status(500).json({ success: false, message: "Failed to update user information", error: err.message });
    });
});

module.exports = router;