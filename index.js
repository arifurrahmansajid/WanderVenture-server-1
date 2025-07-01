const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

// Cookie options for secure authentication
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// CORS setup for frontend integration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://hotel-appoinmnet-system.web.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(cookieParser());

// Logger middleware (optional, can be expanded)
const logger = (req, res, next) => {
  next();
};

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access - token missing' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access - invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// MongoDB connection
const uri = process.env.DB_ACCESS_TOKEN;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const roomsCollection = client.db('OurRooms').collection('rooms');
    const myRoomsCollection = client.db('OurRooms').collection('myRooms');
    const reviewCollection = client.db('OurRooms').collection('reviews');

    // JWT generation endpoint
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // Logout endpoint (clears cookie)
    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    // Public route to fetch rooms with optional search
    app.get('/rooms', async (req, res) => {
      const search = req.query.search;
      let query = {};
      if (search) {
        query = {
          $or: [
            { description: { $regex: search, $options: "i" } },
            { room_Size: { $regex: search, $options: "i" } } // <-- use capital S to match your data
          ]
        };
      }
      const cursor = roomsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Fetch room by ID
    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    // Protected endpoint: fetch my rooms (requires valid JWT)
    app.get('/myRooms', logger, verifyToken, async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const cursor = myRoomsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Create a new booking in myRooms
    app.post('/myRooms', async (req, res) => {
      const bookingData = req.body;
      const result = await myRoomsCollection.insertOne(bookingData);
      res.send(result);
    });

    // Update a booking's date
    app.patch('/myRooms/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = req.body;
      const updateDate = {
        $set: {
          bookingDate: update.bookingDate
        }
      };
      const result = await myRoomsCollection.updateOne(filter, updateDate, options);
      res.send(result);
    });

    // Delete a booking
    app.delete('/myRooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await myRoomsCollection.deleteOne(query);
      res.send(result);
    });

    // Reviews endpoints
    app.get('/reviews', async (req, res) => {
      const cursor = reviewCollection.find().sort({ reviewDate: -1 });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/reviews', async (req, res) => {
      const userReviews = req.body;
      const result = await reviewCollection.insertOne(userReviews);
      res.send(result);
    });

  } finally {
    // Optionally, close the client when finished
    // await client.close();
  }
}
run().catch(console.dir);

// Health check route
app.get('/', async (req, res) => {
  res.send('hotel fairs api is calling okay');
});

app.listen(port, () => {
  console.log(`okay it's working with this port ${port}`);
});