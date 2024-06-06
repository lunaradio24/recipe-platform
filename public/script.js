document.addEventListener('DOMContentLoaded', async () => {
  const profileBtn = document.getElementById('profile-btn');
  const postBtn = document.getElementById('post-btn');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplay = document.getElementById('user-display');
  const recipeCardList = document.getElementById('recipe-cards');
  // 로컬스토리지에서 엑세스토큰 가져오기
  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    // 로그인된 상태면 로그인 버튼 숨기고 로그아웃 버튼 보이기
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    userDisplay.innerText = '로그인된 사용자입니다.';
  } else {
    userDisplay.innerText = '로그인이 필요합니다.';
  }

  // 게시글 가져와서 보여주기
  try {
    const response = await fetch('/posts', { method: 'GET' });

    if (!response.ok) throw new Error('게시글을 불러오는 데 실패했습니다.');

    const jsonData = await response.json();
    const posts = jsonData.data;

    // 데이터 형식이 배열인지 확인
    if (!Array.isArray(posts)) throw new Error('서버에서 올바른 형식의 데이터를 받지 못했습니다.');

    recipeCardList.innerHTML = ''; // 기존 내용을 지우고 새로운 게시글을 추가

    posts.forEach((post) => {
      const recipeCard = document.createElement('li');
      recipeCard.classList.add('recipe-card');

      const imageDiv = document.createElement('div');
      imageDiv.classList.add('image');
      imageDiv.innerHTML = post.imageUrl ? `<img src="${post.imageUrl}" alt="recipe image">` : 'No image';

      // 레시피 이미지에 클릭 이벤트 핸들러를 부여
      imageDiv.addEventListener('click', async (event) => {
        event.preventDefault();
        // 상세 페이지로 이동
        window.location.href = `read-recipe.html?postId=${post.postId}`;
      });

      const infoDiv = document.createElement('div');
      infoDiv.classList.add('info');

      const titleDiv = document.createElement('div');
      titleDiv.classList.add('title');
      titleDiv.textContent = post.title;

      const footerDiv = document.createElement('div');
      footerDiv.classList.add('footer');

      const authorDiv = document.createElement('div');
      authorDiv.classList.add('author');
      if (post.authorProfileImage) {
        authorDiv.innerHTML = `<img src=${post.authorProfileImage} class="author-image"/> ${post.authorName}`;
      } else {
        authorDiv.innerHTML = `<img src="assets/empty-profile-image.png" class="author-image"/> ${post.authorName}`;
      }

      const likesDiv = document.createElement('div');
      likesDiv.classList.add('likes');
      likesDiv.innerHTML = `<span class="likes-btn" id="likes-btn-${post.postId}">❤️</span><span class="likes-count">${post.likeCount}</span>`;

      //좋아요 하트 버튼에 클릭 이벤트 핸들러를 부여
      const likesBtn = document.getElementById(`likes-btn-${post.postId}`);
      likesBtn?.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          const response = await fetch(`/posts/${post.postId}/likes`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          const result = await response.json();

          // response를 받아오는 데 성공하면 새로고침
          if (response.ok) {
            window.location.reload();
          }
          // 본인 게시글일 경우
          else if (result.status === 403) {
            alert('본인 게시글에는 좋아요를 누를 수 없습니다.');
          }
          // response를 받아오는 데 실패하면
          else {
            document.getElementById('message').innerText = result.message || '좋아요 클릭/취소에 실패했습니다.';
          }
          // 에러 처리
        } catch (error) {
          document.getElementById('message').innerText = '서버 오류가 발생했습니다.';
        }
      });

      footerDiv.appendChild(authorDiv);
      footerDiv.appendChild(likesDiv);

      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(footerDiv);

      recipeCard.appendChild(imageDiv);
      recipeCard.appendChild(infoDiv);

      recipeCardList.appendChild(recipeCard);
    });

    // 에러 처리
  } catch (error) {
    console.error('Error fetching post data:', error);
  }

  profileBtn?.addEventListener('click', () => {
    if (!accessToken) alert('로그인이 필요합니다');
    else window.location.href = 'profile.html';
  });

  postBtn?.addEventListener('click', () => {
    if (!accessToken) alert('로그인이 필요합니다');
    else window.location.href = 'post-recipe.html';
  });

  loginBtn?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = 'login.html';
  });
});
