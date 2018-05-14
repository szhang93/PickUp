require('./config/config.js');
const express=require("express");
const mongo=require("mongodb").MongoClient;
var {mongoose} = require('./db/mongoose.js');
const bodyParser=require("body-parser");
const mkprofile=require("./src/server/mkprofile.js");
const friends=require("./src/server/friends.js");
const gamepage=require("./src/server/gamepage.js");

var {Game} = require('./db/game.js');

//var mongoUrl = 'mongodb://pickup:cs115@ds251819.mlab.com:51819/pickup';

const app=express();
/*configurations*/
app.use(express.static("./dist"));
app.use(bodyParser.json());
/*app.use(bodyParser.urlencoded({
  extended: true
}));*/

/*sends index.html to any link*/
app.get("*",(req,res)=>{
  res.sendFile(__dirname+"/dist/index.html");
  console.log('[', (new Date()).toLocaleTimeString(), "] Main file sending");
});
app.post("/user",(req,res)=>{
	mkprofile.getUsers(req.body.user,res);
});
app.post("/isuser",(req,res)=>{
  mkprofile.isUser(req.body.user,res);
})
app.post("/saveprofile",(req,res)=>{
	mkprofile.saveProfile(req.body,res);
});
app.post("/signup",(req,res)=>{
	mkprofile.signUp(req.body,res);
});
app.post("/signin",(req,res)=>{
	mkprofile.signIn(req.body,res);
});
app.post("/getallusers",(req,res)=>{
  mkprofile.getAllUsers(res);
});
app.post("/getemail",(req,res)=>{
  mkprofile.getEmail(req.body["user"],res);
});
app.post("/setemail",(req,res)=>{
  mkprofile.setEmail(req.body["user"],req.body["email"],res);
});
app.post("/setpassword",(req,res)=>{
  mkprofile.setPassword(req.body["user"],req.body["oldPassword"],req.body["newPassword"],res);
});
app.post("/uploadprofilepicture",(req,res)=>{
  mkprofile.uploadProfilePicture(req.body["image"],req.body["user"],req.body["filetype"],res);
})
app.post("/reqfriend",(req,res)=>{
  friends.reqFriend(req.body["user"],req.body["friend"],res);
})
app.post("/acceptfriend",(req,res)=>{
  friends.acceptFriend(req.body["user"],req.body["friend"],res);
})
app.post("/isfriend",(req,res)=>{
  friends.isFriend(req.body["user"],req.body["friend"],res);
})
app.post("/declinefriend",(req,res)=>{
  friends.declineFriend(req.body["user"],req.body["friend"],res);
})
app.post("/removefriend",(req,res)=>{
  friends.removeFriend(req.body["user"],req.body["friend"],res);
})
app.post("/isgame",(req,res)=>{
  gamepage.isGame(req.body["id"],res);
})


/*----------------------------------------------------------------------------------------*/
const makeValid = (obj) => {return obj != null ? obj : "";};
var mongoUrl = 'mongodb://pickup:cs115@ds251819.mlab.com:51819/pickup';

app.post("/join", (req, res) =>
{
  console.log('[', (new Date()).toLocaleTimeString(), "] Game joined");

  mongo.connect(mongoUrl, (err, client) =>
  {
    var collection = client.db("pickup").collection("games");
    var query = {id: req.body.gid};
    var newPlayer = { $push: {players: req.body.uid} };

    console.log("user: ", req.body.uid);
    var userQuery = {username: req.body.uid};
    var joinedGame = {$push: {games: req.body.gid}};
    client.db("pickup").collection("users").update(userQuery, joinedGame);

    collection.update(query, newPlayer, (err) =>
    {
      if (err) throw err;
      client.close();
    });

  });

});


app.post("/nearbygames", (req, res) => {
    console.log('[', (new Date()).toLocaleTimeString(), "] Nearby games sending");

    let range = req.body.range;
    let center = req.body.center;

    mongo.connect(mongoUrl, (err, client) =>{
        if (err) throw err;

        let collection = client.db("pickup").collection("games");

        let query = {"coords.lat": {$gt: center.lat - range.lat, $lt: center.lat + range.lat},
                "coords.lng": {$gt: center.lng - range.lng, $lt: center.lng + range.lng }

        };
        collection.find(query).toArray((err, result) => {
            if (err) throw err;
            console.log(result);
            res.json(result);
            res.end();
            client.close();
        });

    });
});


// return the games that the user has played
app.post("/usergames", (req, res) => {
    console.log('[', (new Date()).toLocaleTimeString(), "] Sending ", req.body.user.trim(), "'s games");

    mongo.connect(mongoUrl, (err, client) => {
        if (err) throw err;
        let username = {username: req.body.user.trim()};
        let users = client.db("pickup").collection("users");
        let games = client.db("pickup").collection("games");
        users.findOne(username, (err, user) => {
            let userGames = {id: {$in: user.games} };
            games.find(userGames).toArray((err, results) => {
                if (err) throw err;
                res.json(results);
                res.end();
                client.close();
            });
        });

    });
});

// add a game to the data base
app.post("/postgames", (req, res) =>
{
  console.log('[', (new Date()).toLocaleTimeString(), "] Game received");

  var game = {
    sport: makeValid(req.body.sport),
    name: makeValid(req.body.name),
    location: makeValid(req.body.location),
    isprivate:makeValid(req.body.isprivate),
    id: makeValid(req.body.gameId),
    owner: makeValid(req.body.user),
    players: [makeValid(req.body.user),],
    coords: req.body.coords,
  };


  mongo.connect(mongoUrl, (err, db) => {
    if (err) throw err;

    db.db("pickup").collection("games").insertOne(game,() => {res.json(); db.close()});

   });

  /*
  game.save().then((doc) => {
      res.send(doc);
    }, (e) => {
      res.status(400).send(e);
  })
  */
});

app.post("/retrievegames", (req, res) =>
{
  console.log('[', (new Date()).toLocaleTimeString(), "] Games sending");

  mongo.connect(mongoUrl, (err, db) => {
    if (err) throw err;
    db.db("pickup").collection("games").find({}).toArray((err, result) => {
      if (err) throw err;
      res.json(result);
      res.end();
      db.close();


    });


  });

});



app.post("/join", (req, res) =>
{
  console.log('[', (new Date()).toLocaleTimeString(), "] Game joined");

  mongo.connect(mongoUrl, (err, client) =>
  {
    var collection = client.db("pickup").collection("games");
    var query = {id: req.body.gid};
    var newPlayer = { $push: {players: req.body.uid} };

	if (req.body.uid != GUEST)
	{
	  console.log("user: ", req.body.uid);
	  var userQuery = {username: req.body.uid};
	  var joinedGame = {$push: {games: req.body.gid}};
	  client.db("pickup").collection("users").update(userQuery, joinedGame);
	}

    collection.update(query, newPlayer, (err) =>
    {
      if (err) throw err;
      client.close();
    });

  });

});
app.post("/deletegame",(req,res)=>
{
  mongo.connect(mongoUrl,(err,client)=>{
    if(err)throw new Error(err);

    var db=client.db("pickup");
    db.collection("games").remove({"id":req.body.gameId})
    .then((arr)=>{
      console.log(req.body.gameId, "deleted");
      res.json();
      client.close();
    })
  });

});




/*deploy app*/
const port=process.env.PORT;
app.listen(port,()=>{
    console.log(port);
    console.log(process.env.NODE_ENV);
    console.log(process.env.MONGODB_URI);
});

module.exports = {app};
