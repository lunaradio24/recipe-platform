const postForm = document.getElementById('post-form');
const imageInput = document.getElementById('image');
const imagePreview = document.getElementById('image-preview');

// 이미지 업로드시 미리보기
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    imagePreview.style.display = 'none';
    imagePreview.src = '';
  }
});

// 레시피 작성 버튼
if (postForm) {
  // 로컬 스토리지에서 Access Token을 가져옴
  const accessToken = localStorage.getItem('accessToken');

  //레시피 작성 버튼 클릭 시
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const image = document.getElementById('image').files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (image) formData.append('image', image);

    // 사용자 ID를 이용해 게스글 작성하는 API 요청
    try {
      const response = await fetch('/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      // response를 받아오는 데 성공하면
      if (response.ok) {
        alert('레시피를 등록했습니다.');
        // 0.5초 후 홈화면(index.html)으로 리다이렉트
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 500);
      }
      // response를 받아오는 데 실패하면
      else {
        alert('등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  });
}
