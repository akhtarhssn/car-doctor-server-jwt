const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

const DB_USER = process.env.DB_USERNAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
console.log(DB_USER, DB_PASSWORD);

// Middleware
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Our Car Doctor is running");
});

const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.a0pfpbg.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  console.log("Hitting Verify JWT");
  console.log(req.headers.authorization);

  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  // console.log("Token inside verifyJWT TOKEN", token);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: "Unauthorized Access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Connect the database
    const servicesCollection = client.db("carDoctor").collection("services");
    const orderCollection = client.db("carDoctor").collection("orders");

    // Services Routes
    app.get("/services", async (req, res) => {
      const services = servicesCollection.find();
      const result = await services.toArray();
      res.send(result);
    });

    // JWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      console.log(token);
      res.send({ token });
    });

    // Service by id
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // Bookings Routes
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log("Came back after verify", decoded);
      // console.log(req.headers.authorization);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      if (decoded.email !== req.query.email) {
        return res
          .status(403)
          .send({ error: true, message: "Access Forbidden" });
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const order = req.body;
      console.log(order);

      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // DELETE METHOD
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // UPDATE METHOD
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updateBookings = req.body;

      console.log(updateBookings);

      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateBookings.status,
        },
      };
      const result = await orderCollection.updateOne(query, updateDoc, {
        new: true,
      });
      console.log(result);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Car Doctor  is running on port http://localhost:${port}`);
});
