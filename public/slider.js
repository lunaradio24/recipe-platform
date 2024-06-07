const setupSlider = ({ slidesSelector, prevBtnSelector, nextBtnSelector }) => {
  // 슬라이드 요소가 로드될 때까지 대기
  const checkSlidesLoaded = setInterval(() => {
    const slides = document.querySelector(slidesSelector);
    if (slides && slides.children.length > 0) {
      clearInterval(checkSlidesLoaded); // 슬라이드가 로드되면 대기 종료
      initSlider(slides, prevBtnSelector, nextBtnSelector);
    }
  }, 100); // 100ms마다 슬라이드 로드 확인

  const initSlider = (slides, prevBtnSelector, nextBtnSelector) => {
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

      // 이전 버튼 활성화/비활성화 제어
      prevBtn.disabled = currentIdx === 0;
      // 다음 버튼 활성화/비활성화 제어
      nextBtn.disabled = currentIdx === Math.ceil(slides.children.length / numCardsOneSlide) - 1;
    };

    nextBtn.addEventListener('click', () => {
      moveSlides(currentIdx + 1);
    });

    prevBtn.addEventListener('click', () => {
      moveSlides(currentIdx - 1);
    });

    // 초기 화면 설정
    moveSlides(currentIdx);
  };
};

// 각 슬라이드에 대한 정보를 사용하여 슬라이드 네비게이션 설정
const slideData = [
  {
    slidesSelector: '.card-list',
    prevBtnSelector: '.prev',
    nextBtnSelector: '.next',
  },
];
// 슬라이더 세팅 시작
slideData.forEach((data) => {
  setupSlider(data);
});

export { setupSlider };
