document.addEventListener('DOMContentLoaded', async () => {
  const profileBtn = document.getElementById('profile-btn');
  const postBtn = document.getElementById('post-btn');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplay = document.getElementById('user-display');
  const recipesContainer = document.querySelector('.recipes');
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
    console.log(posts);
    // 데이터 형식이 배열인지 확인
    if (!Array.isArray(posts)) throw new Error('서버에서 올바른 형식의 데이터를 받지 못했습니다.');

    recipesContainer.innerHTML = ''; // 기존 내용을 지우고 새로운 게시글을 추가

    posts.forEach((post) => {
      const recipeCard = document.createElement('div');
      recipeCard.classList.add('recipe-card');

      const imageDiv = document.createElement('div');
      imageDiv.classList.add('image');
      imageDiv.innerHTML = post.imageUrl ? `<img src="${post.imageUrl}" alt="recipe image">` : 'No image';

      const infoDiv = document.createElement('div');
      infoDiv.classList.add('info');

      const titleDiv = document.createElement('div');
      titleDiv.classList.add('title');
      titleDiv.textContent = post.title;

      const authorDiv = document.createElement('div');
      authorDiv.classList.add('author');
      authorDiv.innerHTML = `${post.authorName}`;

      const likesDiv = document.createElement('div');
      likesDiv.classList.add('likes');
      likesDiv.innerHTML = `<span class="likes">❤️ ${post.likeCount}</span>`;

      infoDiv.appendChild(titleDiv);
      infoDiv.appendChild(authorDiv);
      infoDiv.appendChild(likesDiv);

      recipeCard.appendChild(imageDiv);
      recipeCard.appendChild(infoDiv);

      recipesContainer.appendChild(recipeCard);
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
    else window.location.href = 'post.html';
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
