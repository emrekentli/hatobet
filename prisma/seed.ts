import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // İlk admin kullanıcısını oluştur
  const adminPassword = 'admin123' // Bu şifreyi değiştirin!
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@hatobet.com' },
    update: {},
    create: {
      email: 'admin@hatobet.com',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN'
    },
  })

  console.log('Admin kullanıcısı oluşturuldu:', admin)
  console.log('Email: admin@hatobet.com')
  console.log('Şifre: admin123')
  console.log('⚠️  Bu şifreyi değiştirmeyi unutmayın!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 