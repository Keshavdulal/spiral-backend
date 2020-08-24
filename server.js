const express = require('express');
const cors = require('cors');
const monk = require('monk');

// connect to db using monk (creats db/collection if not found)
const db = monk('localhost/xpiraldb');
// collection
const xpiralsCollection = db.get('xpirals');

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

app.post('/tweet', (req, resp) => {
  console.log(req.body, typeof req.body);
  if (isValidTweet(req.body)) {
    // insert into db; stringify to prvent injection
    const tweet = {
      name: req.body.name.toString(),
      tweet: req.body.tweet.toString(),
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
  // resp.send
});
app.listen(5000, () => {
  console.log('listening on 5000');
});
