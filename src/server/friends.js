const mongo=require("mongodb").MongoClient;
const express=require("express");
const fs=require("fs");
const cheerio=require("cheerio");
const url="mongodb://pickup:cs115@ds251819.mlab.com:51819/pickup";
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
//mongoose.connect("mongodb://localhost:27017");

exports.reqFriend=(user,friend,res)=>{
	var tf=mongo.connect(url,(err,client)=>{
		if(err)throw new Error(err);

		var db=client.db("pickup");
		//if other person has req friend, call acceptFriend(exist in their friend list)

		db.collection("users").find({"username":friend}).toArray()
		.then((arr=>{
			var friends=arr[0]["friends"];
			var req=false;
			for(i=0;i<friends.length;i++){
				if(friends[i]["username"]==user){
					req=true;
					break;
				}
			}
			if(req){
				exports.acceptFriend(user,friend,res);
			}
			else{
				db.collection("users").find({"username":user}).toArray()
				.then((arr)=>{
					var friends=arr[0]["friends"];
					friends.push({"username":friend,"req":"pending"});
					db.collection("users").updateOne({"username":user},{
						$set:{
							"friends":friends
						}
					})
					.then(db.collection("users").find({"username":friend}).toArray()
					.then((arr)=>{
						var feed=arr[0]["feed"];
						feed.push({"type":"friendreq","sender":user});
						db.collection("users").updateOne({"username":friend},{
							$set:{
								"feed":feed
							}
						})
					}))
				}).catch((err)=>{
					console.log(err);
					res.json(false);
				});
			}
		}))
		/*
		db.collection("users").find({"username":user}).toArray()
		.then((arr)=>{
			var friends=arr[0]["friends"];
			friends.push({"username":friend,"req":"pending"});
			db.collection("users").updateOne({"username":user},{
				$set:{
					"friends":friends
				}
			})
			.then(db.collection("users").find({"username":friend}).toArray()
			.then((arr)=>{
				var feed=arr[0]["feed"];
				feed.push({"type":"friendreq","sender":user});
				db.collection("users").updateOne({"username":friend},{
					$set:{
						"feed":feed
					}
				})
			}))
		}).catch((err)=>{
			console.log(err);
			res.json(false);
		});*/
	});
}
exports.acceptFriend=(user,friend,res)=>{
	var tf=mongo.connect(url,(err,client)=>{
		if(err)throw new Error(err);

		var db=client.db("pickup");
		db.collection("users").find({"username":friend}).toArray()
		.then((arr)=>{
			var friends=arr[0]["friends"];
			for(i=0;i<friends.length;i++){
				if(friends[i]["username"]==user){
					friends[i]["req"]="accepted";
				}
			}
			db.collection("users").updateOne({"username":friend},{
				$set:{
					"friends":friends
				}
			})
			.then(db.collection("users").find({"username":user}).toArray()
			.then((arr)=>{
				var friends=arr[0]["friends"];
				friends.push({"username":friend,"req":"accepted"});
				db.collection("users").updateOne({"username":user},{
					$set:{
						"friends":friends
					}
				})
			}))
		}).catch((err)=>{
			console.log(err);
			res.json(false);
		});
	});
}
exports.declineFriend=(user,friend,res)=>{
	var tf=mongo.connect(url,(err,client)=>{
		if(err)throw new Error(err);

		var db=client.db("pickup");
		db.collection("users").find({"username":user}).toArray()
		.then((arr)=>{
			var friends=arr[0]["friends"];
			friends.push({"username":friend,"req":"pending"});
			db.collection("users").updateOne({"username":user},{
				$set:{
					"friends":friends
				}
			})
			.then(db.collection("users").find({"username":friend}).toArray()
			.then((arr)=>{
				var feed=arr[0]["feed"];
				feed.push({"type":"friendreq","sender":user});
				db.collection("users").updateOne({"username":friend},{
					$set:{
						"feed":feed
					}
				})
			}))
		}).catch((err)=>{
			console.log(err);
			res.json(false);
		});
	});
}
exports.removeFriend=(user,res)=>{
	var myUsers ={};
	var tf=mongo.connect(url,(err,client)=>{
		if(err)throw new Error(err);

		var db=client.db("pickup");
		db.collection("users").find({"username":user}).toArray()
		.then((arr)=>{
			res.json(arr);
			client.close();
		}).catch((err)=>{
			res.json(false);
		});
	});
}
exports.isFriend=(user,res)=>{
	var myUsers ={};
	var tf=mongo.connect(url,(err,client)=>{
		if(err)throw new Error(err);

		var db=client.db("pickup");
		db.collection("users").find({"username":user}).toArray()
		.then((arr)=>{
			res.json(arr);
			client.close();
		}).catch((err)=>{
			res.json(false);
		});
	});
}