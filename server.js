const express = require('express');
const cors = require('cors');
const monk = require('monk');
const Filter = require('bad-words');
const ExpressRateLimiter = require('express-rate-limit');
require('dotenv').config();

const port = process.env.PORT || 5000;

// connect to db using monk (creats db/collection if not found)
const db = monk(process.env.MONGODB_URI || 'localhost/spiraldb');
// get collection
const spiralsCollection = db.get('spirals');
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
  // console.log('@get /tweet ', req.query);
  let { skip, limit, sort = 'desc' } = req.query;
  skip = Number(skip) || 0;
  limit = Number(limit) || 5;
  limit = limit > 50 ? 50 : limit;

  Promise.all([
    // get total no of item
    spiralsCollection.count(),
    // get requested items
    spiralsCollection.find(
      {},
      { skip, limit, sort: { created: sort === 'desc' ? -1 : 1 } }
    ),
  ]).then(([total, spirals]) => {
    resp.json({
      meta: {
        total,
        skip,
        limit,
        remaining: total - (skip + limit),
        has_more: total - (skip + limit) > 0,
      },
      spirals,
    });
  });
});

// rate limit to post
app.use(rateLimiter);

app.post('/tweet', (req, resp) => {
  // console.log(req.body, typeof req.body);
  if (isValidTweet(req.body)) {
    // insert into db; stringify to prvent injection
    const tweet = {
      name: filter.clean(req.body.name.toString()),
      tweet: filter.clean(req.body.tweet.toString()),
      created: new Date(),
    };
    spiralsCollection.insert(tweet).then((createdTweet) => {
      // console.log('🌈 spiral inserted');
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
