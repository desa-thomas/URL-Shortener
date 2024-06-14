require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { doesNotMatch } = require("assert");
const { error } = require("console");

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/public", express.static(`${process.cwd()}/public`));

//Connect to db
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  userUnifiedTopology: true,
});

//Create schema for shortURL
const shortUrlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
  },
});
const countSchema = new mongoose.Schema({
  count: Number,
});

//Create model for shortUrl Schema and Count schema
let ShortUrl = mongoose.model("ShortUrl", shortUrlSchema, "ShortURLs");
let Count = mongoose.model("Count", countSchema, "Counter");

//function for getting count (current shortURL)
const getCount = function (done) {
  Count.findById(process.env.COUNT_ID, function (err, count) {
    if (err) return console.error(err);
    done(null, count);
  });
};

//function for incrementing count (current shortURL)
const updateCount = function (done) {
  Count.findById(process.env.COUNT_ID, function (err, count) {
    if (err) return console.error(err);

    count.count += 1;
    count.save(function (err, data) {
      if (err) return console.error(err);

      done(null, data);
    });
  });
};

//Get document from db by original_url
const findByOriginalUrl = function(url, done){
  ShortUrl.findOne({original_url: url}, function(err, document){
    if(err) console.error(err)

    done(null, document)
  })
}
//Get document from db by short_url
const findByShortUrl = function(url, done){
  ShortUrl.findOne({short_url: url}, function(err, document){
    if(err) return console.error(err)
    
    done(null, document)
  })
}

//function for creating shortUrl and saving it to db
const createAndSaveShortUrl = function (url, done) {
  getCount(function (err, countDocument) {
    if (err) return console.error(err);

    let currCount = countDocument.count;

    let shortUrl = new ShortUrl({
      original_url: url,
      short_url: currCount,
    });

    shortUrl.save(function (err, document) {
      if (err) return console.error(err);

      updateCount(function (err, data) {
        if (err) return console.error(err);
      });

      done(null, document)
    });
  });
};

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

//POST request for shorturl
app.post("/api/shorturl", function (req, res) {
  if (validateurl(req.body.url)) {
    
    //Find URL in db 
    findByOriginalUrl(url=req.body.url, function(err, document){
      if(err) return console.error(err)
      
      //If short URL exists in db return it in json
      if(document){
        res.json({original_url : url, short_url : document.short_url})
      }

      //If short URL does not exist in db, create it 
      else{
        createAndSaveShortUrl(url, function(err, document){
          if(err) return console.error(err)
          
          //return shortURL in json
          res.json({original_url: url, short_url: document.short_url})
        })
      }
    })

  } else {
    res.json({ error: "invalid url" });
  }
});

//function for validating urls
const validateurl = function (url) {
  try {
    new URL(url);
  
    return true;
  } catch (err) {
    return false;
  }
};

app.get("/api/:shortUrl", function(req, res){
  findByShortUrl(req.params.shortUrl, function(err, document){
    if(err) return console.error(err)
    
    if(document){
      res.redirect(document.original_url)
    }
  })
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
