// #region 'Importing and configuration of Prisma'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import 'dotenv/config'
const fileUpload = require('express-fileupload');
const fs = require("fs");

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

const app = express()
app.use(cors())
app.use(express.json())
app.use(fileUpload());
// #endregion


// #region 'Upload endpoint'
app.post("/uploadVideo", (req, res) => {

  //@ts-ignore
  if (req.files === null) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  //@ts-ignore
  const file = req.files.file

  //@ts-ignore
  const fileName = req.files.file.name
  const path = 'public/uploads/videos/' + fileName

  //@ts-ignore
  file.mv(path, function(err:any) {

    if (err) return res.status(500).send(err);
    // res.send('File uploaded!');

    //@ts-ignore
    res.json({ fileName: file.name, filePath: `public/uploads/videos/${file.name}`});
    
  });

});

app.post("/uploadThumbnail", (req, res) => {

  //@ts-ignore
  if (req.files === null) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  //@ts-ignore
  const file = req.files.file

  //@ts-ignore
  const fileName = req.files.file.name
  const path = 'public/uploads/thumbnails/' + fileName

  //@ts-ignore
  file.mv(path, function(err:any) {

    if (err) return res.status(500).send(err);
    // res.send('File uploaded!');

    //@ts-ignore
    res.json({ fileName: file.name, filePath: `public/uploads/thumbnails/${file.name}`});
    
  });

});

app.get("/video/:title", function (req, res) {

  const title = req.params.title

  // Ensure there is a range given for the video
  const range = req.headers.range;

  if (!range) {
    res.status(400).send("Requires Range header");
  }

  // get video stats (about 61MB)
  const videoPath = `public/uploads/videos/${title}.mp4`;
  const videoSize = fs.statSync(videoPath).size;

  // Parse Range
  // Example: "bytes=32324-"
  const CHUNK_SIZE = 10 ** 6; // 1MB

  //@ts-ignore
  const start = Number(range.replace(/\D/g, ""));

  //@ts-ignore
  const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

  // Create headers
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes ${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": "video/mp4",
  };

  // HTTP Status 206 for Partial Content
  res.writeHead(206, headers);

  // create video read stream for this particular chunk
  const videoStream = fs.createReadStream(videoPath, { start, end });

  // Stream the video chunk to the client
  videoStream.pipe(res);
  
});

app.get("/thumbnail/:title", function (req, res) {

  const title = req.params.title

  //@ts-ignore
  const imagePath = __dirname + `/public/uploads/thumbnails/${title}.jpg`;

  res.sendFile(imagePath)

});

app.get("/avatar/:userName", function (req, res) {

  const userName = req.params.userName

  //@ts-ignore
  const imagePath = __dirname + `/public/uploads/avatars/${userName}.jpg`;

  res.sendFile(imagePath)

});
// #endregion


// #region 'Helper functions'
function createToken (id: number) {
  // @ts-ignore
  return jwt.sign({ id: id }, process.env.MY_SECRET, { expiresIn: '10h' })
}

async function getUserFromToken (token: string) {
  
  // @ts-ignore
  const decodedData = jwt.verify(token, process.env.MY_SECRET)
  
  // @ts-ignore
  const user = await prisma.user.findUnique({ where: { id: decodedData.id }, 
    
    include: {
      logins: true,
      avatar: true,
      videos: true,
      comments: true, 
      videosLiked: { include: { video: true } }, 
      videosDisliked: { include: { video: true } }, 
      commentsLiked: { include: { comment: true } },
      commentsDisliked: { include: { comment: true } },
      //@ts-ignore
      subscribedBy: { include: { subscriber: true } },
      subscribing: { include: { subscribing: true } },
    }

  })
  
    return user

}
// #endregion


// #region 'Auth End Points'
app.post('/login', async (req, res) => {

  const { email, password } = req.body

  try {

    const user = await prisma.user.findUnique({ where: { email: email }, 
      
      include: {
        logins: true,
        avatar: true,
        videos: true,
        comments: true, 
        videosLiked: { include: { video: true } }, 
        commentsLiked: { include: { comment: true } },
        //@ts-ignore
        subscribedBy: { include: { subscriber: true } },
        subscribing: { include: { subscribing: true } },
      } })
    
    // @ts-ignore
    const passwordMatches = bcrypt.compareSync(password, user.password)

    if (user && passwordMatches) {
      res.send({ user, token: createToken(user.id) })
    } 
    
    else {
      throw Error('ERROR')
    }

  } 
  
  catch (err) {
    res.status(400).send({ error: 'User/password invalid.' })
  }

})

app.get('/validate', async (req, res) => {

  const token = req.headers.authorization || ''

  try {
    // @ts-ignore
    const user = await getUserFromToken(token)
    res.send(user)
  } 
  
  catch (err) {
    // @ts-ignore
    res.status(400).send({ error: err.message })
  }

})
// #endregion


// #region "REST API end points"

// #region 'users endpoints'
app.get('/users', async (req, res) => {

  try {

    const users = await prisma.user.findMany({
      include: { 
        videos: true, 
        logins: true, 
        comments:true, 
        avatar: true, 

        commentsLiked: { include: {comment: true} },
        commentsDisliked: { include: {comment: true} },

        videosLiked:  { include: { video: true} },
        videosDisliked: { include: {video: true} },

        subscribedBy: { include: { subscribing: {include: { avatar: true } } } },
        subscribing:  { include: { subscriber: {include: {avatar: true} } } }
      }
    })

    res.send(users)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<pre>${error.message}</pre>`)
  }

})

app.get('/users/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {

    const user = await prisma.user.findFirst({
      where: { id: idParam },
      include: { 
        videos: true, logins: true, 
        comments:true, 
        avatar: true, 

        commentsLiked: { include: {comment: true} },
        commentsDisliked: { include: {comment: true} },

        videosLiked:  { include: { video: true} },
        videosDisliked: { include: {video: true} },

        subscribedBy: { include: { subscribing: true } },
        subscribing:  { include: { subscriber: true } }
      }
    })

    let countvideosCreated = 0
    let countCommentsCreated = 0
    let countCommentsLiked = 0
    let countCommentsDisliked = 0
    let countVideosLiked = 0
    let countVideosDisliked = 0
    let countSubscribers = 0
    let countSubscribing = 0
    let countLogins = 0

    //@ts-ignore
    for (const video of user.videos) {
      countvideosCreated++
    }

    //@ts-ignore
    for (const comment of user.comments) {
      countCommentsCreated++
    }

    //@ts-ignore
    for (const commentLiked of user.commentsLiked) {
      countCommentsLiked++
    }

    //@ts-ignore
    for (const commentDisliked of user.commentsDisliked) {
      countCommentsDisliked++
    }

    //@ts-ignore
    for (const videoliked of user.videosLiked) {
      countVideosLiked++
    }

    //@ts-ignore
    for (const videoDisliked of user.videosDisliked) {
      countVideosDisliked++
    }

    //@ts-ignore
    for (const subscribing of user.subscribing) {
      countSubscribing++
    }

    //@ts-ignore
    for (const subscriber of user.subscribedBy) {
      countSubscribers++
    }

    //@ts-ignore
    for (const logins of user.logins) {
      countLogins++
    }

    const updatedUserWithCounts = await prisma.user.update({

      where: { id: idParam },

      data: {
        //@ts-ignore
        countvideosCreated: countvideosCreated,
        countCommentsCreated: countCommentsCreated,
        countCommentsLiked: countCommentsLiked,
        countCommentsDisliked: countCommentsDisliked,
        countVideosLiked: countVideosLiked,
        countVideosDisliked: countVideosDisliked,
        countSubscribers: countSubscribers,
        countSubscribing: countSubscribing,
        countLogins: countLogins
      },

      include: { 
        videos: true, logins: true, 
        comments:true, 
        avatar: true, 
        
        commentsLiked: { include: {comment: true} },
        commentsDisliked: { include: {comment: true} },
        
        videosLiked:  { include: { video: true} },
        videosDisliked:  { include: { video: true} },

        subscribedBy: { include: { subscribing: {include: { avatar: true } } } },
        subscribing:  { include: { subscriber: {include: {avatar: true} } } }
      }

    })

    if (user) {
      res.send(updatedUserWithCounts)
    } 
    
    else {
      res.status(404).send({ error: 'User not found.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/users', async (req, res) => {
    
  const { 
    firstName, 
    lastName, 
    userName, 
    gender,
    birthday,
    phoneNumber,
    email,
    password,
    createdAt,
    updatedAt,
    description
   } = req.body
  
  try {

    // generate a hash also salts the password with 8 symbols from their password
    const hashedPassword = bcrypt.hashSync(password, 15)

    const newUser = {
      firstName: firstName, 
      lastName: lastName,
      userName: userName,
      gender: gender,
      birthday: birthday,
      phoneNumber: phoneNumber,
      email: email,
      password: hashedPassword,
      createdAt: createdAt,
      updatedAt: updatedAt,
      description: description
    }

    const userCheck = await prisma.user.findFirst({ where: { email: newUser.email } })
    
    if (userCheck) {
      res.status(404).send({ error: 'User has an already registered email try different email.' })
    }

    else {

      try {

        const createdUser = await prisma.user.create({data: newUser})
        
        const getFullUser = await prisma.user.findFirst({ 
          where: {id: createdUser.id}, 
          include: { 
          videos: true, logins: true, 
          comments:true, 
          avatar: true, 
          commentsLiked: { include: {comment: true} },
          videosLiked:  { include: { video: true} },
          subscribedBy: { include: { subscriber: true } },
          subscribing:  { include: { subscribing: true } }
        } 
      })

        res.send({ getFullUser, token: createToken(createdUser.id) } )
      
      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/users/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id

  try {

    // check that they are signed in
    const user = await getUserFromToken(token)

    //@ts-ignore
    const belongsToUser = await prisma.user.findFirst({where: {id: Number(idParam)}})
    
    //@ts-ignore
    const result = belongsToUser.id === user.id
    
    if (user && result) {

      await prisma.user.delete({ 
        where: { id: Number(idParam) }
      })

      const users = await prisma.user.findMany({
        include: { 
        videos: true, logins: true, 
        comments:true, 
        avatar: true, 
        commentsLiked: { include: {comment: true} },
        videosLiked:  { include: { video: true} },
        subscribedBy: { include: { subscriber: true } },
        subscribing:  { include: { subscribing: true } }
      } 
    })


      res.send(users)

    }

    else {
      res.status(404).send({ error: 'user not found or you cant delete this user.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/users/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id;
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)

    if (user) {

      const { 
        firstName, 
        lastName, 
        userName, 
        gender,
        birthday,
        phoneNumber,
        email,
        password,
        createdAt,
        updatedAt,
        description
      } = req.body

      const hashedPassword = bcrypt.hashSync(password, 15)

      const userData = {
        firstName: firstName, 
        lastName: lastName,
        userName: userName,
        gender: gender,
        birthday: birthday,
        phoneNumber: phoneNumber,
        email: email,
        password: hashedPassword,
        createdAt: createdAt,
        updatedAt: updatedAt,
        description
      }

      try {

        const user = await prisma.user.update({

          where: {
            id: Number(idParam),
          },

          data: userData

        })

        const userFull = await prisma.user.findFirst({
          where: {id: user.id},
          include: { 
          videos: true, logins: true, 
          comments:true, 
          avatar: true, 
          commentsLiked: { include: {comment: true} },
          videosLiked:  { include: { video: true} },
          subscribedBy: { include: { subscriber: true } },
          subscribing:  { include: { subscribing: true } }
        } 
      })

        res.send(userFull)

      } 
  
      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error("Boom")
    }

  }

  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region 'videos endpoints'
app.get('/videos', async (req, res) => {

  try {

    const videos = await prisma.video.findMany({ 

      include: 
        { 
          userWhoCreatedIt: true, 
          comments: true, 
          category: true,
          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments:true, 
              avatar: true, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: true } },
              subscribing:  { include: { subscriber: true } } } } 
            }
        }}

      })

    let countCommentsInside = []
    let countLikesInside = []

    for (const video of videos) {
      
      let countCommentsInsideVariable = 0
      let countLikesInsideVariable = 0

      //@ts-ignore
      for (const user of video.usersWhoLikedIt) {
        countLikesInsideVariable++
      }

      countLikesInside.push(countLikesInsideVariable)

      //@ts-ignore
      for (const comment of video.comments) {
        countCommentsInsideVariable++
      }

      countCommentsInside.push(countCommentsInsideVariable)

    }

    for (let i = 0; i < videos.length; i++) {

      await prisma.video.update({

        where: {id: videos[i].id},

        data: {
          //@ts-ignore
          countCommentsInside: countCommentsInside[i],
          countLikesInside: countLikesInside[i]
        },

        include: { 
          userWhoCreatedIt: true, 
          comments: true, 
          usersWhoLikedIt: { include: { user:true } }
        }

      })

    }
    
    let updatedVideoWithCounts = await prisma.video.findMany({

      include: 
        { 

          userWhoCreatedIt: { include: { avatar: true } }, 

          comments: { include: { userWhoCreatedIt: true, video: true } }, 
          category: true,
          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
              avatar: { include: { user: true } }, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: true } },
              subscribing:  { include: { subscriber: true } } } }, video: true 
            }
          }
      }

    })

    res.send(updatedVideoWithCounts)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/videos/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {

    const video = await prisma.video.findFirst({

      where: { id: idParam },

      include: { 

          userWhoCreatedIt: true,
          comments: true,
          category: true,
          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments: true, 
              avatar: true, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: true } },
              subscribing:  { include: { subscriber: true } } } } 
            }
        }

      }})

    let countCommentsInside = 0
    let countLikesInside = 0

    //@ts-ignore
    for (const user of video.usersWhoLikedIt) {
      countLikesInside++
    }

    //@ts-ignore
    for (const comment of video.comments) {
      countCommentsInside++
    }

    const updatedvideoWithCounts = await prisma.video.update({

      where: { id: idParam },

      data: {
        //@ts-ignore
        countCommentsInside: countCommentsInside,
        countLikesInside: countLikesInside
      },

      include: 
        { 

          userWhoCreatedIt: { include: { avatar: true } }, 

          comments: { include: { userWhoCreatedIt: true, video: true } }, 
          category: true,
          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
              avatar: { include: { user: true } }, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: true } },
              subscribing:  { include: { subscriber: true } } } }, video: true 
            }
          }
      }

    })

    if (video) {
      res.send(updatedvideoWithCounts)
    } 
    
    else {
      res.status(404).send({ error: 'video not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/videos', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    title, 
    thumbnail,
    src, 
    userId,
    categoryId
  } = req.body
  
  const newVideo = {
    title: title,
    thumbnail: thumbnail,
    src:  src,
    userId: userId,
    categoryId: categoryId
  }

  try {

    const user = await getUserFromToken(token)
  
    if (user) {

      try {

        await prisma.video.create({data: newVideo})
        let getAllVideos = await prisma.video.findMany({

          include: 
            { 
    
              userWhoCreatedIt: { include: { avatar: true } }, 
              category: true,
              comments: { include: { userWhoCreatedIt: true, video: true } }, 
    
              usersWhoLikedIt: { 
                include: { 
                user: {
                include: { 
                  videos: true, 
                  logins: true, 
                  comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
                  avatar: { include: { user: true } }, 
                  commentsLiked: { include: {comment: true} },
                  videosLiked:  { include: { video: true} },
                  subscribedBy: { include: { subscribing: true } },
                  subscribing:  { include: { subscriber: true } } } }, video: true 
                }
              }
          }
    
        })

        res.send(getAllVideos)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'User is not logged in no auth.' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/videos/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id

  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const videoMatch = await prisma.video.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const videoUserCheck = videoMatch.userId === user.id

    if (user && videoUserCheck) {

      await prisma.video.delete({ 
        where: { id: Number(idParam) }
      })

      let getAllVideos = await prisma.video.findMany({

        include: 
          { 
  
            userWhoCreatedIt: { include: { avatar: true } }, 
  
            comments: { include: { userWhoCreatedIt: true, video: true } }, 
            category: true,
            usersWhoLikedIt: { 
              include: { 
              user: {
              include: { 
                videos: true, 
                logins: true, 
                comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
                avatar: { include: { user: true } }, 
                commentsLiked: { include: {comment: true} },
                videosLiked:  { include: { video: true} },
                subscribedBy: { include: { subscribing: true } },
                subscribing:  { include: { subscriber: true } } } }, video: true 
              }
            }
        }
  
      })

      res.send(getAllVideos)

    }

    else {
      res.status(404).send({ error: 'video not found, or the video doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/videos/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  
  const idParam = Number(req.params.id)
  
  const { 
    title,  
    createdAt, 
    updatedAt, 
    views,
    countCommentsInside,
    countLikesInside,
    src, 
    userId,
    categoryId
  } = req.body

  const updatedVideo = {
    title: title,
    createdAt: createdAt,
    updatedAt: updatedAt,
    views: views,
    countCommentsInside,
    countLikesInside,
    src:  src,
    userId: userId,
    categoryId: categoryId
  }

  try {

    const user = await getUserFromToken(token)
    
    const videoMatch = await prisma.video.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = videoMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        await prisma.video.update({

          where: {
            id: user.id
          },

          data: updatedVideo

        })

        let getAllVideos = await prisma.video.findMany({

          include: 
            { 
    
              userWhoCreatedIt: { include: { avatar: true } }, 
    
              comments: { include: { userWhoCreatedIt: true, video: true } }, 
              category: true,
              usersWhoLikedIt: { 
                include: { 
                user: {
                include: { 
                  videos: true, 
                  logins: true, 
                  comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
                  avatar: { include: { user: true } }, 
                  commentsLiked: { include: {comment: true} },
                  videosLiked:  { include: { video: true} },
                  subscribedBy: { include: { subscribing: true } },
                  subscribing:  { include: { subscriber: true } } } }, video: true 
                }
              }
          }
    
        })

        res.send(getAllVideos)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  } 
  
  catch(error) {
    res.status(404).send({message: error})
  }

})

app.patch('/videosViews/:id', async (req, res) => {
  
  const idParam = Number(req.params.id)
  
  const { 
    title,  
    createdAt, 
    updatedAt, 
    views,
    countCommentsInside,
    countLikesInside,
    src, 
    userId,
    categoryId
  } = req.body

  const updatedVideo = {
    title: title,
    createdAt: createdAt,
    updatedAt: updatedAt,
    views: views,
    countCommentsInside,
    countLikesInside,
    src:  src,
    userId: userId,
    categoryId: categoryId
  }

  try {
        
    await prisma.video.update({

      where: {
        id: idParam
      },

      data: updatedVideo

    })

    let getAllVideos = await prisma.video.findMany({

      include: 
        { 

          userWhoCreatedIt: { include: { avatar: true } }, 

          comments: { include: { userWhoCreatedIt: true, video: true } }, 
          category: true,
          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
              avatar: { include: { user: true } }, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: true } },
              subscribing:  { include: { subscriber: true } } } }, video: true 
            }
          }
        }
  
      })

      res.send(getAllVideos)

  }

  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "comments endpoints"
app.get('/comments', async (req, res) => {

  try {

    const comments = await prisma.comment.findMany({ 
      include: 
        { 
          video: true, 
          userWhoCreatedIt: true, 
          usersWhoLikedIt: { include: { user:true } } 
        } 
      })

    let countLikesInsideArray = []

    for (const comment of comments) {

      let countLikesInside = 0

      //@ts-ignore
      for (const user of comment.usersWhoLikedIt) {
        countLikesInside++
      }

      countLikesInsideArray.push(countLikesInside)

    }

    for (let i = 0; i < comments.length; i++) {

      await prisma.comment.update({

        where: { id: comments[i].id },

        data: {
          //@ts-ignore
          countLikesInside: countLikesInsideArray[i]
        },

        include: { 
          video: true, 
          userWhoCreatedIt: true, 
          usersWhoLikedIt: { include: { user:true } }
        }

      })

    }

    const updatedCommentsWithCounts = await prisma.comment.findMany({

      include: 
        { 

          userWhoCreatedIt: { include: { avatar: true } }, 

          video: { include: { userWhoCreatedIt: true } }, 

          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
              avatar: { include: { user: true } }, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: {include: {avatar: true} } } },
              subscribing:  { include: { subscriber: {include: {avatar: true} } } } } }
            }
          }
      }

    })

    res.send(updatedCommentsWithCounts)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/comments/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const comment = await prisma.comment.findFirst({
      where: { id: idParam },
      include: 
        { 
          video: true, 
          userWhoCreatedIt: true, 
          usersWhoLikedIt: { include: { user:true } } 
        } 
      })
  

    let countLikesInside = 0

    //@ts-ignore
    for (const user of comment.usersWhoLikedIt) {
      countLikesInside++
    }

    const updatedCommentWithCounts = await prisma.comment.update({

      where: { id: idParam },

      data: {
        //@ts-ignore
        countLikesInside: countLikesInside
      },

      include: 
        { 

          userWhoCreatedIt: { include: { avatar: true } }, 

          video: { include: { userWhoCreatedIt: true } }, 

          usersWhoLikedIt: { 
            include: { 
            user: {
            include: { 
              videos: true, 
              logins: true, 
              comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
              avatar: { include: { user: true } }, 
              commentsLiked: { include: {comment: true} },
              videosLiked:  { include: { video: true} },
              subscribedBy: { include: { subscribing: true } },
              subscribing:  { include: { subscriber: true } } } } 
            }
          }
      }

    })

    if (comment) {
      res.send(updatedCommentWithCounts)
    } 
    
    else {
      res.status(404).send({ error: 'comment not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/comments', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    content, 
    createdAt, 
    updatedAt, 
    userId, 
    videoId,
    countLikesInside
  } = req.body
  
  const newComment = {
    content: content,
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    videoId: videoId,
    countLikesInside: countLikesInside
  }

  try {

    const user = await getUserFromToken(token)

    //@ts-ignore
    // const commentCheck = await prisma.comment.findFirst({ where: { userId: user.id }} )
    
    if (user) {

      try {

        const createdComment = await prisma.comment.create({data: newComment})
        
        await prisma.comment.findFirst({
          where: { id: createdComment.id },
          include: { 
          video: true, 
          userWhoCreatedIt: true, 
          usersWhoLikedIt: { include: { user:true } } 
          } 
        })

        let getVideo = await prisma.video.findFirst({

          where: { id: videoId },

          include: 
            { 
    
              userWhoCreatedIt: { include: { avatar: true } }, 
    
              comments: { include: { userWhoCreatedIt: true, video: true } }, 
    
              usersWhoLikedIt: { 
                include: { 
                user: {
                include: { 
                  videos: true, 
                  logins: true, 
                  comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
                  avatar: { include: { user: true } }, 
                  commentsLiked: { include: {comment: true} },
                  videosLiked:  { include: { video: true} },
                  subscribedBy: { include: { subscribing: true } },
                  subscribing:  { include: { subscriber: true } } } }, video: true 
                }
              }
          }
    
        })

        res.send(getVideo)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized for this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/comments/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const commentMatch = await prisma.comment.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const commentUserCheck = commentMatch.userId === user.id

    if (user && commentUserCheck) {

      const comment = await prisma.comment.findUnique({where: { id : Number(idParam) }})
      const videoId = comment?.videoId

      await prisma.comment.delete({ 
        where: { id: Number(idParam) }
      })

      let getVideo = await prisma.video.findFirst({

        where: { id: videoId },

        include: 
          { 
  
            userWhoCreatedIt: { include: { avatar: true } }, 
  
            comments: { include: { userWhoCreatedIt: true, video: true } }, 
  
            usersWhoLikedIt: { 
              include: { 
              user: {
              include: { 
                videos: true, 
                logins: true, 
                comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
                avatar: { include: { user: true } }, 
                commentsLiked: { include: {comment: true} },
                videosLiked:  { include: { video: true} },
                subscribedBy: { include: { subscribing: true } },
                subscribing:  { include: { subscriber: true } } } }, video: true 
              }
            }
        }
  
      })

      res.send(getVideo)

    }

    else {
      res.status(404).send({ error: 'comment not found, or the comment doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/comments/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    content, 
    createdAt, 
    updatedAt, 
    userId, 
    videoId,
    countLikesInside
  } = req.body
  
  const updatedComment = {
    content: content,
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    videoId: videoId,
    countLikesInside: countLikesInside
  }

  try {

    const user = await getUserFromToken(token)
    
    const commentMatch = await prisma.comment.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = commentMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        await prisma.comment.update({

          where: {
            id: user.id,
          },

          data: updatedComment

        })

        let getVideo = await prisma.video.findMany({

          where: { id: videoId },

          include: 
            { 
    
              userWhoCreatedIt: { include: { avatar: true } }, 
    
              comments: { include: { userWhoCreatedIt: true, video: true } }, 
    
              usersWhoLikedIt: { 
                include: { 
                user: {
                include: { 
                  videos: true, 
                  logins: true, 
                  comments: { include: { userWhoCreatedIt: true, video: { include: { userWhoCreatedIt: true }}} }, 
                  avatar: { include: { user: true } }, 
                  commentsLiked: { include: {comment: true} },
                  videosLiked:  { include: { video: true} },
                  subscribedBy: { include: { subscribing: true } },
                  subscribing:  { include: { subscriber: true } } } }, video: true 
                }
              }
          }
    
        })

        res.send(getVideo)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "logins endpoints"
app.get('/logins', async (req, res) => {

  try {

    const logins = await prisma.login.findMany({ 
      include: 
        { user: true } 
      })

    res.send(logins)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/logins/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const login = await prisma.login.findFirst({
      where: { id: idParam },
      include: 
        { user: true } 
      })
  
    if (login) {
      res.send(login)
    } 
    
    else {
      res.status(404).send({ error: 'login not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/logins', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    status, 
    createdAt, 
    userId, 
  } = req.body
  
  const newLogin = {
    status: status,
    createdAt: createdAt,
    userId: userId
  }

  try {

    const user = await getUserFromToken(token)

    //@ts-ignore
    // const loginCheck = await prisma.login.findFirst({ where: { userId: user.id }} )
    
    if (user) {

      try {

        const createdLogin = await prisma.login.create({data: newLogin})
        
        const createdLoginFull = await prisma.login.findFirst({
          where: { id: createdLogin.id },
          include: { user: true }
        })

        res.send(createdLoginFull)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized for this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/logins/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const loginMatch = await prisma.login.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const loginUserCheck = loginMatch.userId === user.id

    if (user && loginUserCheck) {

      const loginDeleted = await prisma.login.delete({ 
        where: { id: Number(idParam) }
      })

      const logins = await prisma.login.findMany( { where: { userId: user.id } } )

      // res.send(orderDeleted)
      res.send(logins)

    }

    else {
      res.status(404).send({ error: 'login not found, or the login doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/logins/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    status, 
    createdAt,
    userId
  } = req.body
  
  const updatedLogin = {
    status: status,
    createdAt: createdAt,
    userId: userId  
  }

  try {

    const user = await getUserFromToken(token)
    
    const loginMatch = await prisma.login.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = loginMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        const loginUpdated = await prisma.login.update({

          where: {
            id: user.id,
          },

          data: updatedLogin

        })

        const loginUpdatedFull = await prisma.login.findFirst({
          where: { id: loginUpdated.id },
          include: { user: true }
        })

        res.send(loginUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "avatars endpoints"
app.get('/avatars', async (req, res) => {

  try {

    const avatars = await prisma.avatar.findMany({ 
      include: 
        { user: true } 
      })

    res.send(avatars)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/avatars/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const avatar = await prisma.avatar.findFirst({
      where: { id: idParam },
      include: 
        { user: true } 
      })
  

    if (avatar) {
      res.send(avatar)
    } 
    
    else {
      res.status(404).send({ error: 'avatar not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/avatars', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    height, 
    width, 
    src, 
    createdAt, 
    updatedAt,
    userId
  } = req.body
  
  const newAvatar = {
    height: height,
    width: width,
    src: src,
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId
  }

  try {

    const user = await getUserFromToken(token)

    //@ts-ignore
    // const avatarCheck = await prisma.avatar.findFirst({ where: { userId: user.id }} )
    
    if (user) {

      try {

        const createdAvatar = await prisma.avatar.create({data: newAvatar})
        
        const createdAvatarFull = await prisma.avatar.findFirst({
          where: { id: createdAvatar.id },
          include: { user: true } 
          })

        res.send(createdAvatarFull)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized for this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/avatars/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const commentMatch = await prisma.comment.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const commentUserCheck = commentMatch.userId === user.id

    if (user && commentUserCheck) {

      const commentDeleted = await prisma.comment.delete({ 
        where: { id: Number(idParam) }
      })

      const comments = await prisma.comment.findMany( { where: { userId: user.id }, include: { userWhoCreatedIt: true, usersWhoLikedIt: { include: { user: true} }, video: true } })

      // res.send(orderDeleted)
      res.send(comments)

    }

    else {
      res.status(404).send({ error: 'comment not found, or the comment doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/avatars/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    height, 
    width, 
    src, 
    createdAt, 
    updatedAt,
    userId
  } = req.body
  
  const updatedAvatar = {
    height: height,
    width: width,
    src: src,
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId
  }

  try {

    const user = await getUserFromToken(token)
    
    const avatarMatch = await prisma.avatar.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = avatarMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        const avatarUpdated = await prisma.avatar.update({

          where: {
            id: user.id,
          },

          data: updatedAvatar

        })

        const avatarUpdatedFull = await prisma.avatar.findFirst({
          where: { id: avatarUpdated.id },
          include: { user: true } 
          })

        res.send(avatarUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "commentLikes endpoints"
app.get('/commentLikes', async (req, res) => {

  try {

    const commentLikes = await prisma.commentLike.findMany({ 
      include: 
        { user: true, comment: true } 
      })

    res.send(commentLikes)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/commentLikes/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const commentLike = await prisma.commentLike.findFirst({ 
      where: { id: idParam },
      include: 
        { user: true, comment: true } 
      })
  

    if (commentLike) {
      res.send(commentLike)
    } 
    
    else {
      res.status(404).send({ error: 'commentLike not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/commentLikes', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    commentId  
  } = req.body
  
  const newCommentLike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    commentId: commentId
  }

  try {

    const user = await getUserFromToken(token)
 
    if (user) {

      try {

        const createdCommentLike = await prisma.commentLike.create({data: newCommentLike})
        
        const createdCommentLikeFull = await prisma.commentLike.findFirst({
          where: { id: createdCommentLike.id },
          include: {
            user: true, comment: true
          }
        })

        res.send(createdCommentLikeFull)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized for this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/commentLikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const commentLikeMatch = await prisma.commentLike.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const commentLikeUserCheck = commentLikeMatch.userId === user.id

    if (user && commentLikeUserCheck) {

      await prisma.commentLike.delete({ 
        where: { id: Number(idParam) }
      })

      const commentLikes = await prisma.commentLike.findMany( { where: { userId: user.id } } )

      // res.send(orderDeleted)
      res.send(commentLikes)

    }

    else {
      res.status(404).send({ error: 'commentLike not found, or the commentLike doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/commentLikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    commentId  
  } = req.body
  
  const updatedCommentLike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    commentId: commentId
  }

  try {

    const user = await getUserFromToken(token)
    
    const commentLikeMatch = await prisma.commentLike.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = commentLikeMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        const commentLikeUpdated = await prisma.commentLike.update({

          where: {
            id: user.id,
          },

          data: updatedCommentLike

        })

        const commentLikeUpdatedFull = await prisma.commentLike.findFirst({
          where: { id: commentLikeUpdated.id },
          include: {
            user: true, comment: true
          }
        })

        res.send(commentLikeUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "commentDislikes endpoints"
app.get('/commentDislikes', async (req, res) => {

  try {

    const commentDislikes = await prisma.commentDislike.findMany({ 
      include: 
        { user: true, comment: true } 
      })

    res.send(commentDislikes)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/commentDislikes/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const commentDislike = await prisma.commentDislike.findFirst({ 
      where: { id: idParam },
      include: 
        { user: true, comment: true } 
      })
  

    if (commentDislike) {
      res.send(commentDislike)
    } 
    
    else {
      res.status(404).send({ error: 'commentDislike not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/commentDislikes', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    commentId  
  } = req.body
  
  const newCommentDislike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    commentId: commentId
  }

  try {

    const user = await getUserFromToken(token)
 
    if (user) {

      try {

        const createdCommentDislike = await prisma.commentDislike.create({data: newCommentDislike})
        
        const createdCommentDislikeFull = await prisma.commentDislike.findFirst({
          where: { id: createdCommentDislike.id },
          include: {
            user: true, comment: true
          }
        })

        res.send(createdCommentDislikeFull)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized for this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/commentDislikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const commentDislikeMatch = await prisma.commentDislike.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const commentDislikeUserCheck = commentDislikeMatch.userId === user.id

    if (user && commentDislikeUserCheck) {

      await prisma.commentDislike.delete({ 
        where: { id: Number(idParam) }
      })

      const commentDislikes = await prisma.commentDislike.findMany( { where: { userId: user.id } } )

      // res.send(orderDeleted)
      res.send(commentDislikes)

    }

    else {
      res.status(404).send({ error: 'commentDislike not found, or the commentDislike doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/commentDislikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    commentId  
  } = req.body
  
  const updatedCommentDislike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    commentId: commentId
  }

  try {

    const user = await getUserFromToken(token)
    
    const commentDislikeMatch = await prisma.commentDislike.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = commentDislikeMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        const commentDislikeUpdated = await prisma.commentDislike.update({

          where: {
            id: user.id,
          },

          data: updatedCommentDislike

        })

        const commentDislikeUpdatedFull = await prisma.commentDislike.findFirst({
          where: { id: commentDislikeUpdated.id },
          include: {
            user: true, comment: true
          }
        })

        res.send(commentDislikeUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "videoLikes endpoints"
app.get('/videoLikes', async (req, res) => {

  try {

    const videoLikes = await prisma.videoLike.findMany({ 
      include: 
        { user: true, video: true } 
      })

    res.send(videoLikes)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/videoLikes/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const videoLike = await prisma.videoLike.findFirst({ 
      where: { id: idParam },
      include: 
        { user: true, video: true } 
      })
  

    if (videoLike) {
      res.send(videoLike)
    } 
    
    else {
      res.status(404).send({ error: 'videoLike not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/videoLikes', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    videoId  
  } = req.body
  
  const newVideoLike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    videoId: videoId
  }

  try {

    const user = await getUserFromToken(token)

    //@ts-ignore
    // const videoLikeCheck = await prisma.videoLike.findFirst({ where: { userId: user.id }} )
    
    if (user) {

      try {

        const createdVideoLike = await prisma.videoLike.create({data: newVideoLike})
        
        const createdVideoLikeFull = await prisma.videoLike.findFirst({
          where: { id: createdVideoLike.id },
          include: {
            user: true, video: true
          }
        })

        res.send(createdVideoLikeFull)
        
      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized to do this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/videoLikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const videoLikeMatch = await prisma.videoLike.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const videoLikeUserCheck = videoLikeMatch.userId === user.id

    if (user && videoLikeUserCheck) {

      await prisma.videoLike.delete({ 
        where: { id: Number(idParam) }
      })

      const videoLikes = await prisma.videoLike.findMany( { where: { userId: user.id } } )

      // res.send(orderDeleted)
      res.send(videoLikes)

    }

    else {
      res.status(404).send({ error: 'videoLike not found, or the videoLike doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/videoLikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    videoId  
  } = req.body
  
  const updatedVideoLike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    videoId: videoId
  }

  try {

    const user = await getUserFromToken(token)
    
    const videoLikeMatch = await prisma.videoLike.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = videoLikeMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        const videoLikeUpdated = await prisma.videoLike.update({

          where: {
            id: user.id,
          },

          data: updatedVideoLike

        })

        const videoLikeUpdatedFull = await prisma.videoLike.findFirst({
          where: { id: videoLikeUpdated.id },
          include: {
            user: true, video: true
          }
        })

        res.send(videoLikeUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "videoDislikes endpoints"
app.get('/videoDislikes', async (req, res) => {

  try {

    const videoDislikes = await prisma.videoDislike.findMany({ 
      include: 
        { user: true, video: true } 
      })

    res.send(videoDislikes)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/videoDislikes/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {


    const videoDislike = await prisma.videoDislike.findFirst({ 
      where: { id: idParam },
      include: 
        { user: true, video: true } 
      })
  

    if (videoDislike) {
      res.send(videoDislike)
    } 
    
    else {
      res.status(404).send({ error: 'videoDislike not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/videoLikes', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    videoId  
  } = req.body
  
  const newVideoDislike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    videoId: videoId
  }

  try {

    const user = await getUserFromToken(token)

    //@ts-ignore
    // const videoLikeCheck = await prisma.videoLike.findFirst({ where: { userId: user.id }} )
    
    if (user) {

      try {

        const createdVideoDislike = await prisma.videoLike.create({data: newVideoDislike})
        
        const createdVideoDislikeFull = await prisma.videoDislike.findFirst({
          where: { id: createdVideoDislike.id },
          include: {
            user: true, video: true
          }
        })

        res.send(createdVideoDislikeFull)
        
      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized to do this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/videoDislikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const videoDislikeMatch = await prisma.videoDislike.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const videoDislikeUserCheck = videoDislikeMatch.userId === user.id

    if (user && videoDislikeUserCheck) {

      await prisma.videoDislike.delete({ 
        where: { id: Number(idParam) }
      })

      const videoDislikes = await prisma.videoDislike.findMany( { where: { userId: user.id } } )

      // res.send(orderDeleted)
      res.send(videoDislikes)

    }

    else {
      res.status(404).send({ error: 'videoDislike not found, or the videoDislike doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/videoDislikes/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    createdAt, 
    updatedAt, 
    userId, 
    videoId  
  } = req.body
  
  const updatedVideoDislike = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    userId: userId,
    videoId: videoId
  }

  try {

    const user = await getUserFromToken(token)
    
    const videoDislikeMatch = await prisma.videoDislike.findFirst( { where: {id: idParam} } )
    
    //@ts-ignore
    const belongsToUser = videoDislikeMatch.userId === user.id
    
    if (user && belongsToUser) {

      try {

        const videoDislikeUpdated = await prisma.videoDislike.update({

          where: {
            id: user.id,
          },

          data: updatedVideoDislike

        })

        const videoDislikeUpdatedFull = await prisma.videoDislike.findFirst({
          where: { id: videoDislikeUpdated.id },
          include: {
            user: true, video: true
          }
        })

        res.send(videoDislikeUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "subscribers endpoints"
app.get('/subscribers', async (req, res) => {

  try {

    //@ts-ignore
    const subscribers = await prisma.subscribe.findMany({ 
      include: 
        { subscriber: true, subscribing: true } 
      })

    res.send(subscribers)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/subscribers/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {

    //@ts-ignore
    const subscriber = await prisma.subscribe.findFirst({ 
      where: { id: idParam },
      include: 
        { subscriber: true, subscribing: true } 
      })
  

    if (subscriber) {
      res.send(subscriber)
    } 
    
    else {
      res.status(404).send({ error: 'subscribers not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/subscribers', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    createdAt, 
    updatedAt, 
    subscriberId, 
    subscribingId  
  } = req.body
  
  const newFollower = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    subscriberId: subscriberId,
    subscribingId: subscribingId
  }

  try {

    const user = await getUserFromToken(token)
    
    if (user) {

      try {

        //@ts-ignore
        await prisma.subscribe.create({data: newFollower})
        
        const user = await prisma.user.findFirst({
          where: { id: subscriberId },
          include: { 
            videos: true, logins: true, 
            comments:true, 
            avatar: true, 
            commentsLiked: { include: {comment: true} },
            videosLiked:  { include: { video: true} },
            subscribedBy: { include: { subscribing: {include: { avatar: true } } } },
            subscribing:  { include: { subscriber: {include: {avatar: true} } } }
          }
        })
        
        res.send(user)

      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized to do this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/subscribers/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)
    const subscriberMatch = await prisma.subscribe.findUnique( { where: {id: Number(idParam)} } )
    
    //@ts-ignore
    const subscriberId = subscriberMatch.subscriberId

    //@ts-ignore
    const subscriberUserCheck = subscriberMatch.userId === user.id

    if (user && subscriberUserCheck) {

      await prisma.subscribe.delete({ 
        where: { id: Number(idParam) }
      })

      // const subscribe = await prisma.subscribe.findMany( { where: { userId: user.id } } )

      const user = await prisma.user.findFirst({
        where: { id: subscriberId },
        include: { 
          videos: true, logins: true, 
          comments:true, 
          avatar: true, 
          commentsLiked: { include: {comment: true} },
          videosLiked:  { include: { video: true} },
          subscribedBy: { include: { subscribing: {include: { avatar: true } } } },
          subscribing:  { include: { subscriber: {include: {avatar: true} } } }
        }
      })

      res.send(user)

    }

    else {
      res.status(404).send({ error: 'subscribers not found, or the subscriber doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/subscribers/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    createdAt, 
    updatedAt, 
    subscriberId, 
    subscribingId  
  } = req.body
  
  const updatedFollower = {
    createdAt: createdAt,
    updatedAt: updatedAt,
    subscriberId: subscriberId,
    subscribingId: subscribingId
  }

  try {

    const user = await getUserFromToken(token)

    const subscriberMatch = await prisma.subscribe.findUnique( { where: {id: Number(idParam)} } )

    //@ts-ignore
    const subscriberUserCheck = subscriberMatch.userId === user.id
            
    if (user && subscriberUserCheck) {

      try {

        //@ts-ignore
        const subscriberUpdated = await prisma.subscribe.update({

          where: {
            id: user.id,
          },

          data: updatedFollower

        })

        //@ts-ignore
        const subscriberUpdatedFull = await prisma.subscribe.findFirst({ 
          where: { id: subscriberUpdated.id },
          include: 
            { subscriber: true, subscribing: true } 
          })
          
        res.send(subscriberUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "videoHashtags endpoints"
app.get('/videoHashtags', async (req, res) => {

  try {

    //@ts-ignore
    const videoHashtags = await prisma.videoHashtag.findMany({ 
      include: 
        { video: true, hashtag: true } 
      })

    res.send(videoHashtags)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/videoHashtags/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {

    //@ts-ignore
    const videoHashtag = await prisma.videoHashtag.findFirst({ 
      where: { id: idParam },
      include: 
        { hashtag: true, video: true } 
      })
  

    if (videoHashtag) {
      res.send(videoHashtag)
    } 
    
    else {
      res.status(404).send({ error: 'videoHashtag not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.post('/videoHashtags', async (req, res) => {
    
  const token = req.headers.authorization || ''
  
  const { 
    hashtagId, 
    videoId  
  } = req.body
  
  const newVideoHashtag = { 
    hashtagId: hashtagId,
    videoId: videoId
  }

  try {

    const user = await getUserFromToken(token)
    
    if (user) {

      try {

        //@ts-ignore
        const createdVideoHashtag = await prisma.videoHashtag.create({data: newVideoHashtag})
        
        //@ts-ignore
        const createdVideoHashtagFull = await prisma.videoHashtag.findFirst({
          where: { id: createdVideoHashtag.id },
          include: {
            hashtag: true, video: true
          }
        })

        res.send(createdVideoHashtagFull)
        
      }

      catch(error) {
        //@ts-ignore
        res.status(400).send(`<prev>${error.message}</prev>`)
      }

    }

    else {
      res.status(404).send({ error: 'user is not authorized to do this' })
    }


  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.delete('/videoHashtags/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = req.params.id
  
  try {

    // check that they are signed in
    const user = await getUserFromToken(token)

    //@ts-ignore
    const videoHashtagMatch = await prisma.videoHashtag.findUnique( { where: {id: Number(idParam)} } )

    if (user) {

      //@ts-ignore
      await prisma.videoHashtag.delete({ 
        where: { id: Number(idParam) }
      })

      //@ts-ignore
      const videoHashtags = await prisma.videoHashtag.findMany( { where: { userId: user.id } } )

      // res.send(orderDeleted)
      res.send(videoHashtags)

    }

    else {
      res.status(404).send({ error: 'videoHashtag not found, or the videoHashtag doesnt belong to that user to be deleted.' })
    }

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.patch('/videoHashtags/:id', async (req, res) => {

  const token = req.headers.authorization || ''
  const idParam = Number(req.params.id);
  
  const { 
    hashtagId, 
    videoId  
  } = req.body
  
  const updatedVideoHashtag = { 
    hashtagId: hashtagId,
    videoId: videoId
  }

  try {

    const user = await getUserFromToken(token)
         
    if (user) {

      try {

        //@ts-ignore
        const videoHashtagUpdated = await prisma.videoHashtag.update({

          where: {
            id: user.id,
          },

          data: updatedVideoHashtag

        })

        //@ts-ignore
        const videoHashtagUpdatedFull = await prisma.videoHashtag.findFirst({
          where: { id: videoHashtagUpdated.id },
          include: {
            hashtag: true, video: true
          }
        })

        res.send(videoHashtagUpdatedFull)

      }

      catch(error) {
        res.status(404).send({message: error})
      }

    }

    else {
      throw Error('Error!')
    }

  }  
  
  catch(error) {
    res.status(404).send({message: error})
  }

})
// #endregion

// #region "categories endpoints"
app.get('/categories', async (req, res) => {

  try {

    //@ts-ignore
    const categories = await prisma.category.findMany({ 
      include: 
        //@ts-ignore
        { videos: true }
      })

    res.send(categories)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/categories/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {

    //@ts-ignore
    const category = await prisma.category.findFirst({
      where: { id: idParam },
      include: 
        //@ts-ignore
        { videos: true } 
      })
  

    if (category) {
      res.send(category)
    } 
    
    else {
      res.status(404).send({ error: 'category not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})
// #endregion

// #region "hashtags endpoints"
app.get('/hashtags', async (req, res) => {

  try {

    //@ts-ignore
    const hashtags = await prisma.hashtag.findMany({ 
      include: 
        { videos: { include: { video: true } } } 
      })

    res.send(hashtags)

  }

  catch(error) {
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})

app.get('/hashtags/:id', async (req, res) => {

  const idParam = Number(req.params.id)

  try {

    //@ts-ignore
    const hashtag = await prisma.hashtag.findFirst({
      where: { id: idParam },
      include: 
        { videos: {include: { video: true } } } 
      })
  

    if (hashtag) {
      res.send(hashtag)
    } 
    
    else {
      res.status(404).send({ error: 'hashtag not found.' })
    }

  }

  catch(error){
    //@ts-ignore
    res.status(400).send(`<prev>${error.message}</prev>`)
  }

})
// #endregion

// #endregion


app.get('/', async (req, res) => {
  res.send("Server Up and Running")
})

app.listen(4000, () => {
  console.log(`Server up: http://localhost:4000`)
})