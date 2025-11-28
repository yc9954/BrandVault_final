import { prisma } from '../db.js';

async function createTestCreator() {
  try {
    // 기존에 같은 이메일이 있는지 확인
    const existing = await prisma.creator.findUnique({
      where: { email: 'tester@gmail.com' },
    });

    if (existing) {
      console.log('이미 존재하는 Creator입니다.');
      console.log('Creator ID:', existing.creator_id);
      console.log('이메일:', existing.email);
      console.log('비밀번호:', existing.password);
      return;
    }

    // 테스트용 Creator 생성
    const creator = await prisma.creator.create({
      data: {
        email: 'tester@gmail.com',
        password: 'password123', // 평문 비밀번호
        user_name: 'Test Creator',
        subscription_type: 'free',
      },
    });

    console.log('✅ 테스트 Creator 생성 성공!');
    console.log('Creator ID:', creator.creator_id);
    console.log('이메일:', creator.email);
    console.log('비밀번호: password123');
    console.log('사용자명:', creator.user_name);
    console.log('\n로그인 정보:');
    console.log('이메일: tester@gmail.com');
    console.log('비밀번호: password123');
  } catch (error) {
    console.error('❌ Creator 생성 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCreator();

