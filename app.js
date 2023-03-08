const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express(); // instanceof express.
app.use(express.json());

const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(59111, () => {
      console.log("Server Running at http://localhost:59111/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// API-1 register a user

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const getUserDetailsQuery = `
  SELECT * FROM user WHERE username='${username}';`;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const databaseUserRow = await db.get(getUserDetailsQuery);
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      if (databaseUserRow === undefined) {
        const userRegisterQuery = `
                INSERT INTO user(username,name,password,gender,location)
                VALUES
                (
                    '${username}',
                    '${name}',
                    '${hashedPassword}',
                    '${gender}',
                    '${location}'
                    );`;
        await db.run(userRegisterQuery);
        response.send("User created successfully");
      } else {
        response.status(400);
        response.send("User already exists");
      }
    }
  } catch (error) {
    console.log(`sqlite error is ${error.message}`);
  }
});

// API-2 login a user

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const userGetQuery = `
    SELECT * FROM user WHERE username='${username}';`;
  const userGetRow = await db.get(userGetQuery);

  if (userGetRow === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatching = await bcrypt.compare(
      password,
      userGetRow.password
    );
    if (isPasswordMatching === true) {
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// API-3 change-password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const userGetQuery1 = `
    SELECT * FROM user WHERE username='${username}';`;
  const userGetRow1 = await db.get(userGetQuery1);

  const passwordMatches = await bcrypt.compare(
    oldPassword,
    userGetRow1.password
  );
  if (passwordMatches === false) {
    response.status(400);
    response.send("Invalid current password");
  } else {
    if (newPassword.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const updatedHashedPassword = await bcrypt.hash(newPassword, 10);
      const updatePasswordQuery = `
            UPDATE user SET 
            password='${updatedHashedPassword}'
            WHERE username='${username}';`;
      try {
        await db.run(updatePasswordQuery);
        response.send("Password updated");
      } catch (error) {
        console.log(`sqlite error is ${error.message}`);
      }
    }
  }
});

module.exports = app;
