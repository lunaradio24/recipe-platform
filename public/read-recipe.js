let authorId;
let postId;
document.addEventListener('DOMContentLoaded', async () => {
  // query parameter에서 postId 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  postId = urlParams.get('postId');

  if (!postId) {
    alert('게시글 ID가 제공되지 않았습니다.');
    window.location.href = 'index.html';
    return;
  }

  // postId를 이용해 레시피 상세 페이지 불러오는 API 요청
  try {
    const response = await fetch(`/posts/${postId}`, { method: 'GET' });
    const result = await response.json();

    // response를 받아오는 데 실패하면
    if (!response.ok) throw new Error('게시글을 불러오는 데 실패했습니다.');

    const post = result.data;
    authorId = post.authorId;

    // 데이터 형식이 배열인지 확인
    document.getElementById('recipe-title').textContent = post.title;
    document.getElementById('recipe-image').src = post.imageUrl || 'default-image.png';
    document.getElementById('recipe-content').textContent = post.content;
    document.getElementById('author-name').textContent = post.authorName;

    // 에러 처리
  } catch (error) {
    alert('서버 오류가 발생했습니다.');
  }
});

// 수정하기 버튼 클릭
document.getElementById('edit-button').addEventListener('click', async () => {
  // Access Token 에서 userId 가져오기
  const accessToken = localStorage.getItem('accessToken');
  let userId;
  try {
    const response = await fetch('/auth/get-userId', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json();

    // response를 받아오는 데 실패하면
    if (!response.ok) throw new Error('게시글을 불러오는 데 실패했습니다.');

    const user = result.data;
    userId = user.userId;

    // 에러 처리
  } catch (error) {
    alert('서버 오류가 발생했습니다.');
  }

  if (userId !== authorId) alert('게시글은 작성자 본인만 수정할 수 있습니다.');
  else window.location.href = `edit-recipe.html?postId=${postId}`;
});
