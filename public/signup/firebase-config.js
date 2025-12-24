// Firebase設定
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

// 認証コードの生成と保存（ローカルストレージを使用）
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6桁のコード
}

// 認証コードをメールで送信する関数（カスタム実装）
async function sendVerificationCode(email, code) {
    // 注: 実際の本番環境では、バックエンド（Firebase Cloud Functions等）を使用して
    // SendGrid、AWS SES、または他のメールサービスを使ってコードを送信する必要があります
    
    // ここでは、Firebaseの標準メール確認に6桁コードを含める方法を使います
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        // コードを保存（実際にはFirestore等のデータベースに保存すべき）
        const codeData = {
            code: code,
            email: email,
            timestamp: Date.now(),
            used: false
        };
        localStorage.setItem(`verification_${email}`, JSON.stringify(codeData));
        
        // Firebase標準のメール確認を送信
        const actionCodeSettings = {
            url: window.location.origin + '/verify-code.html?email=' + encodeURIComponent(email),
            handleCodeInApp: false
        };
        
        await user.sendEmailVerification(actionCodeSettings);
        
        console.log('確認メール送信成功:', email);
        console.log('認証コード:', code);
        
        return true;
    } catch (error) {
        console.error('メール送信エラー:', error);
        return false;
    }
}

// 認証コードの検証
function verifyCode(email, inputCode) {
    const savedDataStr = localStorage.getItem(`verification_${email}`);
    if (!savedDataStr) {
        return { valid: false, message: '認証コードが見つかりません' };
    }
    
    const savedData = JSON.parse(savedDataStr);
    
    // 有効期限チェック（10分）
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10分
    if (now - savedData.timestamp > expireTime) {
        return { valid: false, message: '認証コードの有効期限が切れています' };
    }
    
    // 既に使用済みかチェック
    if (savedData.used) {
        return { valid: false, message: 'この認証コードは既に使用されています' };
    }
    
    // コードの検証
    if (savedData.code !== inputCode) {
        return { valid: false, message: '認証コードが正しくありません' };
    }
    
    // 使用済みにマーク
    savedData.used = true;
    localStorage.setItem(`verification_${email}`, JSON.stringify(savedData));
    
    return { valid: true, message: 'メールアドレスが確認されました' };
}

// 認証状態の監視
auth.onAuthStateChanged((user) => {
    const loginContainer = document.getElementById('loginContainer');
    const mainContainer = document.getElementById('mainContainer');
    
    if (user) {
        // メール確認済みかチェック
        if (!user.emailVerified && user.providerData[0].providerId === 'password') {
            // メール確認が未完了の場合 - コード入力画面へリダイレクト
            if (!window.location.pathname.includes('verify-code.html')) {
                window.location.href = './verify-code.html?email=' + encodeURIComponent(user.email);
            }
            return;
        }
        
        // ログイン済み & メール確認済み
        if (loginContainer) loginContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'flex';
        
        // ユーザー情報を表示
        updateUserProfile(user);
    } else {
        // 未ログイン
        if (loginContainer) loginContainer.style.display = 'flex';
        if (mainContainer) mainContainer.style.display = 'none';
    }
});

// ユーザープロフィールの更新
function updateUserProfile(user) {
    const username = document.getElementById('username');
    const userAvatar = document.getElementById('userAvatar');
    
    if (!username || !userAvatar) return;
    
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