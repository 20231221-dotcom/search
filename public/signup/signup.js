// 認証状態の監視（既にログイン済みの場合はメインページへリダイレクト）
auth.onAuthStateChanged((user) => {
    if (user) {
        // 既にログイン済み
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
                
                // メール確認を送信
                try {
                    const actionCodeSettings = {
                        url: window.location.origin + '/index.html',
                        handleCodeInApp: false
                    };
                    
                    await userCredential.user.sendEmailVerification(actionCodeSettings);
                    
                    console.log('確認メール送信成功:', email);
                    
                    alert('アカウントが作成されました！\n\n' + 
                          '確認メールを ' + email + ' に送信しました。\n\n' +
                          '【重要】\n' +
                          '1. メールボックスを確認してください\n' +
                          '2. 迷惑メールフォルダも確認してください\n' +
                          '3. noreply@[your-project].firebaseapp.com からのメールを探してください\n' +
                          '4. メール内のリンクをクリックしてアカウントを有効化してください\n\n' +
                          'メールが届かない場合は、ログイン画面から再送信できます。');
                    
                } catch (emailError) {
                    console.error('メール送信エラー:', emailError);
                    alert('アカウントは作成されましたが、確認メールの送信に失敗しました。\n\n' +
                          'エラー: ' + emailError.message + '\n\n' +
                          'ログイン画面から再送信してください。');
                }
                
                // ログアウトして、メール確認を促す
                await auth.signOut();
                
                // ログインページへリダイレクト
                window.location.href = '../index.html';
                
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
            }
        });
    }
});

// 手動でメール確認を送信するテスト関数
async function manualSendVerificationEmail() {
    const user = auth.currentUser;
    
    if (!user) {
        alert('ログインしていません');
        return;
    }
    
    if (user.emailVerified) {
        alert('このアカウントは既に確認済みです');
        return;
    }
    
    console.log('=== メール確認送信テスト ===');
    console.log('ユーザーID:', user.uid);
    console.log('メールアドレス:', user.email);
    console.log('確認状態:', user.emailVerified);
    
    const success = await sendVerificationEmailWithLogging(user);
    
    if (success) {
        alert('確認メールを送信しました。\n\n送信先: ' + user.email + '\n\nメールが届かない場合は、以下を確認してください：\n1. 迷惑メールフォルダ\n2. メールアドレスのスペルミス\n3. Firebase Consoleの設定');
    }
}

// ブラウザのコンソールから手動でテストできるようにグローバルに公開
window.testEmailVerification = manualSendVerificationEmail;