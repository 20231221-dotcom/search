// Firebase設定
// ここにあなたのFirebaseプロジェクトの設定を入力してください
const firebaseConfig = {
  apiKey: "AIzaSyDWpQiTCiwqKatElOUHxjSfbFRA66S1K5M",
  authDomain: "ai-search-eb983.firebaseapp.com",
  projectId: "ai-search-eb983",
  storageBucket: "ai-search-eb983.firebasestorage.app",
  messagingSenderId: "457020714964",
  appId: "1:457020714964:web:294cfb6a9d7bca10133041",
  measurementId: "G-LMCPGGQ5GX"
};

// Firebaseの初期化
try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    console.log('Firebase初期化成功');
} catch (error) {
    console.error('Firebase初期化エラー:', error);
    alert('Firebaseの設定を確認してください。firebase-config.jsファイルに正しい設定情報を入力してください。');
}

const auth = firebase.auth();

// Googleプロバイダーの設定
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 認証状態の監視
auth.onAuthStateChanged((user) => {
    const loginContainer = document.getElementById('loginContainer');
    const mainContainer = document.getElementById('mainContainer');
    
    if (user) {
        // メール確認済みかチェック
        if (!user.emailVerified && user.providerData[0].providerId === 'password') {
            // メール確認が未完了の場合
            alert('メールアドレスの確認が完了していません。\n' + user.email + ' に送信された確認メールをご確認ください。');
            
            // 確認メール再送信のオプションを提供
            if (confirm('確認メールを再送信しますか？')) {
                user.sendEmailVerification()
                    .then(() => {
                        alert('確認メールを再送信しました。');
                    })
                    .catch((error) => {
                        console.error('メール再送信エラー:', error);
                        alert('メールの再送信に失敗しました: ' + error.message);
                    });
            }
            
            // ログアウト
            auth.signOut();
            return;
        }
        
        // ログイン済み & メール確認済み
        loginContainer.style.display = 'none';
        mainContainer.style.display = 'flex';
        
        // ユーザー情報を表示
        updateUserProfile(user);
    } else {
        // 未ログイン
        loginContainer.style.display = 'flex';
        mainContainer.style.display = 'none';
    }
});

// ユーザープロフィールの更新
function updateUserProfile(user) {
    const username = document.getElementById('username');
    const userAvatar = document.getElementById('userAvatar');
    
    // 表示名の設定
    const displayName = user.displayName || user.email.split('@')[0];
    username.textContent = displayName;
    
    // アバターの設定
    if (user.photoURL) {
        userAvatar.style.backgroundImage = `url(${user.photoURL})`;
        userAvatar.style.backgroundSize = 'cover';
        userAvatar.textContent = '';
    } else {
        userAvatar.textContent = displayName.charAt(0).toUpperCase();
    }
}

// Googleログイン
document.addEventListener('DOMContentLoaded', () => {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    console.log("押されてっるぽい");
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                await auth.signInWithPopup(googleProvider);
            } catch (error) {
                console.error('Googleログインエラー:', error);
                alert('ログインに失敗しました: ' + error.message);
            }
        });
    }
});

// メール/パスワードログイン
document.addEventListener('DOMContentLoaded', () => {
    const emailLoginForm = document.getElementById('emailLoginForm');
    
    if (emailLoginForm) {
        emailLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('emailInput').value.trim();
            const password = document.getElementById('passwordInput').value;
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                console.error('ログインエラー:', error);
                
                let errorMessage = 'ログインに失敗しました';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'このメールアドレスは登録されていません。新規登録してください。';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'パスワードが正しくありません';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'メールアドレスの形式が正しくありません';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'このアカウントは無効化されています';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
                        break;
                }
                
                alert(errorMessage);
            }
        });
    }
});

// 新規登録リンク（削除）
// 新規登録は signup.html で行います

// ログアウト
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
            } catch (error) {
                console.error('ログアウトエラー:', error);
                alert('ログアウトに失敗しました: ' + error.message);
            }
        });
    }
});
