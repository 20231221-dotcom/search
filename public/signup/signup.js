// 認証状態の監視（既にログイン済みの場合はメインページへリダイレクト）
auth.onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
        // 既にログイン済み & メール確認済み
        window.location.href = '../index.html';
    }
});

// Googleで新規登録
document.addEventListener('DOMContentLoaded', () => {
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', async () => {
            try {
                await auth.signInWithPopup(googleProvider);
                // ログイン成功後、メインページへ
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Google登録エラー:', error);
                
                let errorMessage = '登録に失敗しました';
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'ログインがキャンセルされました';
                } else if (error.code === 'auth/unauthorized-domain') {
                    errorMessage = 'このドメインは承認されていません。Firebase Consoleで承認済みドメインを確認してください。';
                }
                
                alert(errorMessage + ': ' + error.message);
            }
        });
    }
});

// メール/パスワードで新規登録
document.addEventListener('DOMContentLoaded', () => {
    const emailSignupForm = document.getElementById('emailSignupForm');
    
    if (emailSignupForm) {
        emailSignupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const displayName = document.getElementById('displayNameInput').value.trim();
            const email = document.getElementById('emailSignupInput').value.trim();
            const password = document.getElementById('passwordSignupInput').value;
            const passwordConfirm = document.getElementById('passwordConfirmInput').value;
            
            // バリデーション
            if (!displayName) {
                alert('ユーザー名を入力してください');
                return;
            }
            
            if (password !== passwordConfirm) {
                alert('パスワードが一致しません');
                return;
            }
            
            if (password.length < 6) {
                alert('パスワードは6文字以上にしてください');
                return;
            }
            
            try {
                // アカウント作成
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // 表示名を設定
                await userCredential.user.updateProfile({
                    displayName: displayName
                });
                
                console.log('アカウント作成成功');
                console.log('ユーザーID:', userCredential.user.uid);
                console.log('メールアドレス:', userCredential.user.email);
                
                // 6桁の認証コードを生成
                const verificationCode = generateVerificationCode();
                
                // 認証コードを保存してメール送信
                const emailSent = await sendVerificationCode(email, verificationCode);
                
                if (emailSent) {
                    console.log('確認メール送信成功:', email);
                    console.log('認証コード:', verificationCode); // 開発中のみログ出力
                    
                    // アラートで認証コードを表示（開発中のみ - 本番環境では削除すること）
                    alert('アカウントが作成されました！\n\n' + 
                          '確認メールを ' + email + ' に送信しました。\n\n' +
                          '【開発用】認証コード: ' + verificationCode + '\n\n' +
                          '※本番環境ではこのコードは表示されず、メールでのみ送信されます。');
                    
                    // 認証コード入力画面へリダイレクト
                    window.location.href = '../verify-code.html?email=' + encodeURIComponent(email);
                } else {
                    throw new Error('確認メールの送信に失敗しました');
                }
                
            } catch (error) {
                console.error('新規登録エラー:', error);
                
                let errorMessage = '登録に失敗しました';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'このメールアドレスは既に使用されています';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'メールアドレスの形式が正しくありません';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'パスワードが弱すぎます。より強力なパスワードを設定してください';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'メール/パスワード認証が有効になっていません。Firebase Consoleで有効にしてください';
                        break;
                }
                
                alert(errorMessage + ': ' + error.message);
                
                // エラーの場合はログアウト
                await auth.signOut();
            }
        });
    }
});