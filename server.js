const express = require('express');
const cors = require('cors');
const monk = require('monk');
const Filter = require('bad-words');
const ExpressRateLimiter = require('express-rate-limit');
const port = process.env.PORT || 5000;

// connect to db using monk (creats db/collection if not found)
const db = monk(process.env.MONGO_URI || 'localhost/xpiraldb');
// get collection
const xpiralsCollection = db.get('xpirals');
// setup filter
const filter = new Filter();
// setup rate limiter
const rateLimiter = new ExpressRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
});

// create an instance of express;
const app = express();
// apply CORS middleware in the server
app.use(cors());
// parse string back to json
app.use(express.json());

function isValidTweet(input) {
  return (
    input.name &&
    input.name.toString().trim !== '' &&
    input.tweet &&
    input.tweet.toString().trim !== ''
  );
}

app.get('/', (req, resp) => {
  resp.json({
    message: 'hello from server 👋.',
  });
});

app.get('/tweet', (req, resp) => {
  xpiralsCollection.find().then((data) => {
    resp.json(data);
  });
});

// rate limit to post
app.use(rateLimiter);

app.post('/tweet', (req, resp) => {
  console.log(req.body, typeof req.body);
  if (isValidTweet(req.body)) {
    // insert into db; stringify to prvent injection
    const tweet = {
      name: filter.clean(req.body.name.toString()),
      tweet: filter.clean(req.body.tweet.toString()),
      created: new Date(),
    };
    xpiralsCollection.insert(tweet).then((createdTweet) => {
      console.log('🌈 xpiral inserted');
      resp.json(createdTweet);
    });
  } else {
    console.log('invalid data');
    // send error message
    res.status(422);
    res.json({
      message: 'Invalid Request! Try Again!',
    });
  }
});

app.listen(port, () => {
  console.log('listening on ', port);
});
