document.addEventListener('DOMContentLoaded', async () => {
  // query parameter에서 postId 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('postId');

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
    if (!response.ok) throw new Error(result.message || '게시글을 불러오는 데 실패했습니다.');

    const post = result.data;
    if (!post) throw new Error('게시글 데이터가 없습니다.');

    const authorId = post.authorId;

    document.getElementById('recipe-title').textContent = post.title;
    document.getElementById('recipe-image').src = post.imageUrl || 'default-image.png';
    document.getElementById('recipe-content').textContent = post.content;
    document.getElementById('author-name').textContent = post.authorName;

    // 댓글 가져오기
    const comments = post.comment;

    if (comments) {
      const commentList = document.getElementById('comment-list');
      commentList.innerHTML = ''; // 이전 댓글을 모두 지우기

      comments.forEach((comment) => {
        const commentLi = document.createElement('li');
        commentLi.classList.add('comment-item');

        // 날짜 포맷 함수
        const formatDate = (dateString) => {
          const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          };
          return new Date(dateString)
            .toLocaleString('ko-KR', options)
            .replace(/(\.\s*)/g, '-')
            .replace(/\s/g, ' ')
            .replace(/(\s시|\s분|\s초)/g, '')
            .replace(/-/g, '-')
            .replace('오후', '')
            .trim();
        };

        commentLi.innerHTML = `
          <div class="commenter">
            <img src="${comment.commenter.profileImage}" class="commenter-image"/> 
            <span class="commenter-username">${comment.commenter.username}</span>
          </div>
          <div class="comment-text">${comment.content}</div>
          <div class="comment-time">${formatDate(comment.createdAt)}</div>
          <div class="comment-likes">
            <span class="comment-likes-btn" data-comment-id="${comment.commentId}">❤️</span>
            <span class="comment-likes-count">${comment.likeCount}</span>
          </div>
          <div class="comment-button-group">
            <button class="comment-edit-button">수정</button> 
            <button class="comment-delete-button">삭제</button>
          </div>
        `;
        commentList.appendChild(commentLi);

        // 댓글 수정하기 버튼 클릭이벤트 생성
        const commentEditBtn = commentLi.querySelector('.comment-edit-button');
        commentEditBtn?.addEventListener('click', async () => {
          const commentId = comment.commentId;

          const confirmEdit = window.confirm('댓글을 수정하시겠습니까?');
          if (confirmEdit) {
            // 수정 동작 구현
          }
        });

        // 댓글 삭제하기 버튼 클릭이벤트 생성
        const commentDeleteBtn = commentLi.querySelector('.comment-delete-button');
        commentDeleteBtn?.addEventListener('click', async () => {
          const commentId = commentDeleteBtn.dataset.commentId;
          const confirmDelete = window.confirm('댓글을 삭제하시겠습니까?');
          if (confirmDelete) {
            // 삭제 동작 구현
          }
        });

        // 댓글 좋아요 버튼 클릭이벤트 생성
        const likeButton = commentLi.querySelector('.comment-likes-btn');
        likeButton.addEventListener('click', async () => {
          const commentId = likeButton.dataset.commentId;
          // 좋아요 동작 구현
        });
      });
    } else {
      console.log('댓글이 없습니다.');
    }

    // 수정하기 버튼 클릭
    const editButton = document.getElementById('edit-button');
    editButton?.addEventListener('click', async () => {
      const confirmEdit = window.confirm('게시글을 수정하시겠습니까?');
      if (confirmEdit) {
        // Access Token 에서 userId 가져오기
        const accessToken = getAccessToken();

        const response = await fetch('/auth/get-userId', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json();

        // response를 받아오는 데 실패하면
        if (!response.ok) throw new Error('사용자 정보를 불러오는 데 실패했습니다.');

        const user = result.data;
        const userId = user.userId;

        if (userId !== authorId) alert('게시글은 작성자 본인만 수정할 수 있습니다.');
        else window.location.href = `edit-recipe.html?postId=${postId}`;
      }
    });

    // 삭제하기 버튼 클릭
    const deleteButton = document.getElementById('delete-button');
    deleteButton?.addEventListener('click', async () => {
      const confirmDelete = window.confirm('게시글을 삭제하시겠습니까?');
      if (confirmDelete) {
        // Access Token 에서 userId 가져오기
        const accessToken = getAccessToken();

        const response = await fetch('/auth/get-userId', {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json();

        // response를 받아오는 데 실패하면
        if (!response.ok) throw new Error('사용자 정보를 불러오는 데 실패했습니다.');

        const user = result.data;
        const userId = user.userId;

        if (userId !== authorId) alert('게시글은 작성자 본인만 삭제할 수 있습니다.');
        else {
          try {
            const response = await fetch(`/posts/${postId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.ok) {
              // 성공적으로 삭제되면 홈 페이지로 이동
              alert('게시글을 삭제했습니다.');
              window.location.href = 'index.html';
            } else {
              // 삭제에 실패한 경우에 대한 처리
              const result = await response.json();
              alert(result.message || '게시글 삭제에 실패했습니다.');
            }
          } catch (error) {
            // 네트워크 오류 등으로 인한 삭제 실패에 대한 처리
            console.error('Error deleting post:', error);
            alert('게시글 삭제에 실패했습니다.');
          }
        }
      }
    });

    // 댓글 폼
    const commentInputForm = document.getElementById('comment-input-form');

    // 댓글 작성 이벤트 리스너
    commentInputForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const commentInput = document.getElementById('comment-input');
      const comment = commentInput.value.trim(); // 댓글 내용 양 옆의 공백 제거

      // 댓글 내용이 비어 있는지 확인
      if (comment === '') {
        alert('댓글을 입력하세요.');
        return;
      }

      try {
        // 댓글 서버에 제출
        await submitComment(postId, comment);
      } catch (error) {
        console.error('Error submitting comment:', error);
        alert('댓글을 제출하는 도중 오류가 발생했습니다.');
      }
    });

    // 에러 처리
  } catch (error) {
    alert('게시글을 불러오는 데 실패했습니다.');
    console.error('Error fetching post data:', error);
  }
});

// 댓글 작성 함수
async function submitComment(postId, comment) {
  // 서버로 댓글을 제출하는 코드
  try {
    const response = await fetch(`/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAccessToken()}`,
      },
      body: JSON.stringify({ content: comment }),
    });

    if (response.ok) {
      alert('댓글을 작성했습니다.');
      window.location.reload();
    } else {
      alert('댓글 작성에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
  }
}

// 로컬 스토리지에서 Access Token 가져오기
function getAccessToken() {
  return localStorage.getItem('accessToken');
}
