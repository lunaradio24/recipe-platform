document.addEventListener('DOMContentLoaded', () => {
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = '/login.html';
            });
        }
    
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
    
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
    
                try {
                    const response = await fetch('/auth/sign-in', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, password }),
                    });
    
                    const result = await response.json();
    
                    if (response.ok) {
                        document.getElementById('message').innerText = '로그인에 성공했습니다.';
                    
    
                        // 로그인 성공 메시지를 2초 동안 표시한 후 메인 페이지로 리디렉션
                        setTimeout(() => {
                            window.location.href = '/index.html';
                        }, 2000);
                    } else {
                        document.getElementById('message').innerText = result.message || '로그인에 실패했습니다.';
                    }
                } catch (error) {
                    document.getElementById('message').innerText = '서버 오류가 발생했습니다.';
                }
            });
        }

    });
    