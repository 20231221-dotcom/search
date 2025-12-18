const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const API_KEY = 'AIzaSyDRmVolprxMovXyFwuI5g_l4AgXgBqUK_8';
const TEST_MODE = true;

// ===== モックデータ =====
const mockResponses = {
    'こんにちは': {
        description: '「こんにちは」とは、日中に人と会ったときに使う挨拶の言葉である。相手への敬意や親しみを表現する日本語の基本的な挨拶表現。',
        keywords: ['挨拶', '日本語', 'null', '日本語', '表現']
    },
    '人工知能': {
        description: '人工知能とは、人間の知的な振る舞いをコンピュータで模倣する技術である。学習、推論、問題解決などの能力を持つシステムを指す。',
        keywords: ['学習', '推論', 'null', '日本語', '表現']
    },
    'プログラミング': {
        description: 'プログラミングとは、コンピュータに実行させたい処理を、プログラミング言語を用いて記述する作業である。',
        keywords: ['コード', '言語', 'null', '日本語', '表現']
    },
    '挨拶': {
        description: '挨拶とは、人と会ったり別れたりする際に交わす言葉や動作である。コミュニケーションの基本となる社会的な習慣。',
        keywords: ['言葉', '社会', 'null', '日本語', '表現']
    },
    '学習': {
        description: '学習とは、経験や訓練を通じて知識や技能を習得する過程である。反復や練習により能力を向上させること。',
        keywords: ['知識', '訓練', 'null', '日本語', '表現']
    },
    '推論': {
        description: '推論とは、既知の情報から新しい結論を導き出す思考過程である。論理的な思考に基づいて判断を行うこと。',
        keywords: ['論理', '判断', 'null', '日本語', '表現']
    },
    'システム': {
        description: 'システムとは、複数の要素が組み合わさって特定の目的を達成する仕組みである。全体として機能する構造的な組織。',
        keywords: ['構造', '組織', 'null', '日本語', '表現']
    },
    'コード': {
        description: 'コードとは、プログラミング言語で記述された命令の集まりである。コンピュータが実行可能な形式で書かれた指示。',
        keywords: ['命令', 'プログラム', 'null', '日本語', '表現']
    },
    '言語': {
        description: '言語とは、人間がコミュニケーションを行うために使用する記号体系である。音声や文字で意思を伝達する手段。',
        keywords: ['記号', '伝達', 'null', '日本語', '表現']
    },
    '開発': {
        description: '開発とは、新しいソフトウェアやシステムを設計し構築する活動である。計画から実装、テストまでの一連の過程。',
        keywords: ['設計', '実装', 'null', '日本語', '表現']
    }
};

// デフォルトのモックレスポンス
function getDefaultMockResponse(message) {
    return {
        description: `「${message}」とは、様々な意味を持つ重要な概念である。文脈によって異なる解釈が可能で、多くの分野で使用される用語。`,
        keywords: ['概念', '意味', 'null', '日本語', '表現']
    };
}

// モックレスポンスを取得
function getMockResponse(message) {
    // 完全一致を探す
    if (mockResponses[message]) {
        return mockResponses[message];
    }
    
    // 部分一致を探す
    for (const key in mockResponses) {
        if (message.includes(key) || key.includes(message)) {
            return mockResponses[key];
        }
    }
    
    // デフォルトを返す
    return getDefaultMockResponse(message);
}

// ===== 優先度付きキューシステム =====
class PriorityRequestQueue {
    constructor(maxConcurrent = 3) {
        this.queue = [];
        this.activeRequests = new Map();
        this.maxConcurrent = maxConcurrent;
        this.requestCounter = 0;
    }

    // リクエストを追加
    addRequest(message, priority = false, res) {
        const requestId = ++this.requestCounter;
        
        const request = {
            id: requestId,
            message,
            priority: priority ? 1 : 0,
            timestamp: Date.now(),
            res
        };

        // 優先リクエストはキューの先頭に追加
        if (priority) {
            console.log(`[優先] Request #${requestId}: "${message}"`);
            this.queue.unshift(request);
        } else {
            console.log(`[通常] Request #${requestId}: "${message}"`);
            this.queue.push(request);
        }

        this.processNext();
        return requestId;
    }

    // 次のリクエストを処理
    async processNext() {
        // 同時実行数が上限に達している場合は待機
        if (this.activeRequests.size >= this.maxConcurrent) {
            console.log(`[Queue] 同時実行上限 (${this.maxConcurrent}) に達しています`);
            return;
        }

        // キューが空の場合
        if (this.queue.length === 0) {
            console.log('[Queue] キューが空です');
            return;
        }

        // 優先度でソート（優先度が高い→タイムスタンプが古い順）
        this.queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // 優先度が高い方を先に
            }
            return a.timestamp - b.timestamp; // 同じ優先度なら古い方を先に
        });

        const request = this.queue.shift();
        console.log(`[Processing] Request #${request.id}: "${request.message}" (優先度: ${request.priority ? '高' : '通常'})`);
        
        this.activeRequests.set(request.id, request);

        try {
            const result = await this.executeRequest(request.message);
            
            // レスポンスを返す
            request.res.json(result);
            console.log(`[Complete] Request #${request.id} 完了`);
        } catch (error) {
            console.error(`[Error] Request #${request.id} エラー:`, error);
            request.res.status(500).json({ error: error.message });
        } finally {
            this.activeRequests.delete(request.id);
            
            // キューに残りがあれば次を処理
            if (this.queue.length > 0) {
                this.processNext();
            }
        }
    }

    // 実際のAPI呼び出し
    async executeRequest(message) {
        // テストモードの場合
        if (TEST_MODE) {
            console.log('[TEST MODE] モックデータを返します');
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const mockData = getMockResponse(message);
            
            return {
                candidates: [{
                    content: {
                        parts: [{
                            text: mockData.description
                        }]
                    }
                }],
                keywords: mockData.keywords
            };
        }

        // 実際のGemini API呼び出し
        const systemPrompt = `あなたは簡潔な辞書のような役割です。以下のルールに従って回答してください：

【必須ルール】
1. 回答は100文字程度にすること
2. 2-3文で簡潔にまとめること
3. ユーザーが入力した言葉や概念の「定義」「意味」「説明」のみを答えること
4. 挨拶には挨拶で返さず、その言葉の意味を説明すること
5. 例文、具体例、補足情報は一切含めないこと
6. 基本的な定義だけを述べること

【回答形式】
「○○とは、△△である。」のような簡潔な説明文のみ。`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: systemPrompt + "\n\n入力された言葉: " + message
                }]
            }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024
            }
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        const aiResponse = data.candidates[0].content.parts[0].text;

        // キーワード抽出
        const keywordRequestBody = {
            contents: [{
                parts: [{
                    text: `この文章から重要な名詞を4つ選んで、カンマ区切りで出力してください。

文章: ${aiResponse}

出力形式: 単語1, 単語2, null, 単語4, 単語5`
                }]
            }],
            generationConfig: {
                temperature: 0.2,
                topK: 20,
                topP: 0.9,
                maxOutputTokens: 500
            }
        };

        const keywordResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(keywordRequestBody)
            }
        );

        const keywordData = await keywordResponse.json();
        
        let keywords = [];
        
        if (keywordData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const keywordText = keywordData.candidates[0].content.parts[0].text;
            
            keywords = keywordText
                .trim()
                .replace(/^(出力|回答|答え|結果)[:：\s]*/gi, '')
                .replace(/[「」『』【】\[\]()（）<>《》]/g, '')
                .replace(/、/g, ',')
                .split(',')
                .map(k => k.trim())
                .filter(k => k.length > 0 && k.length < 20)
                .slice(0, 5);
        }

        // キーワードが不足している場合の補完
        if (keywords.length < 5) {
            const matches = aiResponse.match(/[ぁ-んァ-ヶー一-龠々]+/g) || [];
            const candidates = matches
                .filter(w => w.length >= 2 && w.length <= 10)
                .filter(w => !w.match(/^(は|が|を|に|へ|と|から|より|で|や|の|という|である|とは)$/));
            
            for (const candidate of candidates) {
                if (keywords.length >= 5) break;
                if (!keywords.includes(candidate)) {
                    keywords.push(candidate);
                }
            }
        }

        const fallbacks = ['詳細', '説明', 'null', '情報', '項目'];
        while (keywords.length < 5) {
            keywords.push(fallbacks[keywords.length] || '項目');
        }

        keywords = keywords.slice(0, 5);

        return {
            ...data,
            keywords: keywords
        };
    }

    // キューの状態を取得
    getStatus() {
        return {
            queueLength: this.queue.length,
            activeRequests: this.activeRequests.size,
            maxConcurrent: this.maxConcurrent
        };
    }
}

// グローバルキューインスタンス
const requestQueue = new PriorityRequestQueue(3);

// ===== APIエンドポイント =====

// 通常リクエスト
app.post('/api/gemini', (req, res) => {
    const { message, priority = false } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`\n[API] 新規リクエスト: "${message}" (優先: ${priority})`);
    requestQueue.addRequest(message, priority, res);
});

// キューの状態を確認するエンドポイント（デバッグ用）
app.get('/api/queue-status', (req, res) => {
    res.json(requestQueue.getStatus());
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
    console.log(`TEST MODE: ${TEST_MODE ? 'ON' : 'OFF'}`);
    console.log(`Max concurrent requests: ${requestQueue.maxConcurrent}`);
});