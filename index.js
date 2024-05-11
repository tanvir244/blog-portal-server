const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9nu6wnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

    const recentCollection = client.db('blogPortal').collection('recentBlogs');
    const addedCollection = client.db('blogPortal').collection('addedBlogs');
    const commentCollection = client.db('blogPortal').collection('allComments');

    app.get('/recent_blogs', async(req, res) => {
        const cursor = recentCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/recent_blogs/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        // if I need specific properties value than only I need to emplement options otherwise don't need. if I don't implement options, all properties value show by defaultly
        const options = {
            projection: {title: 1, short_description: 1, detail_description: 1, category: 1, image_url: 1}
        }
        const result = await recentCollection.findOne(query, options);
        res.send(result);
    })

    app.post('/add_blog', async(req, res) => {
      const newBlog = req.body;
      const result = await addedCollection.insertOne(newBlog);
      res.send(result);
    })

    app.get('/add_blog', async(req, res) => {
      const cursor = addedCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/add_blog/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await addedCollection.findOne(query);
      res.send(result);
    })

    app.post('/all_comments', async(req, res) => {
      const newComment = req.body;
      const result = await commentCollection.insertOne(newComment);
      res.send(result);
    })

    app.get('/all_comments', async(req, res) => {
      const cursor = commentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/all_comments/:id', async(req, res) => {
      const result = await commentCollection.find({commentId: req.params.id}).toArray();
      res.send(result);
    })

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Blog portal server is running');
})

app.listen(port, () => {
    console.log(`Blog portal server is running on port: ${port}`)
})