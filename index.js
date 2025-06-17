const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://hotel-appoinmnet-system.web.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json())
app.use(cookieParser())

const logger = (req, res, next) => {
  next()
}

// Updated verifyToken to use ACCESS_TOKEN_SECRET
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access - token missing' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access - invalid token' })
    }
    req.user = decoded
    next()
  })
}

// MongoDB connection using DB_ACCESS_TOKEN
const uri = process.env.DB_ACCESS_TOKEN;
// For example: mongodb+srv://iamaintrovert584:g8Eb9zWo0Y6F5YdS@cluster0.shej3dl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect to the server (optional for newer drivers)
    // await client.connect();

    const roomsCollection = client.db('OurRooms').collection('rooms')
    const myRoomsCollection = client.db('OurRooms').collection('myRooms')
    const rewviewCollection = client.db('OurRooms').collection('reviews')

    // JWT generation endpoint
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // Logout endpoint (clears cookie)
    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // Public route to fetch rooms
    app.get('/rooms', async (req, res) => {
      const cursor = roomsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    });

    // Fetch room by ID
    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.findOne(query)
      res.send(result)
    });

    // Protected endpoint: fetch my rooms (requires valid JWT)
    app.get('/myRooms', logger, verifyToken, async (req, res) => {
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = myRoomsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    });

    // Create a new booking in myRooms
    app.post('/myRooms', async (req, res) => {
      const bookingData = req.body
      const result = await myRoomsCollection.insertOne(bookingData)
      res.send(result)
    });

    // Update a booking's date
    app.patch('/myRooms/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const update = req.body
      const updateDate = {
        $set: {
          bookingDate: update.bookingDate
        }
      }
      const result = await myRoomsCollection.updateOne(filter, updateDate, options)
      res.send(result)
    });

    // Delete a booking
    app.delete('/myRooms/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await myRoomsCollection.deleteOne(query)
      res.send(result)
    });

    // Reviews endpoints
    app.get('/reviews', async (req, res) => {
      const cursor = rewviewCollection.find().sort({ reviewDate: -1 })
      const result = await cursor.toArray()
      res.send(result)
    });

    app.post('/reviews', async (req, res) => {
      const userReviews = req.body
      const result = await rewviewCollection.insertOne(userReviews)
      res.send(result)
    });

  } finally {
    // Optionally, close the client when finished
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', async (req, res) => {
  res.send('hotel fairs api is calling okay');
});

app.listen(port, () => {
  console.log(`okay it's working with this port ${port}`);
});