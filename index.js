const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT 




const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

app.use(cors({
  origin: [
    'http://localhost:5173',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
}))
app.use(express.json())
app.use(cookieParser())

const logger = (req, res, next) => {
  next()
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token
  if (!token) {
    return res.status(401).send({ message: 'unathorized access' })
  }
  if (token) {
    jwt.verify(token, process.env.DB_ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unathorized access' })
      }
      req.user = decoded
      next()
    })
  }
}



// mongodb added 


//const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.kmaa4nd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.shej3dl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const roomsCollection = client.db('OurRooms').collection('rooms')
    const myRoomsCollection = client.db('OurRooms').collection('myRooms')
    const rewviewCollection = client.db('OurRooms').collection('reviews')


  

    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
    
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.get('/rooms', async (req, res) => {
      const cursor = roomsCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/rooms/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.findOne(query)
      res.send(result)
    })


    app.get('/myRooms', logger, verifyToken, async (req, res) => {
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = myRoomsCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })


    app.post('/myRooms', async (req, res) => {
      const bookingData = req.body
      const result = await myRoomsCollection.insertOne(bookingData)
      res.send(result)
    })

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
    })

    app.delete('/myRooms/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await myRoomsCollection.deleteOne(query)
      res.send(result)
    })


    // review 
    app.get('/reviews', async (req, res) => {
      const cursor = rewviewCollection.find().sort({ reviewDate: -1 })
      const result = await cursor.toArray()
      res.send(result)
    })

    app.post('/reviews', async (req, res) => {
      const userReviews = req.body
      const result = await rewviewCollection.insertOne(userReviews)
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/', async (req, res) => {
  res.send('hotel fairs api is calling okay');
})
app.listen(port, () => {
  console.log(`okay it's working with this port ${port}`);
})