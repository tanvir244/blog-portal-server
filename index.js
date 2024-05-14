const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors({
  origin: [
    'https://blog-portal-auth.web.app',
    'https://blog-portal-auth.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9nu6wnq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger = (req, res, next) => {
  console.log('logged info:', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware', token);
  if(!token){
    return res.status(401).send({message: 'unauthorized access'});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })

}

async function run() {
  try {

    const recentCollection = client.db('blogPortal').collection('recentBlogs');
    const addedCollection = client.db('blogPortal').collection('addedBlogs');
    const commentCollection = client.db('blogPortal').collection('allComments');
    const wishlistCollection = client.db('blogPortal').collection('allWishlist');
    const authorsCollection = client.db('blogPortal').collection('bestAuthors');

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
      .send({ success: true });
    })

    app.post('/logout', (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

    // blogs related api
    app.get('/recent_blogs', async (req, res) => {
      const cursor = recentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/recent_blogs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // if I need specific properties value than only I need to emplement options otherwise don't need. if I don't implement options, all properties value show by defaultly
      const options = {
        projection: { title: 1, short_description: 1, detail_description: 1, category: 1, image_url: 1 }
      }
      const result = await recentCollection.findOne(query, options);
      res.send(result);
    })

    app.post('/add_blog', async (req, res) => {
      const newBlog = req.body;
      const result = await addedCollection.insertOne(newBlog);
      res.send(result);
    })

    app.get('/add_blog', async (req, res) => {
      const cursor = addedCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/add_blog/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addedCollection.findOne(query);
      res.send(result);
    })

    app.post('/all_comments', async (req, res) => {
      const newComment = req.body;
      const result = await commentCollection.insertOne(newComment);
      res.send(result);
    })

    app.get('/all_comments', async (req, res) => {
      const cursor = commentCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/all_comments/:id', async (req, res) => {
      const result = await commentCollection.find({ commentId: req.params.id }).toArray();
      res.send(result);
    })

    app.put('/add_blog/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedData = req.body;
      const data = {
        $set: {
          title: updatedData.title,
          image: updatedData.image,
          category: updatedData.category,
          short_description: updatedData.short_description,
          long_description: updatedData.long_description,
          email: updatedData.email
        }
      }
      const result = await addedCollection.updateOne(filter, data, options);
      res.send(result);
    })

    app.post('/wishlists', async (req, res) => {
      const newWishItem = req.body;
      const result = await wishlistCollection.insertOne(newWishItem);
      res.send(result);
    })

    app.get('/wishlists', async (req, res) => {
      const cursor = wishlistCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/wishlists/:email', logger, verifyToken, async (req, res) => {
      // console.log('token owner info:', req.user.email);
      // console.log('user email:', req.params.email);
      if(req.user.email !== req.params.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await wishlistCollection.find({ whoAddedWishlist: req.params.email }).toArray();
      res.send(result);
    })

    app.delete('/wishlists/:email/:id', async (req, res) => {
      const { email, id } = req.params; 
      const query = { _id: new ObjectId(id), whoAddedWishlist: email }; 
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/authors', async(req, res) => {
      const cursor = authorsCollection.find();
      const result = await cursor.toArray();
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