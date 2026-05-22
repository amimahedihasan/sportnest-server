const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()

const app = express()
const port = process.env.PORT
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { jwtVerify, createRemoteJWKSet } = require('jose-cjs')
const uri = process.env.MONGODB_URI


app.use(express.json())
app.use(cors())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URI}/api/auth/jwks`)
)

const middleware = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header.split(" ")[1]
  if (!token) {
    return res.status(401).json({ message: "unauthroized" })
  }

  try {
    const { payload } = await jwtVerify(token, JWKS)
    next()
  } catch {
    return res.status(403).json({ message: "unauthroized" })
  }
}


async function run() {
  try {
    // await client.connect();

    const database = client.db('sportnest');
    const facilityCollection = database.collection('facility')
    const bookingCollection = database.collection('booking')


    app.get('/all-facilities', async (req, res) => {
      const { search, category } = req.query;

      let query = {};
      const conditions = [];

      if (search) {
        conditions.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { facility_type: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
          ]
        });
      }

      if (category) {
        conditions.push({ facility_type: category });
      }

      if (conditions.length > 0) {
        query = conditions.length === 1 ? conditions[0] : { $and: conditions };
      }

      const result = await facilityCollection.find(query).toArray();
      res.json(result);
    });
