document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profile = document.getElementById('profile');
    const userDisplay = document.getElementById('user-display');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
    
    if (profile) {
        profile.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }

    // 로컬스토리지에서 엑세스토큰 읽기
    const accessToken = localStorage.getItem('accessToken');

    if (accessToken) {
        // 로그인된 상태면 로그인 버튼 숨기고 로그아웃 버튼 보이기
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        userDisplay.innerText = '로그인된 사용자입니다.';
    } else {
        userDisplay.innerText = '로그인이 필요합니다.';
        // 로그인 페이지로 리디렉션
    }
});
