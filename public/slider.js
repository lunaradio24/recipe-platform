const setupSlider = ({ slidesSelector, prevBtnSelector, nextBtnSelector }) => {
  const slides = document.querySelector(slidesSelector);
  const prevBtn = document.querySelector(prevBtnSelector);
  const nextBtn = document.querySelector(nextBtnSelector);
  const numCardsOneSlide = 4;
  const cardAndGapWidth = 20;
  // 슬라이드 인덱스 초기화
  let currentIdx = 0;

  const moveSlides = (indexSlides) => {
    // 슬라이드 이동 거리
    slides.style.left = -indexSlides * numCardsOneSlide * cardAndGapWidth + 'vw';
    // 슬라이드 속도 설정
    slides.style.transitionDuration = '0.6s';
    // 슬라이드 애니메이션 타이밍 함수 설정
    slides.style.transitionTimingFunction = 'ease-in-out';
    currentIdx = indexSlides;
    prevBtn.disabled = indexSlides === 0;
    // 슬라이드 화면 갯수에 맞춰 제거
    nextBtn.disabled = indexSlides === Math.ceil(slides.children.length / numCardsOneSlide) - 1;
  };

  nextBtn.addEventListener('click', () => {
    moveSlides(currentIdx + 1);
  });

  prevBtn.addEventListener('click', () => {
    moveSlides(currentIdx - 1);
  });
};

// 각 슬라이드에 대한 정보를 사용하여 슬라이드 네비게이션 설정
const slideData = [
  {
    slidesSelector: '.cards-container .card-list',
    prevBtnSelector: '.prev',
    nextBtnSelector: '.next',
  },
];
// 슬라이더 세팅 시작
slideData.forEach((data) => {
  setupSlider(data);
});

export { setupSlider };
