require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const app = express();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)

// Function

function isURL(str) {
  const pattern = new RegExp('^(https?:\\/\\/)?' + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + '((\\d{1,3}\\.){3}\\d{1,3}))' + '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + '(\\?[;&a-z\\d%_.~+=-]*)?' + '(\\#[-a-z\\d_]*)?$', 'i')
  return !!pattern.test(str);
}

function validateURL(url, callback) {
  if (isURL(url)) {
    const hostname = new URL(url).hostname
    dns.lookup(hostname, (err, addr) => {
      if (err) {
        callback(false)
      } else {
        callback(true)
      }
    })
  } else {
    callback(false)
  }

}

// Create Short sequence //
async function createShortSequence() {
  try {
    const doesExist = await Sequence.findOne({ name: "Short"})
    if (!doesExist) {
      const create = new Sequence({ name: "Short" })
      try {
        result = await create.save()
        console.log("Sequence created:", create)
      } catch (error) {
        throw new Error("Failed to create Short sequence")
      }
    }
  } catch (error) {
    console.error(error)
  }
}

// Returns sequential count 
async function updateAndGetShortInrement() {
  try {
    const updateCount = await Sequence.findOneAndUpdate(
      { name: "Short" },
      { $inc: { count: 1 } },
      { new: true, useFindAndModify: false }
    )
    return updateCount.count
  } catch (error) {
    console.error("Error updating Short count", error)
  }
}

// Find if link exist and handle properly

async function preSave(link) {
  try {
    const doesExist = await Short.findOne({ url: link })
    if (doesExist) {
      return doesExist
    } else {
      try {
        const item = new Short({ url: link , id: 0 })
        const result = await item.save()
        return result
      } catch (error) {
        console.error("Error saving new Short", error)
      }
    }
  } catch (finalError) {
    console.error(finalError)
  }
}

async function shortenerPOST(req, res) {
  const link = String(req.body.url)
  validateURL(link, async function (isValid) {
    if (isValid) {
      const result = await preSave(link)
      res.json({ original_url: result.url, short_url: result.id })
    } else {
      res.json({ error: "invalid url" })
    }
  })
}

async function shortenerGET(req, res) {
  const req_id = req.params.numba
  try {
    const response = await Short.findOne({ id: req_id })
    const url = response.url
    res.redirect(url)
  } catch {
    res.redirect("/")
  }
}

// Mongo Schema

const autoincrement = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  count: {
    type: Number,
    default: 0
  }
})

const shortenerSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true
  },
  id: {
    type: Number,
    required: true,
    unique: true
  }
})


// Give id to the saved item
shortenerSchema.pre("save", async function (next) {
  const link = this
  const seq_id = await updateAndGetShortInrement()
  link.id = seq_id
  next()
})



let Short = mongoose.model('Short', shortenerSchema)
let Sequence = mongoose.model("Sequence", autoincrement)


// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint

// MIDDLEWARE Para parsear el body
app.use(express.urlencoded({ extended: false }))

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.post("/api/shorturl", async function (req, res) {
  shortenerPOST(req, res)
})

app.get("/api/shorturl/:numba", async function (req, res) {
  shortenerGET(req, res)
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});


createShortSequence()

// Reset
/* Sequence.findOneAndUpdate({name: "Short"}, { count: 0}, {new: true}).then(e=>console.log("Reset sequence: ",e))
Short.deleteMany({}).then(e=>console.log("Delete Short",e)) */
