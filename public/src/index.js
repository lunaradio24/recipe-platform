let accessToken;
document.addEventListener('DOMContentLoaded', async () => {
  const profileBtn = document.getElementById('profile-btn');
  const postBtn = document.getElementById('post-btn');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplay = document.getElementById('user-display');
  const recipeCardList = document.getElementById('recipe-cards');

  // 로그인 상태에 따라 UI 변경 함수
  function updateUI(accessToken) {
    if (accessToken) {
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
      userDisplay.innerText = '로그인된 사용자입니다.';
    } else {
      userDisplay.innerText = '로그인이 필요합니다.';
    }
  }

  // 게시글 가져오기 함수
  async function fetchPosts() {
    try {
      const response = await fetch('/posts', { method: 'GET' });
      if (!response.ok) throw new Error('게시글을 불러오는 데 실패했습니다.');
      const jsonData = await response.json();
      const posts = jsonData.data;
      if (!Array.isArray(posts)) throw new Error('서버에서 올바른 형식의 데이터를 받지 못했습니다.');
      renderPosts(posts);
    } catch (error) {
      console.error('Error fetching post data:', error);
    }
  }

  // 게시글 렌더링 함수
  function renderPosts(posts) {
    recipeCardList.innerHTML = ''; // 이전 게시글 삭제
    posts.forEach(renderPost);
  }

  // 게시글 하나 렌더링 함수
  function renderPost(post) {
    const recipeCard = document.createElement('li');
    recipeCard.classList.add('recipe-card');

    const authorImage = post.author.profileImage ? post.author.profileImage : '../assets/empty-profile-image.png';

    recipeCard.innerHTML = `
      <div class="image" onclick="window.location.href='/read-recipe.html?postId=${post.postId}'">
        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="recipe image">` : 'No image'}
      </div>
      <div class="info">
        <div class="title">${post.title}</div>
        <div class="footer">
          <div class="author">
            <img src="${authorImage}" class="author-image"/> ${post.author.username}
          </div>
          <div class="likes">
            <span class="likes-btn" data-post-id="${post.postId}">❤️</span>
            <span class="likes-count">${post.likeCount}</span>
          </div>
        </div>
      </div>
    `;

    recipeCardList.appendChild(recipeCard);
  }

  // 이벤트 리스너 등록
  profileBtn?.addEventListener('click', () => {
    if (!accessToken) alert('로그인이 필요합니다');
    else window.location.href = '/profile.html';
  });
  postBtn?.addEventListener('click', () => {
    if (!accessToken) alert('로그인이 필요합니다');
    else window.location.href = '/post-recipe.html';
  });
  loginBtn?.addEventListener('click', () => {
    window.location.href = '/login.html';
  });
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = './login.html';
  });

  // 좋아요 버튼 이벤트 리스너
  recipeCardList?.addEventListener('click', async (event) => {
    if (event.target.classList.contains('likes-btn')) {
      const postId = event.target.getAttribute('data-post-id');
      try {
        const response = await fetch(`/posts/${postId}/likes`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json();
        if (response.ok)
          window.location.reload(); // 좋아요 클릭 성공시 새로고침
        else if (result.status === 403)
          alert('본인 게시글에는 좋아요를 누를 수 없습니다.'); // 본인 게시글일 경우
        else alert(result.message || '좋아요 클릭/취소에 실패했습니다.'); // 실패시 메시지 표시
      } catch (error) {
        alert(error.message);
      }
    }
  });

  /*****     초기화    *****/
  // Access Token 가져오기
  accessToken = localStorage.getItem('accessToken');
  // Access Token 보유 여부(로그인 상태)에 따라 UI 변경
  updateUI(accessToken);
  // 뉴스피드 렌더링
  await fetchPosts();
});
