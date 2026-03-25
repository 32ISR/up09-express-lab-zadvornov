const express = require("express")
const app = express()
const bcr = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const db = require("./db")

const PORT = 3000
const SECRET = "qwertyuiop"

const auth = (req, res, next) => {
    console.log(req.headers);

    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: "No token" })

    const token = authHeader.split(" ")[1]
    if (!token) return res.status(401).json({ error: "Invalid token" })

    try {
        const decoded = jwt.verify(token, SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(403).json({ error: "Invalid or expired token" })
    }
}


app.use(cors())
app.use(express.json())



app.post("/api/auth/login", (req, res) => {
    try{
        const {username, password} = req.body

        if (!username || !password) {
            return res.status(400).json({error: "Missing Data"})
        }
        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username)
        if(!user) {return res.status(401).json({error: "Неверный пароль"})} 

        const valid = bcr.compareSync(password, user.password)
        if(!valid) {return res.status(401).json({error: "Неверный пароль"})}

        const {password: _, ...safeUser} = user
        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(200).json({ success: true, token, user: safeUser })
    }catch(error){
        console.error(error)
        return res.status(500).json({error: "Something went wr"})
    }
})





app.post("/api/auth/register", (req, res) => {
    try {
        const { username, password, email } = req.body
        if (!username || !password) {
            return res.status(400).json({ error: "error" })
        }

        if (username.length < 3) {
            return res.status(400).json({ error: "error" })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "error " })
        }

        const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username)

        if (existing) return res.status(409).json({ error: "USER EXIST" })

        const salt = bcr.genSaltSync(10)
        const hash = bcr.hashSync(password, salt)
        const role = "user"

        const info = db.prepare(`INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)`).run(username.trim(), hash, email.trim(), role)

        const newUser = db.prepare(`SELECT * FROM users WHERE id =?`).get(info.lastInsertRowid)

        const { password: _, ...safeUser } = newUser
        const token = jwt.sign({ ...safeUser }, SECRET, { expiresIn: "24h" })
        res.status(201).json({ success: true, token, user: safeUser })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: "Server failed" })
    }
})


app.get("/api/auth/profile", auth, (req, res) => {
  try {
    const { id } = req.user;
    const profile = db.prepare("SELECT * FROM users WHERE id = ?").get(id)
    
    if (!profile) {
      return res.status(404).json({ error: "User not found" })
    }

    return res.status(200).json({ profile })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Failed to fetch profile" })
  }
});

// app.post("/api/books", auth, (req, res) =>{
//     console.log(req.body)
//     try {
//         const { title, author, year, genre, description } = req.body

//         if (!title || !title.trim()) {
//             return res.status(400).json({ error: "Нужно название" })
//         }
//         if (!author || !author.trim()) {
//             return res.status(400).json({ error: "Нужно название" })
//         }
//         if (!year || !year.trim()) {
//             return res.status(400).json({ error: "Нужно название" })
//         }
//         if (!genre || !genre.trim()) {
//             return res.status(400).json({ error: "Нужно название" })
//         }
//         if (!description || description.trim()) {
//             return res.status(400).json({ error: "Нужно название" })
//         }

//         const info = db.prepare(`INSERT INTO books (
//         title,
//         author, 
//         year, 
//         genre, 
//         description) 
//         VALUES (?, ?, ?, ?, ?)`)
//             .run(title.trim(),
//                 author.trim(),
//                 year,
//                 genre.trim(),
//                 description.trim())

//         const newItem = db.prepare("SELECT * FROM books WHERE id = ?").get(info.lastInsertRowid)
//         return res.status(201).json(newItem)
//     } catch (err) {
//         console.error(err)
//         return res.status(500).json({ error: "Failed to fetch" })
//     }
// })


app.post("/api/books", auth, (req, res) => {
  console.log(req.body);

  try {
    const { title, author, year, genre, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Нужно название книги" });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ error: "Нужно указать автора" });
    }

    const yearNum = parseInt(year, 10);
    if (!year || isNaN(yearNum) || yearNum <= 0) {
      return res.status(400).json({ error: "Год должен быть положительным числом" });
    }

    if (!genre || !genre.trim()) {
      return res.status(400).json({ error: "Нужно указать жанр" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Нужно описание книги" });
    }

    const info = db
      .prepare(`
        INSERT INTO books (title, author, year, genre, description)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        title.trim(),
        author.trim(),
        yearNum,
        genre.trim(),
        description.trim()
      );

    const newItem = db
      .prepare("SELECT * FROM books WHERE id = ?")
      .get(info.lastInsertRowid);

    return res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create book" });
  }
});





app.listen(PORT)