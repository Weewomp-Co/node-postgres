require("dotenv").config()
const express = require("express");
const app = express();
const { Client } = require("pg");
const text = "";
const bcrypt = require("bcrypt");
const bodyParser = require('body-parser')
const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "weewomp23",
  database: "postgres",
});
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const {v4: uuidv4 } = require('uuid')

app.use(express.json())
app.use(cookieParser())

const connectedDB = async () => {
  const connected = await client.connect();
  console.log("connected to DB.");
};

connectedDB();

const getAllUsers = async () => {
  const userdata = await client.query("INSERT INTO users(username, pwd)");
  console.log(userdata);
};

const getAllPosts = async () => {
  const posts = await client.query('SELECT * FROM posts')
  return posts;
}

app.get("/", async (req, res) => {
  if (req.cookies.jwt === undefined){
    res.redirect("/signin");
  } else {
    try {
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET)
    console.log(verified)
    res.sendFile(__dirname + '/pages/home.html')
    } catch(err){
      res.json({"message": `${err.message}`}).status(400).redirect('/signin')
    }
  }
});

app.get('/home', async (req, res) => {


  console.log(req.cookies.jwt)
  if (req.cookies.jwt === undefined){
    res.redirect("/signin");
  } else {
    try {
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET)
    console.log(verified)
    res.sendFile(__dirname + '/pages/home.html')
    } catch(err){
      res.json({"message": `${err.message}`}).status(400).redirect('/signin')
    }
  }
})

app.get("/signin", (req, res) => {
  res.sendFile(__dirname + "/pages/signin.html");
});

app.get("/signup", (req, res) => {
  res.sendFile(__dirname + '/pages/signup.html');
})

app.get("/getusers", async (req, res) => {
  const users = await client.query("SELECT * FROM users");
  console.log(users.rows);
});

app.get('/create', async (req, res) => {
  if (req.cookies.jwt === undefined){
    res.redirect("/signin");
  } else {
    try {
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET)
    console.log(verified)
    res.sendFile(__dirname + '/pages/create.html')
    } catch(err){
      res.json({"message": `${err.message}`}).status(400).redirect('/signin')
    }
  }
})

app.get('/posts/:id', async (req, res) => {
  if (req.cookies.jwt != undefined){


    try{
    
    const userid = jwt.decode(req.cookies.jwt) 
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET);
    var values = [userid.userid]
    var text = `SELECT * FROM posts WHERE userid = $1`
    const owner = await client.query(text, values);
    console.log(userid.userid)
    const match = await client.query('SELECT * FROM posts WHERE userid = $1', values)

    if (match.rows.length > 0){
      res.sendFile(__dirname + '/pages/ownedpost.html')
    } else {
      res.sendFile(__dirname + '/pages/post.html')
    }

    } catch(err){

      res.sendFile(__dirname + '/pages/signin.html').json({"error": `${err.message}`}).status(400)
    }
  }
})

app.get('/posts/:id/edit', (req, res) => {
  if (req.cookies.jwt === undefined){
    res.redirect("/signin");
  } else {
    try {
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET)
    console.log(verified)

    res.sendFile(__dirname + '/pages/edit.html')
    } catch(err){
      res.json({"message": `${err.message}`}).status(400).redirect('/signin')
    }
  }
})

app.put('/posts/:id/edit', async (req, res) => {
  if (req.cookies.jwt === undefined){
    res.redirect('/signin').status(500);
  } else {

    console.log(`edit request for ${req.params.id}`)
    const {title, _content} = req.body;

    console.log(req.params.id)
    console.log(title, _content)
    try {
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET)

    var text = `UPDATE posts SET title = '${title}'`
    var update = await client.query(text);

    var text = `UPDATE posts SET _content = '${_content}'`
    
    var update = await client.query(text)
    
    res.sendStatus(200)
    } catch(err) {
      res.json({"error": `${err.message}`}).status(400)
    }
  }
})

app.delete('/posts/:id', async (req, res) => {
  if (req.cookies.jwt === undefined){
    res.status(200).redirect("/signin");
  } else {
    try {
      const userid = jwt.decode(req.cookies.jwt) 
      const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET);
      var values = [userid.userid]
      var text = `SELECT * FROM posts WHERE userid = $1`
      const owner = await client.query(text, values);
      console.log(userid.userid)
      const match = await client.query('SELECT * FROM posts WHERE userid = $1', values)
  
      if (match.rows.length > 0){
        const deleteQuery = {
          name: 'delete-query',
          text: `DELETE FROM posts WHERE _id=$1`,
          values: [req.params.id]
        }

        const deleteResult = await client.query(deleteQuery)

        res.status(200).json({})     
      } else {
        res.status(200)
      }
    } catch(err){
      res.json({"message": `${err.message}`}).status(200).redirect('/signin')
    }
  }
})

app.get('/profile', (req, res) => {
  if (req.cookies.jwt === undefined){
    res.redirect("/signin");
  } else {
    try {
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET)
    console.log(verified)
    res.sendFile(__dirname + '/pages/profile.html')

    } catch(err){
      res.json({"message": `${err.message}`}).status(400).redirect('/signin')
    }
  }
})

app.post("/auth/signup", async (req, res) => {
  const { email, password, username } = req.body;

  const duplicateQuery = {
    name: "duplicate-check",
    text: "SELECT * FROM users WHERE email = $1",
    values: [email],
  };

  const duplicate = await client.query(duplicateQuery, async (err, result) => {
    if (result.rows.length > 0) {
      res.sendStatus(400);
    } else {
      const hashedPwd = await bcrypt.hash(password, 10);
      const text = "INSERT INTO users(email, pwd, userid, username) VALUES($1, $2, $3, $4) RETURNING *";
      const userid = uuidv4();
      const values = [email, hashedPwd, userid, username];
      console.log(email, password, hashedPwd);
      const result = await client.query(text, values);
      console.log(result.rows[0]);
      res.sendStatus(200);
    }
  });
});

app.post("/auth/signin", (req, res) => {
  const { email, password } = req.body;

  const duplicateQuery = {
    name: "duplicate-check",
    text: "SELECT * FROM users WHERE email = $1",
    values: [email],
  };

  const duplicate = client.query(duplicateQuery, async (err, result) => {
    if (result.rows.length > 0) {
      const match = await bcrypt.compare(password, result.rows[0].pwd);
      if (match) {
        var accessToken = jwt.sign(
          { "userid": `${result.rows[0].userid}` },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "30s" }
        );
        var refreshToken = jwt.sign(
          {"userid": `${result.rows[0].userid}`},
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: '1d'}
        ) 
        res.cookie('jwt', refreshToken, {httpOnly: true, maxAge: 300 * 1000}).status(200)
        res.json({accessToken})
        console.log(result.rows);
      } else {
        res.sendStatus(400);
      }
    } else {
      res.sendStatus(300);
    }
  });
});

app.get('/api/posts', async (req, res) => {
  if (req.cookies.jwt != undefined){

    try{

    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET);
    var text = 'SELECT * FROM posts'
    const posts = await client.query(text);

    res.json(posts.rows);
    } catch(err){
      res.json({"error": `${err.message}`}).status(400)
    }
  }
})

app.get('/api/posts/:id', async (req, res) => {
  if (req.cookies.jwt != undefined){

    try{

    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET);
    var text = `SELECT * FROM posts WHERE _id='${req.params.id}'`
    const posts = await client.query(text);

    res.json(posts.rows).status(200);
    } catch(err){
      res.json({"error": `${err.message}`}).status(400)
    }
  }
})

app.get('/api/userdata', async (req, res) => {
  if (req.cookies.jwt != undefined){

    try{

    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET);
    var text = `SELECT * FROM users WHERE _id='${req.params.id}'`
    const posts = await client.query(text);
    
    res.json(posts.rows).status(200);
    } catch(err){
      res.json({"error": `${err.message}`}).status(400)
    }
  }
})

app.post('/api/posts', async (req, res) => {
  if (req.cookies.jwt != undefined){

    const userid = await jwt.decode(req.cookies.jwt)
    const {title, _content} = req.body;
    const duplicateQuery = {
      name: "duplicate-check",
      text: "SELECT * FROM users WHERE userid = $1",
      values: [userid.userid],
    }
    
    console.log(userid.userid)
    
    const user = await client.query("SELECT * FROM users WHERE userid = $1", [userid.userid])

    const author = user.rows[0].username
    const _date = new Date();
    const _id = uuidv4();
    var values = [_id, author, title, _content, _date, userid.userid]
    try{
    
    const verified = jwt.verify(req.cookies.jwt, process.env.REFRESH_TOKEN_SECRET);
    var text = 'INSERT INTO posts(_id, author, title, _content, _date, userid) VALUES($1, $2, $3, $4, $5, $6) RETURNING *'
    const posts = await client.query(text, values);
    res.json({...posts.rows}).status(200);
    } catch(err){
      res.json({"error": `${err.message}`}).status(400)
    }
  }
})

app.listen(3071, () => {
  console.log(`Server is listentning on port ${3071}`);
});