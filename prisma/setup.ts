import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

const users = [
  {
    id: 1,
    firstName: 'Jurgen',
    lastName:  'Hasmeta',
    userName:  'avenger22',
    gender:     'M',
    birthday:  '22/12/1997',
    phoneNumber: '06933344123',
    email: 'jurgenhasmeta@email.com',
    password: bcrypt.hashSync("jurgen123", 8),
    createdAt: "2020-03-18T14:21:00+02:00",
    updatedAt: "2021-03-18T14:21:00+02:00",
    description: "I am jurgen hasmeta"
  },
  {
    id: 2,
    firstName: 'Andrea',
    lastName:  'Buonanotte',
    userName:  'andrea12',
    gender:     'M',
    birthday:  '20/11/1996',
    phoneNumber: '06723344123',
    email: 'andrea@email.com',
    password: bcrypt.hashSync("egon123", 8),
    createdAt: "2018-01-18T14:21:00+02:00",
    updatedAt: "2022-03-18T14:21:00+02:00",
    description: "I am andrea"
  }
]

const logins = [
  {
    id: 1,
    status: "succes",
    createdAt: "2021-03-18T14:21:00+02:00",
    userId: 1
  },
  {
    id: 2,
    status: "success",
    createdAt: "2020-02-18T14:21:00+02:00",
    userId: 1
  },
  {
    id: 3,
    status: "success",
    createdAt: "2018-01-18T14:21:00+02:00",
    userId: 2
  }
]

const avatars = [
  {
    id: 1,
    src: "/assets/avatars/jurgen-avatar.jpg",
    createdAt: "2020-05-18T14:21:00+02:00",
    updatedAt: "2020-07-18T14:21:00+02:00",
    userId: 1
  },
  {
    id: 2,
    src: "/assets/avatars/egon-avatar.jpg",
    createdAt: "2010-05-18T14:21:00+02:00",
    updatedAt: "2020-07-18T14:21:00+02:00",
    userId: 2
  }
]

const videos = [
  {
    id: 1,
    title: "inter 3-1 liverpool highlits",
    createdAt: "2020-05-18T14:21:00+02:00",
    updatedAt: "2020-07-18T14:21:00+02:00",
    countCommentsInside: 0,
    countLikesInside: 0,
    src: "",
    userId: 1
  },
  {
    id: 2,
    title: "watch this getting punched",
    description: "",
    createdAt: "2020-08-18T14:21:00+02:00",
    updatedAt: "2020-07-18T14:21:00+02:00",
    countCommentsInside: 0,
    countLikesInside: 0,
    src: "",
    userId: 2
  },
  {
    id: 3,
    title: "watch this getting punched again this time by tyson",
    description: "",
    createdAt: "2020-02-18T14:21:00+02:00",
    updatedAt: "2020-08-18T14:21:00+02:00",
    countCommentsInside: 0,
    countLikesInside: 0,
    src: "",
    userId: 1
  }
]

const comments = [
  {
    id: 1,
    content: "hi i am jurgen",
    createdAt: "2020-01-18T14:21:00+02:00",
    updatedAt: "2020-02-18T14:21:00+02:00",
    userId: 1,
    videoId: 2,
    countLikesInside: 0
  },
  {
    id: 2,
    content: "hi i am egon",
    createdAt: "2020-08-18T14:21:00+02:00",
    updatedAt: "2020-09-18T14:21:00+02:00",
    userId: 2,
    videoId: 1,
    countLikesInside: 0
  }
]

const commentLikes = [
  {
    id: 1,
    createdAt: "2020-05-18T14:21:00+02:00",
    updatedAt: "2020-06-18T14:21:00+02:00",
    userId: 1,
    commentId: 2
  },
  {
    id: 2,
    createdAt: "2020-09-18T14:21:00+02:00",
    updatedAt: "2020-10-18T14:21:00+02:00",
    userId: 2,
    commentId: 1
  }
]

const commentDislikes = [
  {
    id: 1,
    createdAt: "2020-05-18T14:21:00+02:00",
    updatedAt: "2020-06-18T14:21:00+02:00",
    userId: 1,
    commentId: 1
  },
  {
    id: 2,
    createdAt: "2020-09-18T14:21:00+02:00",
    updatedAt: "2020-10-18T14:21:00+02:00",
    userId: 2,
    commentId: 2
  }
]

const videoLikes = [
  {
    id: 1,
    createdAt: "2020-02-18T14:21:00+02:00",
    updatedAt: "2020-08-18T14:21:00+02:00",
    userId: 1,
    videoId: 2
  },
  {
    id: 2,
    createdAt: "2020-09-18T14:21:00+02:00",
    updatedAt: "2020-11-18T14:21:00+02:00",
    userId: 2,
    videoId: 1
  }
]

const videoDislikes = [
  {
    id: 1,
    createdAt: "2020-02-18T14:21:00+02:00",
    updatedAt: "2020-08-18T14:21:00+02:00",
    userId: 1,
    videoId: 1
  },
  {
    id: 2,
    createdAt: "2020-09-18T14:21:00+02:00",
    updatedAt: "2020-11-18T14:21:00+02:00",
    userId: 2,
    videoId: 2
  }
]

const subscribers = [
  {
    id: 1,
    createdAt: "2020-02-18T14:21:00+02:00",
    updatedAt: "2020-08-18T14:21:00+02:00",
    subscriberId: 1,
    subscribingId: 2
  },
  {
    id: 2,
    createdAt: "2020-02-18T14:21:00+02:00",
    updatedAt: "2020-08-18T14:21:00+02:00",
    subscriberId: 2,
    subscribingId: 1
  }
]

async function createStuff () {

  await prisma.commentLike.deleteMany()
  await prisma.commentDislike.deleteMany()

  await prisma.videoLike.deleteMany()
  await prisma.videoDislike.deleteMany()

  await prisma.login.deleteMany()

  //@ts-ignore
  await prisma.subscribe.deleteMany()
  await prisma.avatar.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.video.deleteMany()
  await prisma.user.deleteMany()

  for (const user of users) {
    await prisma.user.create({ data: user })
  }

  for (const video of videos) {
    await prisma.video.create({ data: video })
  }

  for (const comment of comments) {
    await prisma.comment.create({ data: comment })
  }

  for (const avatar of avatars) {
    await prisma.avatar.create({ data: avatar })
  }

  for (const login of logins) {
    await prisma.login.create({ data: login })
  }

  for (const videoLike of videoLikes) {
    await prisma.videoLike.create({ data: videoLike })
  }

  for (const videoDislike of videoDislikes) {
    await prisma.videoDislike.create({ data: videoDislike })
  }

  for (const commentLike of commentLikes) {
    await prisma.commentLike.create({ data: commentLike })
  }

  for (const commentDislike of commentDislikes) {
    await prisma.commentDislike.create({ data: commentDislike })
  }

  for (const subscribe of subscribers) {
    //@ts-ignore
    await prisma.subscribe.create({ data: subscribe })
  }

}

createStuff()