require('./config/config.js');
const express=require("express");
const mongo=require("mongodb").MongoClient;
var {mongoose} = require('./db/mongoose.js');
const bodyParser=require("body-parser");
const mkprofile=require("./src/server/mkprofile.js");
const friends=require("./src/server/friends.js");
const gamepage=require("./src/server/gamepage.js");
const teams=require("./src/server/teams.js");
const timedRemove=require("./src/server/timedRemove.js");
const teamgames=require("./src/server/teamgames.js");
const login=require("./src/server/login.js")
const weather = require('./src/server/weather.js');
const fs=require("fs");
const busboy=require("connect-busboy");
const util = require('util')
const app=express();
const http=require("http").Server(app);
const expressStaticGzip = require("express-static-gzip");
const DEFAULT=0;

//deploy app
const port=process.env.PORT;
http.listen(port || 8000,()=>{
    console.log(port);
    console.log(process.env.NODE_ENV);
    console.log(process.env.MONGODB_URI);
});

var {Game} = require('./db/game.js');
var {User} = require('./db/User.js');
var {Team} = require('./db/team.js');

/*configurations*/
//app.use(express.static("./dist"));
app.use(bodyParser.json());
app.use(busboy());
app.use("/profilepictures",express.static("./dist/profilePictures"));
app.use(expressStaticGzip("dist"));

const makeValid = (obj) => {return obj != null ? obj : "";};
var mongoUrl = 'mongodb://pickup:cs115@ds251819.mlab.com:51819/pickup';

const io=require("socket.io")(http);
//socket.io----------------------------------
io.on('connection',(socket)=>{
  console.log("someone joined");
  socket.on("send",(m)=>{
    console.log(m);

    let messageWithTime={
      sender:m["sender"],
      message:m["message"],
      time:(new Date()).toLocaleTimeString()
    }
    saveMessage(m["id"],messageWithTime,()=>{
      io.emit("message",messageWithTime)
    })

  })
});
saveMessage=(gameID,message,fn)=>{
  mongo.connect(mongoUrl,(err,client)=>{
    if(err)throw new Error(err);
    let groupchats=client.db("pickup").collection("groupchats");
    groupchats.update({"id":gameID},{
        $push:{"messages":message}
    },{"upsert":true})
    .then(()=>{
      client.close();
      fn();
    })
  })
}
app.post("/get-chats",(req,res)=>{
  mongo.connect(mongoUrl,(err,client)=>{
    if(err)throw new Error(err);
    let groupchats=client.db("pickup").collection("groupchats");
    groupchats.find({"id":req.body.id}).toArray((err,arr)=>{
      if(err)throw new Error(err);
      if(arr[DEFAULT]==undefined){
        res.json({
          "messages":[],
          "length":0
        })
      }
      else{
        let messages=arr[DEFAULT]["messages"];
        res.json({
          "messages":messages,
          "length":messages.length
        })
      }

      client.close();
    })
  })
})




/*sends index.html to any link*/
app.get("*",(req,res)=>{
  res.sendFile(__dirname+"/dist/index.html");
  console.log('[', (new Date()).toLocaleTimeString(), "] Main file sending");
});

//-----------------login------------------------
app.post("/verify-login",(req,res)=>{
  login.verifyLogin(req.body,res);
})
app.post("/signin-test",(req,res)=>{
  login.signIn(req.body,res);
})
app.post("/signup",(req,res)=>{
  login.signUp(req.body,res);
});
app.delete("/logout-test",(req,res)=>{
  login.logout(req.body,res);
})

// --------------- Team related requests --------------
app.post('/maketeam', teams.makeTeam);
app.patch('/maketeam', teams.addTeamToUser);
app.patch('/team:user', teams.addUserToTeam);
app.post("/retrieveteams", teams.getTeams);
app.patch('/remove:team', teams.teamLeave);
app.post("/deleteteam",teams.deleteTeam);

//-------------==homepage-------------------------------
// Gets players and games count
app.post("/get-players-and-games-count",(req,res)=>{
  var gamescount=0;
  var userscount=0;
  mongo.connect(mongoUrl, (err, client) =>
  {
    if(err) throw new Error(err);
    var games=client.db("pickup").collection("games");
    var users=client.db("pickup").collection("users");
    var teamgames=client.db("pickup").collection("teamgames");

    games.count({}).then((numberOfGames)=>{
      gamescount=gamescount+numberOfGames;
      teamgames.count({}).then((numberOfTeamGames)=>{
        gamescount=gamescount+numberOfTeamGames;
        users.count({}).then((numberOfUsers)=>{
          userscount=userscount+numberOfUsers;
          res.json({
            games:gamescount,
            users:userscount
          })
          res.end();
          client.close();
        })
      })
    });
  });

})
// --------------- User relate requests ---------------
app.post("/user",(req,res)=>{
	mkprofile.getUsers(req.body.user,res);
});
app.post("/isuser",(req,res)=>{
  mkprofile.isUser(req.body.user,res);
})
app.post("/saveprofile",(req,res)=>{
	mkprofile.saveProfile(req.body,res);
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
  /*https://stackoverflow.com/questions/23114374/file-upl
  oading-with-express-4-0-req-files-undefined?utm_med
  ium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa*/
  var body={};
  var tempPath="";
  req.busboy.on("field",(fieldname,val)=>{
    body[fieldname]=val;
    if(fieldname=="user"){
      tempPath="./dist/"+val;
    }
  });
  req.busboy.on("file",(fieldname,file,filename)=>{
    console.log(tempPath);
    fstream=fs.createWriteStream(tempPath);
    file.pipe(fstream);
  });
  req.busboy.on("finish",()=>{
    mkprofile.uploadProfilePicture(tempPath,body["user"],body["filetype"],res);
  })
  req.pipe(req.busboy);
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
app.post("/isgamet",(req,res)=>{
  gamepage.isGameT(req.body["id"],res);
})


/*----------------------------------------------------------------------------------------*/


// gets nearbygames within a range
app.post("/nearbygames", (req, res) => {
  console.log('[', (new Date()).toLocaleTimeString(), "] Nearby games sending");

  let range = req.body.range;
  let center = req.body.center;

  mongo.connect(mongoUrl, (err, client) =>{
    if (err) throw err;

    let collection = client.db("pickup").collection("games");

    let query = {coords:
                    {$near:
                        {
                            $geometry: {
                                type: "Point",
                                coordinates: [center.lng, center.lat]
                            },
                            $maxDistance: range * 1000,
                        }
                    },
                isprivate: false
    };
    collection.find(query).toArray((err, result) => {
      if (err) throw err;
      res.json(result);
      res.end();
      client.close();
    });
  });
});

// return the games that the user has played
app.post("/usergames", (req, res) => {
  console.log(req.body.user)
  console.log('[', (new Date()).toLocaleTimeString(), "] Sending ", req.body.user.trim(), "'s games");

  mongo.connect(mongoUrl, (err, client) => {
    if (err) throw err;
    let username = {username: req.body.user.trim()};
    let users = client.db("pickup").collection("users");
    let games = client.db("pickup").collection("games");
    users.findOne(username, (err, user) => {
      let userGames = {id: {$in: (user.games != null ? user.games : [])} };
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
app.post("/postgames", (req, res) => {
  weather.getWeather(req.body.lat, req.body.lng, (errorMessage, weatherResults) => {
			if(errorMessage){
				console.log(errorMessage);
			}
			else{
				console.log(`It is currently ${weatherResults.temperature}`);
				console.log(`It feels like ${weatherResults.apparentTemperature}`);
        var temp = weatherResults.temperature;
        console.log('This is the temp: ', temp);
			}
	})

  var game = new Game({
    sport: makeValid(req.body.sport),
    name: makeValid(req.body.name),
    location: makeValid(req.body.location),
    isprivate:makeValid(req.body.isprivate),
    id: makeValid(req.body.id),
    owner: makeValid(req.body.user),
    players: [makeValid(req.body.user),],
    coords: {type: "Point", coordinates: [req.body.lng, req.body.lat] },
    startTime: req.body.startTime,
    endTime: req.body.startTime + req.body.gameLength
  });

  game.save().then((game) => {
      res.status(200).send({game});
    }, (e) => {
      res.status(400).send(e);
  })
});

// gets weather data
app.post("/getweather",(req,res)=>{
  console.log("request");
  weather.getWeather(req.body.lat, req.body.lng, (errorMessage, summary, temperature) => {
		if(errorMessage){
		  res.json({
        error:"raincheck unavailable"
      })
 		}
		else{
			res.json({
        error:"none",
        summary:summary,
        temperature:temperature
      })
		}
  })
})

// add user to game
app.patch('/game:user', (req, res) => {
  Game.findOneAndUpdate(
    {id : req.body.gid, players: { $nin: [req.body.uid]} },
    {$push: {players: req.body.uid}},
    {new: true}
  ).then((game) => {
    res.status(200).send({game})
  }, (e) => {
    res.status(400).send(e);
  })
})

// Add game to user
app.patch('/user:game', (req, res) => {
  console.log('Adding game to user');
  User.findOneAndUpdate(
    {username : req.body.uid},
    {$push: {games: req.body.gid}},
    {new: true}
  ).then((user) => {
    console.log(user);
    res.status(200).send({user})
  }, (e) => {
    res.status(400).send(e);
  })
})

// Gets back the games for the games table
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

// User leaves a game, deletes game if last user
app.patch('/leave:games', (req, res) => {
  User.findOneAndUpdate(
    {'username': req.body.uid},
    {$pull: {games : req.body.gid}},
    {new: true}
  )
  .then(()=>{
    Game.findOneAndUpdate(
      {'id': req.body.gid},
      {$pull: {players : req.body.uid}},
      {new: true}
    )
    .then((game) =>{
      if(game.players.length === 0){
        game.remove();
      }
        res.status(200).send({game});
    }).catch((e) => {
      res.status(400).send(e);
    })
  })


})

//change so it deletes for members as well
/*
app.delete('/games', (req, res) => {

    console.log("testing games",req.body.gid)
    Game.findOneAndRemove({'id': req.body.gid})
    .then((game) =>{
      User.findOneAndUpdate(
        {'username': {$in:req.body.players}},
        {$pull: {games : req.body.gid}},
        {new: true}
      )
      .then(()=>{
        res.status(200).send({game});
      }).catch((e) => {
        res.status(400).send(e);
      })
    }).catch((e) => {
      res.status(400).send(e);
    })

})
*/

app.post("/games",(req,res)=>{
  mongo.connect(mongoUrl,(err,client)=>{
    if(err)throw new Error(err);
    let groupchats=client.db("pickup").collection("groupchats");
    let users=client.db("pickup").collection("users");
    let games=client.db("pickup").collection("games");
    console.log("game id",req.body.gid)
    groupchats.remove({"id":String(req.body.gid)})
    .then(()=>{
      users.update({"username":{$in:req.body.players}},{
        $pull:{
          games:req.body.gid
        }
      })
    })
    .then(()=>{
      games.remove({"id":req.body.gid})
    })
    .then(()=>{
      res.end();
      client.close();
    })
  })
})

// Gets game data for specific games
app.post("/retrievespecificgames", (req,res)=>{
  mongo.connect(mongoUrl,(err,client)=>{
    if(err)throw new Error(err);
    client.db("pickup").collection("games").find({id:Number(req.body.id)}).toArray((err,arr)=>{
      if(err)throw new Error(err);
      res.json(arr);
      res.end();
      client.close();
    })
  })

})

//Join a team
app.post("/joinT", (req, res) =>{
  teamgames.joinT(req,res);
});

// Show nearby team games
app.post("/nearbygamesT", (req, res) => {
  teamgames.nearByGamesT(req,res);
});

// Get games near the user
app.post("/usergamesT", (req, res) => {
  teamgames.userGamesT(req,res);
});
// app.post("/postgamesT", (req, res) =>{
//   teamgames.postGamesT(req,res);
// });
app.post('/postTeamGame', teamgames.postTeamGame); // Post a team game
app.patch('/postTeamGame', teamgames.addTGtoUser); // Add team game to user
app.patch('/addTeamtoTG', teamgames.addTeamtoTG); // Add team to team game
//Retrieve team games
app.post("/retrievegamesT", (req, res) =>{
  teamgames.retrieveGamesT(req,res);
});
//Retrive specific team games
app.post("/retrievespecificgamesT",(req,res)=>{
  teamgames.retrieveSpecificGamesT(req,res);
})
// Leave a team game
app.post('/leavegameT', (req, res) => {
  teamgames.leaveGameT(req,res);
})
// Delete a team game
app.post("/deletegameT",(req,res)=>{
  teamgames.deleteGameT(req,res);
});
// Get back a player team
app.post("/retrieveplayerteams",(req,res)=>{
  teamgames.retrievePlayerTeams(req,res);
})

// interval in milliseconds
var removeInterval = 60*1000;
timedRemove.removeExpiredGames(mongoUrl); // do it immedieately just to make sure
setInterval(timedRemove.removeExpiredGames, removeInterval, mongoUrl);

module.exports = {app};
