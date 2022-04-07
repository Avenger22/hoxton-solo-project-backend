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
    description: "I am andrea"
  }
]

const avatars = [
  {
    id: 1,
    src: "/public/uploads/avatars/jurgen-avatar.jpg",
    userId: 1
  },
  {
    id: 2,
    src: "/public/uploads/avatars/egon-avatar.jpg",
    userId: 2
  }
]

const videos = [
  {
    id: 1,
    title: "tikitaka",
    src: "/public/uploads/videos/tikitaka.mp4",
    thumbnail: "/public/uploads/thumbnails/tikitaka.jpg",
    userId: 1,
    categoryId: 2
  },
  {
    id: 2,
    title: "amazing skill look",
    description: "",
    src: "/public/uploads/videos/amazing skill look.mp4",
    thumbnail: "/public/uploads/thumbnails/amazing skill look.jpg",
    userId: 2,
    categoryId: 3
  },
  {
    id: 3,
    title: "skills and goals",
    description: "",
    src: "/public/uploads/videos/skills and goals.mp4",
    thumbnail: "/public/uploads/thumbnails/skills and goals.jpg",
    userId: 1,
    categoryId: 3
  },
  {
    id: 4,
    title: "iniesta skill",
    description: "",
    src: "/public/uploads/videos/iniesta skill.mp4",
    thumbnail: "/public/uploads/thumbnails/iniesta skill.jpg",
    userId: 2,
    categoryId: 4
  }
]

const categories = [
  {
    id: 1,
    name: "All"
  },
  {
    id: 2,
    name: "Music"
  },
  {
    id: 3,
    name: "Movies"
  },
  {
    id: 4,
    name: "Anime"
  },
  {
    id: 5,
    name: "Basketball"
  },
  {
    id: 6,
    name: "Fighting"
  }, 
  {
    id: 7,
    name: "Trailers"
  }, 
]

const videoHashtags = [
  {
    id: 1,
    videoId: 1,
    hashtagId: 1
  },
  {
    id: 2,
    videoId: 2,
    hashtagId: 2
  },
  {
    id: 3,
    videoId: 3,
    hashtagId: 2
  },
  {
    id: 4,
    videoId: 3,
    hashtagId: 3
  },
  {
    id: 5,
    videoId: 3,
    hashtagId: 4
  },
  {
    id: 6,
    videoId: 2,
    hashtagId: 4
  }
]

const hashtags = [
  {
    id: 1,
    name: "soccer"
  },
  {
    id: 2,
    name: "funny"
  },
  {
    id: 3,
    name: "general"
  },
  {
    id: 4,
    name: "breathtaking"
  }
]

async function createStuff () {

  // @ts-ignore
  await prisma.category.deleteMany()

  // @ts-ignore
  await prisma.videoHashtag.deleteMany()

  // @ts-ignore
  await prisma.hashtag.deleteMany()

  //@ts-ignore
  await prisma.login.deleteMany()

  //@ts-ignore
  await prisma.avatar.deleteMany()

  //@ts-ignore
  await prisma.video.deleteMany()

  //@ts-ignore
  await prisma.user.deleteMany()

  for (const user of users) {
    await prisma.user.create({ data: user })
  }

  for (const category of categories) {
    //@ts-ignore
    await prisma.category.create({ data: category })
  }
  
  for (const video of videos) {
    await prisma.video.create({ data: video })
  }

  for (const avatar of avatars) {
    await prisma.avatar.create({ data: avatar })
  }

  for (const hashtag of hashtags) {
    //@ts-ignore
    await prisma.hashtag.create({ data: hashtag })
  }

  for (const videoHashtag of videoHashtags) {
    //@ts-ignore
    await prisma.videoHashtag.create({ data: videoHashtag })
  }

}

createStuff()