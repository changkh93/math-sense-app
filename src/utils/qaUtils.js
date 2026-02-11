export const getRandomNickname = (seed) => {
  const adjs = ['호기심 많은', '용감한', '꿈꾸는', '지혜로운', '날쌘', '끈기 있는', '행복한', '기발한', '차분한', '열정적인'];
  const animals = ['라쿤', '거북이', '돌고래', '올빼미', '사자', '펭귄', '다람쥐', '여우', '코알라', '판다'];
  
  // Use user.uid as seed if possible to keep it consistent for the same user
  let index = 0;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
        index += seed.charCodeAt(i);
    }
  } else {
    index = Math.floor(Math.random() * 1000);
  }

  const adj = adjs[index % adjs.length];
  const animal = animals[Math.floor(index / adjs.length) % animals.length];
  
  return `${adj} ${animal}`;
};
